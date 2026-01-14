import type { FastifyPluginAsync } from 'fastify';
import { AuthService } from '../../services/auth.service.js';

interface GitHubCallbackQuery {
  code: string;
  state?: string;
}

interface RefreshBody {
  refreshToken?: string;
}

export const githubRoutes: FastifyPluginAsync = async (fastify) => {
  const authService = new AuthService(fastify);

  // GET /auth/github - Redirect to GitHub OAuth
  fastify.get('/github', {
    config: { rateLimit: { max: 10, timeWindow: '1 minute' } },
  }, async (_request, reply) => {
    const clientId = process.env.GITHUB_CLIENT_ID;
    const callbackUrl = process.env.GITHUB_CALLBACK_URL;

    if (!clientId || !callbackUrl) {
      return reply.status(500).send({ error: 'GitHub OAuth not configured' });
    }

    const state = crypto.randomUUID();

    // Store state in cookie for CSRF protection
    reply.setCookie('oauth_state', state, {
      path: '/',
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 600, // 10 minutes
    });

    const authUrl = new URL('https://github.com/login/oauth/authorize');
    authUrl.searchParams.set('client_id', clientId);
    authUrl.searchParams.set('redirect_uri', callbackUrl);
    authUrl.searchParams.set('scope', 'read:user user:email');
    authUrl.searchParams.set('state', state);

    return reply.redirect(authUrl.toString());
  });

  // GET /auth/github/callback - Handle GitHub OAuth callback
  fastify.get<{ Querystring: GitHubCallbackQuery }>('/github/callback', {
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
    const storedState = request.cookies.oauth_state;

    // Clear the state cookie
    reply.clearCookie('oauth_state', { path: '/' });

    // Verify state for CSRF protection - strict mode
    if (!state || !storedState || state !== storedState) {
      fastify.log.warn({
        hasState: !!state,
        hasStoredState: !!storedState,
        match: state === storedState,
      }, 'OAuth state validation failed');

      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
      return reply.redirect(`${frontendUrl}/auth/callback?error=csrf_validation_failed`);
    }

    try {
      // Exchange code for access token
      const githubTokenResponse = await fetch('https://github.com/login/oauth/access_token', {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          client_id: process.env.GITHUB_CLIENT_ID,
          client_secret: process.env.GITHUB_CLIENT_SECRET,
          code,
          redirect_uri: process.env.GITHUB_CALLBACK_URL,
        }),
      });

      const tokenData = await githubTokenResponse.json() as {
        access_token?: string;
        error?: string;
        error_description?: string;
      };

      if (tokenData.error || !tokenData.access_token) {
        fastify.log.error({ tokenData }, 'GitHub token exchange failed');
        return reply.status(400).send({ error: tokenData.error_description || 'Failed to exchange code' });
      }

      // Get user info from GitHub
      const userResponse = await fetch('https://api.github.com/user', {
        headers: {
          'Authorization': `Bearer ${tokenData.access_token}`,
          'Accept': 'application/vnd.github.v3+json',
        },
      });

      if (!userResponse.ok) {
        return reply.status(400).send({ error: 'Failed to fetch GitHub user' });
      }

      const githubUser = await userResponse.json() as {
        id: number;
        login: string;
        name?: string;
        avatar_url?: string;
        email?: string;
      };

      // Upsert user in database
      const user = await authService.upsertGitHubUser({
        githubId: githubUser.id.toString(),
        username: githubUser.login,
        displayName: githubUser.name || githubUser.login,
        avatarUrl: githubUser.avatar_url,
        email: githubUser.email,
      });

      // Generate JWT tokens
      const { accessToken, refreshToken } = authService.generateTokens({
        userId: user.id,
        username: user.username,
      });

      // Store refresh token in database
      await authService.storeRefreshToken(user.id, refreshToken);

      // Redirect to frontend with tokens in URL
      // Tokens are passed via URL because API and frontend are on different domains,
      // so cookies set here wouldn't be accessible to the frontend
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
      return reply.redirect(`${frontendUrl}/auth/callback?success=true&accessToken=${accessToken}&refreshToken=${refreshToken}`);
    } catch (err) {
      fastify.log.error({ err }, 'GitHub OAuth error');
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
      return reply.redirect(`${frontendUrl}/auth/callback?error=oauth_failed`);
    }
  });

  // POST /auth/refresh - Refresh access token
  fastify.post<{ Body: RefreshBody }>('/refresh', {
    config: { rateLimit: { max: 20, timeWindow: '1 minute' } },
  }, async (request, reply) => {
    // Get refresh token from cookie or body
    const refreshToken = request.cookies.refresh_token || request.body?.refreshToken;

    if (!refreshToken) {
      return reply.status(401).send({ error: 'No refresh token provided' });
    }

    try {
      // Verify refresh token
      const decoded = fastify.jwt.verify<{
        userId: string;
        username: string;
        type: string;
      }>(refreshToken);

      if (decoded.type !== 'refresh') {
        return reply.status(401).send({ error: 'Invalid token type' });
      }

      // Verify token exists in database
      const isValid = await authService.validateRefreshToken(decoded.userId, refreshToken);
      if (!isValid) {
        return reply.status(401).send({ error: 'Invalid refresh token' });
      }

      // Generate new tokens
      const tokens = authService.generateTokens({
        userId: decoded.userId,
        username: decoded.username,
      });

      // Update refresh token in database
      await authService.rotateRefreshToken(decoded.userId, refreshToken, tokens.refreshToken);

      // Set new cookies
      const isProduction = process.env.NODE_ENV === 'production';

      reply.setCookie('access_token', tokens.accessToken, {
        path: '/',
        httpOnly: true,
        secure: isProduction,
        sameSite: 'lax',
        maxAge: 15 * 60,
      });

      reply.setCookie('refresh_token', tokens.refreshToken, {
        path: '/',
        httpOnly: true,
        secure: isProduction,
        sameSite: 'lax',
        maxAge: 7 * 24 * 60 * 60,
      });

      return {
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
      };
    } catch (err) {
      return reply.status(401).send({ error: 'Invalid or expired refresh token' });
    }
  });
};
