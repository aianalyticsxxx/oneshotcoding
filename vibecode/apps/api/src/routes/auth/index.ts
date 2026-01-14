import type { FastifyPluginAsync } from 'fastify';
import { githubRoutes } from './github.js';
import { twitterRoutes } from './twitter.js';
import { accountsRoutes } from './accounts.js';

export const authRoutes: FastifyPluginAsync = async (fastify) => {
  // Register GitHub OAuth routes
  await fastify.register(githubRoutes);

  // Register Twitter OAuth routes
  await fastify.register(twitterRoutes);

  // Register OAuth accounts management routes
  await fastify.register(accountsRoutes);

  // POST /auth/logout - Clear cookies
  fastify.post('/logout', async (request, reply) => {
    reply.clearCookie('access_token', {
      path: '/',
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
    });

    reply.clearCookie('refresh_token', {
      path: '/',
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
    });

    return { success: true };
  });

  // GET /auth/me - Get current user
  fastify.get('/me', {
    preHandler: [fastify.authenticate],
  }, async (request, reply) => {
    const { userId } = request.user;

    const result = await fastify.db.query(
      `SELECT id, github_id, username, display_name, avatar_url, bio, created_at, updated_at
       FROM users WHERE id = $1`,
      [userId]
    );

    if (result.rows.length === 0) {
      return reply.status(404).send({ error: 'User not found' });
    }

    const user = result.rows[0];
    return {
      user: {
        id: user.id,
        githubId: user.github_id,
        username: user.username,
        displayName: user.display_name,
        avatarUrl: user.avatar_url,
        bio: user.bio,
        createdAt: user.created_at,
        updatedAt: user.updated_at,
      }
    };
  });
};
