# X (Twitter) OAuth Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add X (Twitter) as a second OAuth login provider with linked accounts support.

**Architecture:** New `oauth_accounts` table stores provider credentials, replacing the `github_id` column on users. Both GitHub and X OAuth use the same pattern: redirect → callback → upsert → JWT. Settings page allows linking/unlinking providers.

**Tech Stack:** Fastify (backend), Next.js (frontend), PostgreSQL, X OAuth 2.0 with PKCE

---

## Task 1: Database Migration - Create oauth_accounts Table

**Files:**
- Create: `apps/api/src/db/migrations/010_oauth_accounts.sql`

**Step 1: Write the migration file**

```sql
-- Create oauth_accounts table for multi-provider auth
CREATE TABLE oauth_accounts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    provider VARCHAR(20) NOT NULL,
    provider_id TEXT NOT NULL,
    provider_username TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(provider, provider_id)
);

CREATE INDEX idx_oauth_accounts_user_id ON oauth_accounts(user_id);

-- Migrate existing GitHub users to oauth_accounts
INSERT INTO oauth_accounts (user_id, provider, provider_id, provider_username)
SELECT id, 'github', github_id::text, username
FROM users
WHERE github_id IS NOT NULL;

-- Drop github_id column and its index
DROP INDEX IF EXISTS idx_users_github_id;
ALTER TABLE users DROP COLUMN github_id;
```

**Step 2: Run migration locally**

Run: `cd apps/api && npm run db:migrate`
Expected: Migration 010 applies successfully

**Step 3: Verify migration**

Run: `psql $DATABASE_URL -c "\d oauth_accounts"`
Expected: Table exists with correct columns

**Step 4: Commit**

```bash
git add apps/api/src/db/migrations/010_oauth_accounts.sql
git commit -m "feat: add oauth_accounts table for multi-provider auth"
```

---

## Task 2: Update Auth Service - Add OAuth Account Methods

**Files:**
- Modify: `apps/api/src/services/auth.service.ts`

**Step 1: Add OAuthAccount interface**

Add at top of file after existing interfaces:

```typescript
interface OAuthAccount {
  id: string;
  userId: string;
  provider: string;
  providerId: string;
  providerUsername: string | null;
  createdAt: string;
}

type OAuthProvider = 'github' | 'twitter';
```

**Step 2: Add findUserByOAuthProvider method**

Add to AuthService class:

```typescript
/**
 * Find user by OAuth provider credentials
 */
async findUserByOAuthProvider(provider: OAuthProvider, providerId: string): Promise<User | null> {
  const result = await this.fastify.db.query(
    `SELECT u.id, u.username, u.display_name, u.avatar_url, u.email
     FROM users u
     JOIN oauth_accounts oa ON u.id = oa.user_id
     WHERE oa.provider = $1 AND oa.provider_id = $2`,
    [provider, providerId]
  );

  if (result.rows.length === 0) return null;

  const user = result.rows[0];
  return {
    id: user.id,
    githubId: '', // deprecated, kept for interface compat
    username: user.username,
    displayName: user.display_name,
    avatarUrl: user.avatar_url,
    email: user.email,
  };
}
```

**Step 3: Add createUserFromOAuth method**

Add to AuthService class:

```typescript
/**
 * Create a new user from OAuth data (used when no existing account found)
 */
async createUserFromOAuth(
  provider: OAuthProvider,
  providerId: string,
  username: string,
  displayName: string,
  avatarUrl?: string,
  email?: string
): Promise<User> {
  const client = await this.fastify.db.connect();

  try {
    await client.query('BEGIN');

    // Create user
    const userResult = await client.query(
      `INSERT INTO users (username, display_name, avatar_url, email)
       VALUES ($1, $2, $3, $4)
       RETURNING id, username, display_name, avatar_url, email`,
      [username, displayName, avatarUrl, email]
    );

    const user = userResult.rows[0];

    // Create oauth account link
    await client.query(
      `INSERT INTO oauth_accounts (user_id, provider, provider_id, provider_username)
       VALUES ($1, $2, $3, $4)`,
      [user.id, provider, providerId, username]
    );

    await client.query('COMMIT');

    return {
      id: user.id,
      githubId: '',
      username: user.username,
      displayName: user.display_name,
      avatarUrl: user.avatar_url,
      email: user.email,
    };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}
```

