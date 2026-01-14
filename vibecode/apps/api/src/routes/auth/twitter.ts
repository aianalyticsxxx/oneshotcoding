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
