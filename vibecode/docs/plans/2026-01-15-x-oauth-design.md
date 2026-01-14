# X (Twitter) OAuth Integration Design

## Overview

Add X (Twitter) as a second OAuth login provider alongside GitHub, with the ability for users to link multiple providers to a single account.

## Decisions Made

| Decision | Choice |
|----------|--------|
| Account model | Linked accounts (multiple providers per user) |
| Linking method | Settings page only (explicit user action) |
| Unlinked login behavior | Creates new account |
| Profile data | First provider sets initial profile |

## Database Changes

### New `oauth_accounts` Table

```sql
CREATE TABLE oauth_accounts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    provider VARCHAR(20) NOT NULL,  -- 'github' or 'twitter'
    provider_id TEXT NOT NULL,
    provider_username TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(provider, provider_id)
);
CREATE INDEX idx_oauth_accounts_user_id ON oauth_accounts(user_id);
```

### Migration Strategy

1. Create `oauth_accounts` table
2. Migrate existing users: `INSERT INTO oauth_accounts (user_id, provider, provider_id, provider_username) SELECT id, 'github', github_id::text, username FROM users`
3. Drop `github_id` column from `users` table

## Backend Implementation

### New Routes (`routes/auth/twitter.ts`)

| Endpoint | Auth | Purpose |
|----------|------|---------|
| `GET /auth/twitter` | Optional | Start X OAuth 2.0 PKCE flow |
| `GET /auth/twitter/callback` | Query params | Handle callback, upsert user |

### Updated Routes (`routes/auth/github.ts`)

- Modify callback to use new `oauth_accounts` table
- Add `?link=true` query param support for linking flow

### New Routes (`routes/auth/accounts.ts`)

| Endpoint | Auth | Purpose |
|----------|------|---------|
| `GET /auth/accounts` | Required | List linked OAuth providers |
| `DELETE /auth/accounts/:provider` | Required | Unlink provider (if not last one) |

### Auth Service Additions

```typescript
// New methods
findUserByOAuthProvider(provider: string, providerId: string): Promise<User | null>
createUserFromOAuth(provider, providerId, username, displayName, avatarUrl): Promise<User>
upsertOAuthAccount(userId, provider, providerId, providerUsername): Promise<void>
unlinkOAuthAccount(userId, provider): Promise<void>
getUserOAuthAccounts(userId): Promise<OAuthAccount[]>
```

### Login Flow

1. User clicks "Login with X" → `GET /auth/twitter`
2. Generate PKCE code_verifier, store in cookie
3. Redirect to X OAuth with code_challenge + state
4. X callback → exchange code with code_verifier → fetch user profile
5. Query `oauth_accounts` for `(twitter, x_user_id)`
   - Found → load user, generate JWT, redirect to frontend
   - Not found → create user + oauth_account, generate JWT, redirect
6. Frontend stores tokens, loads user

### Link Flow (Authenticated)

1. User in settings clicks "Connect X" → `GET /auth/twitter?link=true`
2. Same OAuth flow, but state includes `link=true` flag
3. Callback verifies user is authenticated (from cookie)
4. Insert into `oauth_accounts` with existing `user_id`
5. Redirect back to settings page

## Frontend Implementation

### Login Page Changes

- Add "Continue with X" button alongside GitHub
- Both use same redirect pattern

### New Settings Section

Connected Accounts section showing:
- Provider icon + username + "Connected" badge
- "Connect" button for unlinked providers
- "Disconnect" button (disabled if only one provider linked)

### New Utilities (`lib/auth.ts`)

```typescript
export function getTwitterOAuthUrl(link?: boolean): string {
  const base = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
  return `${base}/auth/twitter${link ? '?link=true' : ''}`;
}
```

### New API Client Methods

```typescript
getOAuthAccounts(): Promise<OAuthAccount[]>
unlinkOAuthAccount(provider: string): Promise<void>
```

## Environment Variables

### API (new)

```
TWITTER_CLIENT_ID=xxx
TWITTER_CLIENT_SECRET=xxx
TWITTER_CALLBACK_URL=http://localhost:4000/auth/twitter/callback
```

## X Developer Portal Setup

1. Create app at developer.twitter.com
2. Enable OAuth 2.0 with PKCE
3. Add callback URL matching `TWITTER_CALLBACK_URL`
4. Request scopes: `tweet.read`, `users.read`

## X OAuth 2.0 Endpoints

| Endpoint | URL |
|----------|-----|
| Authorize | `https://twitter.com/i/oauth2/authorize` |
| Token | `https://api.twitter.com/2/oauth2/token` |
| User info | `https://api.twitter.com/2/users/me?user.fields=profile_image_url` |

## Implementation Order

1. Database migration (create oauth_accounts, migrate github users, drop github_id)
2. Update auth service with new methods
3. Update GitHub routes to use oauth_accounts
4. Add X OAuth routes
5. Add account management routes (list/unlink)
6. Frontend: update login page with X button
7. Frontend: add connected accounts settings section
8. Test both flows (login + link)