**Step 4: Add upsertOAuthAccount method**

Add to AuthService class:

```typescript
/**
 * Link an OAuth account to an existing user
 */
async upsertOAuthAccount(
  userId: string,
  provider: OAuthProvider,
  providerId: string,
  providerUsername: string
): Promise<void> {
  await this.fastify.db.query(
    `INSERT INTO oauth_accounts (user_id, provider, provider_id, provider_username)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (provider, provider_id) DO UPDATE SET
       provider_username = EXCLUDED.provider_username`,
    [userId, provider, providerId, providerUsername]
  );
}
```

**Step 5: Add getUserOAuthAccounts method**

Add to AuthService class:

```typescript
/**
 * Get all OAuth accounts linked to a user
 */
async getUserOAuthAccounts(userId: string): Promise<OAuthAccount[]> {
  const result = await this.fastify.db.query(
    `SELECT id, user_id, provider, provider_id, provider_username, created_at
     FROM oauth_accounts
     WHERE user_id = $1
     ORDER BY created_at ASC`,
    [userId]
  );

  return result.rows.map(row => ({
    id: row.id,
    userId: row.user_id,
    provider: row.provider,
    providerId: row.provider_id,
    providerUsername: row.provider_username,
    createdAt: row.created_at,
  }));
}
```

**Step 6: Add unlinkOAuthAccount method**

Add to AuthService class:

```typescript
/**
 * Unlink an OAuth account from a user (fails if it's the last one)
 */
async unlinkOAuthAccount(userId: string, provider: OAuthProvider): Promise<boolean> {
  // Check how many accounts are linked
  const countResult = await this.fastify.db.query(
    `SELECT COUNT(*) as count FROM oauth_accounts WHERE user_id = $1`,
    [userId]
  );

  if (parseInt(countResult.rows[0].count) <= 1) {
    return false; // Can't unlink last provider
  }

  await this.fastify.db.query(
    `DELETE FROM oauth_accounts WHERE user_id = $1 AND provider = $2`,
    [userId, provider]
  );

  return true;
}
```

**Step 7: Update upsertGitHubUser to use new pattern**

Replace existing `upsertGitHubUser` method:

```typescript
/**
 * Upsert a user from GitHub OAuth data
 */
async upsertGitHubUser(userData: GitHubUserData): Promise<User> {
  const { githubId, username, displayName, avatarUrl, email } = userData;

  // Check if OAuth account exists
  const existingUser = await this.findUserByOAuthProvider('github', githubId);

  if (existingUser) {
    // Update user profile
    const result = await this.fastify.db.query(
      `UPDATE users SET
         username = $1,
         display_name = COALESCE(display_name, $2),
         avatar_url = $3,
         email = COALESCE($4, email),
         updated_at = NOW()
       WHERE id = $5
       RETURNING id, username, display_name, avatar_url, email`,
      [username, displayName, avatarUrl, email, existingUser.id]
    );

    // Update provider username
    await this.upsertOAuthAccount(existingUser.id, 'github', githubId, username);

    const user = result.rows[0];
    return {
      id: user.id,
      githubId: '',
      username: user.username,
      displayName: user.display_name,
      avatarUrl: user.avatar_url,
      email: user.email,
    };
  }

  // Create new user with OAuth account
  return this.createUserFromOAuth('github', githubId, username, displayName, avatarUrl, email);
}
```

**Step 8: Commit**

```bash
git add apps/api/src/services/auth.service.ts
git commit -m "feat: add OAuth account methods to auth service"
```

---

## Task 3: Add X OAuth Routes

**Files:**
- Create: `apps/api/src/routes/auth/twitter.ts`
- Modify: `apps/api/src/routes/auth/index.ts`

**Step 1: Create twitter.ts route file**

```typescript
import type { FastifyPluginAsync } from 'fastify';
import crypto from 'crypto';
import { AuthService } from '../../services/auth.service.js';

interface TwitterCallbackQuery {
  code: string;
  state?: string;
}

// PKCE helper - generate code verifier
function generateCodeVerifier(): string {
  return crypto.randomBytes(32).toString('base64url');
}

// PKCE helper - generate code challenge from verifier
function generateCodeChallenge(verifier: string): string {
  return crypto.createHash('sha256').update(verifier).digest('base64url');
}

export const twitterRoutes: FastifyPluginAsync = async (fastify) => {
  const authService = new AuthService(fastify);

  // GET /auth/twitter - Redirect to Twitter OAuth
  fastify.get<{ Querystring: { link?: string } }>('/twitter', {
    config: { rateLimit: { max: 10, timeWindow: '1 minute' } },
  }, async (request, reply) => {
    const clientId = process.env.TWITTER_CLIENT_ID;
    const callbackUrl = process.env.TWITTER_CALLBACK_URL;

    if (!clientId || !callbackUrl) {
      return reply.status(500).send({ error: 'Twitter OAuth not configured' });
    }

    const state = crypto.randomUUID();
    const codeVerifier = generateCodeVerifier();
    const codeChallenge = generateCodeChallenge(codeVerifier);

    // Check if this is a link request (user is already authenticated)
    const isLinkRequest = request.query.link === 'true';
    let userId: string | undefined;

    if (isLinkRequest) {
      // Verify user is authenticated
      try {
        await fastify.authenticate(request, reply);
        userId = request.user?.userId;
      } catch {
        return reply.status(401).send({ error: 'Authentication required to link accounts' });
      }
    }

    // Store state, code verifier, and link info in cookie
    const oauthData = JSON.stringify({
      state,
      codeVerifier,
      isLink: isLinkRequest,
      userId,
    });

    reply.setCookie('twitter_oauth', oauthData, {
      path: '/',
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 600, // 10 minutes
    });

    const authUrl = new URL('https://twitter.com/i/oauth2/authorize');
    authUrl.searchParams.set('response_type', 'code');
    authUrl.searchParams.set('client_id', clientId);
    authUrl.searchParams.set('redirect_uri', callbackUrl);
    authUrl.searchParams.set('scope', 'tweet.read users.read');
    authUrl.searchParams.set('state', state);
    authUrl.searchParams.set('code_challenge', codeChallenge);
    authUrl.searchParams.set('code_challenge_method', 'S256');

    return reply.redirect(authUrl.toString());
  });

  // GET /auth/twitter/callback - Handle Twitter OAuth callback
  fastify.get<{ Querystring: TwitterCallbackQuery }>('/twitter/callback', {
    schema: {
      querystring: {
        type: 'object',
        required: ['code'],
        properties: {
          code: { type: 'string' },
          state: { type: 'string' },
        },
      },
    },
  }, async (request, reply) => {
    const { code, state } = request.query;
    const oauthCookie = request.cookies.twitter_oauth;

    // Clear the oauth cookie
    reply.clearCookie('twitter_oauth', { path: '/' });

    if (!oauthCookie) {
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
      return reply.redirect(`${frontendUrl}/auth/callback?error=missing_oauth_data`);
    }

    let oauthData: { state: string; codeVerifier: string; isLink: boolean; userId?: string };
    try {
      oauthData = JSON.parse(oauthCookie);
    } catch {
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
      return reply.redirect(`${frontendUrl}/auth/callback?error=invalid_oauth_data`);
    }

    // Verify state for CSRF protection
    if (!state || state !== oauthData.state) {
      fastify.log.warn({ hasState: !!state, match: state === oauthData.state }, 'Twitter OAuth state validation failed');
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
      return reply.redirect(`${frontendUrl}/auth/callback?error=csrf_validation_failed`);
    }

    try {
      const clientId = process.env.TWITTER_CLIENT_ID!;
      const clientSecret = process.env.TWITTER_CLIENT_SECRET!;
      const callbackUrl = process.env.TWITTER_CALLBACK_URL!;

      // Exchange code for access token
      const tokenResponse = await fetch('https://api.twitter.com/2/oauth2/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Authorization': `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`,
        },
        body: new URLSearchParams({
          code,
          grant_type: 'authorization_code',
          redirect_uri: callbackUrl,
          code_verifier: oauthData.codeVerifier,
        }),
      });

      const tokenData = await tokenResponse.json() as {
        access_token?: string;
        error?: string;
        error_description?: string;
      };

      if (tokenData.error || !tokenData.access_token) {
        fastify.log.error({ tokenData }, 'Twitter token exchange failed');
        const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
        return reply.redirect(`${frontendUrl}/auth/callback?error=token_exchange_failed`);
      }

      // Get user info from Twitter
      const userResponse = await fetch('https://api.twitter.com/2/users/me?user.fields=profile_image_url,name', {
        headers: {
          'Authorization': `Bearer ${tokenData.access_token}`,
        },
      });

      if (!userResponse.ok) {
        const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
        return reply.redirect(`${frontendUrl}/auth/callback?error=user_fetch_failed`);
      }

      const userData = await userResponse.json() as {
        data: {
          id: string;
          username: string;
          name: string;
          profile_image_url?: string;
        };
      };

      const twitterUser = userData.data;
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';

      // Handle link flow
      if (oauthData.isLink && oauthData.userId) {
        // Check if this Twitter account is already linked to another user
        const existingUser = await authService.findUserByOAuthProvider('twitter', twitterUser.id);
        if (existingUser && existingUser.id !== oauthData.userId) {
          return reply.redirect(`${frontendUrl}/settings?error=account_already_linked`);
        }

        // Link the account
        await authService.upsertOAuthAccount(
          oauthData.userId,
          'twitter',
          twitterUser.id,
          twitterUser.username
        );

        return reply.redirect(`${frontendUrl}/settings?linked=twitter`);
      }

      // Handle login flow
      let user = await authService.findUserByOAuthProvider('twitter', twitterUser.id);

      if (!user) {
        // Create new user
        user = await authService.createUserFromOAuth(
          'twitter',
          twitterUser.id,
          twitterUser.username,
          twitterUser.name || twitterUser.username,
          twitterUser.profile_image_url
        );
      }

      // Generate JWT tokens
      const { accessToken, refreshToken } = authService.generateTokens({
        userId: user.id,
        username: user.username,
      });

      // Store refresh token
      await authService.storeRefreshToken(user.id, refreshToken);

      // Redirect to frontend with tokens
      return reply.redirect(`${frontendUrl}/auth/callback?success=true&accessToken=${accessToken}&refreshToken=${refreshToken}`);
    } catch (err) {
      fastify.log.error({ err }, 'Twitter OAuth error');
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
      return reply.redirect(`${frontendUrl}/auth/callback?error=oauth_failed`);
    }
  });
};
```

**Step 2: Register twitter routes in auth index**

Modify `apps/api/src/routes/auth/index.ts` to add:

```typescript
import { twitterRoutes } from './twitter.js';

// Inside the authRoutes function, add:
fastify.register(twitterRoutes);
```

**Step 3: Commit**

```bash
git add apps/api/src/routes/auth/twitter.ts apps/api/src/routes/auth/index.ts
git commit -m "feat: add Twitter OAuth routes with PKCE"
```

---

## Task 4: Add OAuth Accounts Management Routes

**Files:**
- Create: `apps/api/src/routes/auth/accounts.ts`
- Modify: `apps/api/src/routes/auth/index.ts`

**Step 1: Create accounts.ts route file**

```typescript
import type { FastifyPluginAsync } from 'fastify';
import { AuthService } from '../../services/auth.service.js';

export const accountsRoutes: FastifyPluginAsync = async (fastify) => {
  const authService = new AuthService(fastify);

  // GET /auth/accounts - List linked OAuth accounts
  fastify.get('/accounts', {
    preHandler: [fastify.authenticate],
  }, async (request) => {
    const accounts = await authService.getUserOAuthAccounts(request.user.userId);
    return { accounts };
  });

  // DELETE /auth/accounts/:provider - Unlink an OAuth account
  fastify.delete<{ Params: { provider: string } }>('/accounts/:provider', {
    preHandler: [fastify.authenticate],
    schema: {
      params: {
        type: 'object',
        required: ['provider'],
        properties: {
          provider: { type: 'string', enum: ['github', 'twitter'] },
        },
      },
    },
  }, async (request, reply) => {
    const { provider } = request.params;

    const success = await authService.unlinkOAuthAccount(
      request.user.userId,
      provider as 'github' | 'twitter'
    );

    if (!success) {
      return reply.status(400).send({
        error: 'Cannot unlink your only authentication method',
      });
    }

    return { success: true };
  });
};
```

**Step 2: Register accounts routes in auth index**

Add to `apps/api/src/routes/auth/index.ts`:

```typescript
import { accountsRoutes } from './accounts.js';

// Inside the authRoutes function, add:
fastify.register(accountsRoutes);
```

**Step 3: Commit**

```bash
git add apps/api/src/routes/auth/accounts.ts apps/api/src/routes/auth/index.ts
git commit -m "feat: add OAuth accounts management endpoints"
```

---

## Task 5: Frontend - Add X Login Button

**Files:**
- Create: `apps/web/src/components/auth/XLoginButton.tsx`
- Modify: `apps/web/src/lib/auth.ts`

**Step 1: Add getTwitterOAuthUrl to lib/auth.ts**

Add after `getGitHubOAuthUrl`:

```typescript
/**
 * Get the Twitter OAuth URL
 */
export function getTwitterOAuthUrl(link?: boolean): string {
  const apiUrl = process.env.NEXT_PUBLIC_AUTH_URL ||
    (typeof window !== 'undefined' && window.location.hostname !== 'localhost'
      ? 'https://oneshotcoding-production.up.railway.app'
      : 'http://localhost:4000');
  return `${apiUrl}/auth/twitter${link ? '?link=true' : ''}`;
}
```

**Step 2: Create XLoginButton component**

```typescript
'use client';

import { getTwitterOAuthUrl } from '@/lib/auth';
import { motion } from 'framer-motion';

export interface XLoginButtonProps {
  className?: string;
  link?: boolean;
}

export function XLoginButton({ className, link }: XLoginButtonProps) {
  const handleLogin = () => {
    window.location.href = getTwitterOAuthUrl(link);
  };

  return (
    <motion.button
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3 }}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={handleLogin}
      className={`
        w-full flex items-center justify-center gap-3
        bg-black text-white font-bold
        py-4 px-6 rounded-full
        border border-gray-700
        transition-colors duration-200
        hover:bg-gray-900
        ${className}
      `}
    >
      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
      </svg>
      Continue with X
    </motion.button>
  );
}
```

**Step 3: Commit**

```bash
git add apps/web/src/lib/auth.ts apps/web/src/components/auth/XLoginButton.tsx
git commit -m "feat: add X login button component"
```

---

## Task 6: Frontend - Update Login Page

**Files:**
- Modify: `apps/web/src/app/login/page.tsx` (find and update login page)

**Step 1: Find the login page**

Run: `find apps/web/src -name "*.tsx" -exec grep -l "GitHubLoginButton" {} \;`

**Step 2: Import and add XLoginButton**

Add import:
```typescript
import { XLoginButton } from '@/components/auth/XLoginButton';
```

Add after GitHubLoginButton:
```typescript
<div className="text-center text-terminal-text-dim text-sm my-3">or</div>
<XLoginButton />
```

**Step 3: Commit**

```bash
git add apps/web/src/app/login/page.tsx
git commit -m "feat: add X login option to login page"
```

---

## Task 7: Frontend - Add Connected Accounts to Settings

**Files:**
- Modify: `apps/web/src/app/(main)/settings/page.tsx`
- Modify: `apps/web/src/lib/api.ts`

**Step 1: Add API methods for OAuth accounts**

Add to api object in `apps/web/src/lib/api.ts`:

```typescript
// OAuth Accounts
getOAuthAccounts: () => get<{ accounts: Array<{
  id: string;
  provider: string;
  providerUsername: string | null;
  createdAt: string;
}> }>('/auth/accounts'),

unlinkOAuthAccount: (provider: string) =>
  del<{ success: boolean }>(`/auth/accounts/${provider}`),
```

**Step 2: Add OAuthAccount type**

Add near other types in api.ts:

```typescript
export interface OAuthAccount {
  id: string;
  provider: string;
  providerUsername: string | null;
  createdAt: string;
}
```

**Step 3: Update Settings page**

Add imports:
```typescript
import { api, OAuthAccount } from '@/lib/api';
import { getGitHubOAuthUrl, getTwitterOAuthUrl } from '@/lib/auth';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
```

Add inside SettingsPage component:
```typescript
const queryClient = useQueryClient();

const { data: accountsData } = useQuery({
  queryKey: ['oauth-accounts'],
  queryFn: async () => {
    const result = await api.getOAuthAccounts();
    return result.data?.accounts || [];
  },
});

const unlinkMutation = useMutation({
  mutationFn: (provider: string) => api.unlinkOAuthAccount(provider),
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['oauth-accounts'] });
  },
});

const accounts = accountsData || [];
const hasGithub = accounts.some(a => a.provider === 'github');
const hasTwitter = accounts.some(a => a.provider === 'twitter');
const canUnlink = accounts.length > 1;
```

Add Connected Accounts section after the Account section:
```tsx
{/* Connected Accounts Section */}
<motion.div
  initial={{ opacity: 0, y: 10 }}
  animate={{ opacity: 1, y: 0 }}
  transition={{ delay: 0.15 }}
>
  <GlassPanel className="mb-4">
    <h2 className={cn(
      'text-lg font-semibold mb-4 font-mono',
      isNeumorphic ? 'text-neumorphic-text' : 'text-terminal-text'
    )}>
      Connected Accounts
    </h2>

    <div className="space-y-3">
      {/* GitHub */}
      <div className={cn(
        'flex items-center justify-between py-3 border-b',
        isNeumorphic ? 'border-neumorphic-dark/20' : 'border-terminal-border'
      )}>
        <div className="flex items-center gap-3">
          <svg className="w-5 h-5 text-terminal-text" fill="currentColor" viewBox="0 0 24 24">
            <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.477 2 12c0 4.42 2.87 8.17 6.84 9.5.5.08.66-.23.66-.5v-1.69c-2.77.6-3.36-1.34-3.36-1.34-.46-1.16-1.11-1.47-1.11-1.47-.91-.62.07-.6.07-.6 1 .07 1.53 1.03 1.53 1.03.87 1.52 2.34 1.07 2.91.83.09-.65.35-1.09.63-1.34-2.22-.25-4.55-1.11-4.55-4.92 0-1.11.38-2 1.03-2.71-.1-.25-.45-1.29.1-2.64 0 0 .84-.27 2.75 1.02.79-.22 1.65-.33 2.5-.33.85 0 1.71.11 2.5.33 1.91-1.29 2.75-1.02 2.75-1.02.55 1.35.2 2.39.1 2.64.65.71 1.03 1.6 1.03 2.71 0 3.82-2.34 4.66-4.57 4.91.36.31.69.92.69 1.85V21c0 .27.16.59.67.5C19.14 20.16 22 16.42 22 12A10 10 0 0012 2z" />
          </svg>
          <div>
            <p className={cn(
              'text-sm font-medium',
              isNeumorphic ? 'text-neumorphic-text' : 'text-terminal-text'
            )}>
              GitHub
            </p>
            {hasGithub && (
              <p className={cn(
                'text-xs',
                isNeumorphic ? 'text-neumorphic-muted' : 'text-terminal-text-dim'
              )}>
                @{accounts.find(a => a.provider === 'github')?.providerUsername}
              </p>
            )}
          </div>
        </div>
        {hasGithub ? (
          <button
            onClick={() => unlinkMutation.mutate('github')}
            disabled={!canUnlink || unlinkMutation.isPending}
            className={cn(
              'text-xs px-3 py-1 rounded-lg transition-colors',
              canUnlink
                ? 'text-red-400 hover:bg-red-500/10'
                : 'text-terminal-text-dim cursor-not-allowed'
            )}
          >
            {unlinkMutation.isPending ? 'Unlinking...' : 'Disconnect'}
          </button>
        ) : (
          <button
            onClick={() => window.location.href = getGitHubOAuthUrl() + '?link=true'}
            className="text-xs px-3 py-1 rounded-lg text-terminal-accent hover:bg-terminal-accent/10 transition-colors"
          >
            Connect
          </button>
        )}
      </div>

      {/* X (Twitter) */}
      <div className={cn(
        'flex items-center justify-between py-3',
        isNeumorphic ? '' : ''
      )}>
        <div className="flex items-center gap-3">
          <svg className="w-5 h-5 text-terminal-text" fill="currentColor" viewBox="0 0 24 24">
            <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
          </svg>
          <div>
            <p className={cn(
              'text-sm font-medium',
              isNeumorphic ? 'text-neumorphic-text' : 'text-terminal-text'
            )}>
              X
            </p>
            {hasTwitter && (
              <p className={cn(
                'text-xs',
                isNeumorphic ? 'text-neumorphic-muted' : 'text-terminal-text-dim'
              )}>
                @{accounts.find(a => a.provider === 'twitter')?.providerUsername}
              </p>
            )}
          </div>
        </div>
        {hasTwitter ? (
          <button
            onClick={() => unlinkMutation.mutate('twitter')}
            disabled={!canUnlink || unlinkMutation.isPending}
            className={cn(
              'text-xs px-3 py-1 rounded-lg transition-colors',
              canUnlink
                ? 'text-red-400 hover:bg-red-500/10'
                : 'text-terminal-text-dim cursor-not-allowed'
            )}
          >
            {unlinkMutation.isPending ? 'Unlinking...' : 'Disconnect'}
          </button>
        ) : (
          <button
            onClick={() => window.location.href = getTwitterOAuthUrl(true)}
            className="text-xs px-3 py-1 rounded-lg text-terminal-accent hover:bg-terminal-accent/10 transition-colors"
          >
            Connect
          </button>
        )}
      </div>
    </div>
  </GlassPanel>
</motion.div>
```

**Step 4: Commit**

```bash
git add apps/web/src/lib/api.ts apps/web/src/app/\(main\)/settings/page.tsx
git commit -m "feat: add connected accounts section to settings"
```

---

## Task 8: Update GitHub Routes for Link Flow

**Files:**
- Modify: `apps/api/src/routes/auth/github.ts`

**Step 1: Update GitHub route to support link parameter**

Modify the `/github` route to check for `?link=true`:

```typescript
// GET /auth/github - Redirect to GitHub OAuth
fastify.get<{ Querystring: { link?: string } }>('/github', {
  config: { rateLimit: { max: 10, timeWindow: '1 minute' } },
}, async (request, reply) => {
  const clientId = process.env.GITHUB_CLIENT_ID;
  const callbackUrl = process.env.GITHUB_CALLBACK_URL;

  if (!clientId || !callbackUrl) {
    return reply.status(500).send({ error: 'GitHub OAuth not configured' });
  }

  const state = crypto.randomUUID();

  // Check if this is a link request
  const isLinkRequest = request.query.link === 'true';
  let userId: string | undefined;

  if (isLinkRequest) {
    try {
      await fastify.authenticate(request, reply);
      userId = request.user?.userId;
    } catch {
      return reply.status(401).send({ error: 'Authentication required to link accounts' });
    }
  }

  // Store state and link info in cookie
  const oauthData = JSON.stringify({
    state,
    isLink: isLinkRequest,
    userId,
  });

  reply.setCookie('oauth_state', oauthData, {
    path: '/',
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 600,
  });

  // ... rest of redirect logic
});
```

**Step 2: Update callback to handle link flow**

In the callback, after getting GitHub user data:

```typescript
// Parse oauth data
let oauthData: { state: string; isLink: boolean; userId?: string };
try {
  oauthData = JSON.parse(storedState);
} catch {
  // Legacy format - just state string
  oauthData = { state: storedState, isLink: false };
}

// Verify state
if (!state || state !== oauthData.state) {
  // ... error handling
}

// After getting githubUser...

const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';

// Handle link flow
if (oauthData.isLink && oauthData.userId) {
  const existingUser = await authService.findUserByOAuthProvider('github', githubUser.id.toString());
  if (existingUser && existingUser.id !== oauthData.userId) {
    return reply.redirect(`${frontendUrl}/settings?error=account_already_linked`);
  }

  await authService.upsertOAuthAccount(
    oauthData.userId,
    'github',
    githubUser.id.toString(),
    githubUser.login
  );

  return reply.redirect(`${frontendUrl}/settings?linked=github`);
}

// Normal login flow continues...
```

**Step 3: Commit**

```bash
git add apps/api/src/routes/auth/github.ts
git commit -m "feat: add link flow support to GitHub OAuth"
```

---

## Task 9: Add Environment Variables Documentation

**Files:**
- Modify: `apps/api/.env.example` (create if doesn't exist)

**Step 1: Add Twitter OAuth env vars to example**

```
# Twitter OAuth
TWITTER_CLIENT_ID=your_twitter_client_id
TWITTER_CLIENT_SECRET=your_twitter_client_secret
TWITTER_CALLBACK_URL=http://localhost:4000/auth/twitter/callback
```

**Step 2: Commit**

```bash
git add apps/api/.env.example
git commit -m "docs: add Twitter OAuth env vars to example"
```

---

## Task 10: Manual Testing Checklist

**Prerequisites:**
- Create X Developer account at developer.twitter.com
- Create OAuth 2.0 app with PKCE enabled
- Set callback URL to `http://localhost:4000/auth/twitter/callback`
- Add `TWITTER_CLIENT_ID` and `TWITTER_CLIENT_SECRET` to `.env`

**Test Cases:**

1. **New user login with X**
   - Go to login page
   - Click "Continue with X"
   - Authorize on X
   - Verify redirected to app, logged in
   - Check database: new user + oauth_account with provider='twitter'

2. **Existing GitHub user logs in with X**
   - Log out
   - Click "Continue with X"
   - Verify: new account created (not linked to GitHub account)

3. **Link X to existing GitHub account**
   - Log in with GitHub
   - Go to Settings
   - Click "Connect" next to X
   - Authorize on X
   - Verify: X appears as connected in Settings
   - Check database: oauth_account added for same user_id

4. **Unlink provider (when multiple linked)**
   - Have both GitHub and X linked
   - Click "Disconnect" next to one
   - Verify: provider removed from Settings
   - Verify: can still log in with remaining provider

5. **Cannot unlink last provider**
   - Have only one provider linked
   - Verify: "Disconnect" button is disabled

6. **Login with either provider after linking**
   - Link both GitHub and X
   - Log out
   - Log in with GitHub → same account
   - Log out
   - Log in with X → same account

---

## Summary

| Task | Files Changed | Commit Message |
|------|--------------|----------------|
| 1 | 1 new | feat: add oauth_accounts table for multi-provider auth |
| 2 | 1 modified | feat: add OAuth account methods to auth service |
| 3 | 2 (1 new, 1 modified) | feat: add Twitter OAuth routes with PKCE |
| 4 | 2 (1 new, 1 modified) | feat: add OAuth accounts management endpoints |
| 5 | 2 (1 new, 1 modified) | feat: add X login button component |
| 6 | 1 modified | feat: add X login option to login page |
| 7 | 2 modified | feat: add connected accounts section to settings |
| 8 | 1 modified | feat: add link flow support to GitHub OAuth |
| 9 | 1 modified | docs: add Twitter OAuth env vars to example |

Total: 8 new files, 6 modified files, 9 commits
