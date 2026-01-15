import type { FastifyPluginAsync } from 'fastify';
import { FollowService } from '../../services/follow.service.js';

interface UserIdParams {
  userId: string;
}

interface PaginationQuery {
  cursor?: string;
  limit?: number;
}

export const followRoutes: FastifyPluginAsync = async (fastify) => {
  const followService = new FollowService(fastify);

  // POST /users/:userId/follow - Follow a user
  fastify.post<{ Params: UserIdParams }>('/:userId/follow', {
    preHandler: [fastify.authenticate],
  }, async (request, reply) => {
    const { userId: targetUserId } = request.params;
    const { userId: currentUserId } = request.user;

    fastify.log.info({ targetUserId, currentUserId }, '[Follow] Attempting to follow user');

    if (targetUserId === currentUserId) {
      return reply.status(400).send({ error: 'Cannot follow yourself' });
    }

    // Check if target user exists
    const userCheck = await fastify.db.query(
      'SELECT id FROM users WHERE id = $1',
      [targetUserId]
    );

    if (userCheck.rows.length === 0) {
      fastify.log.warn({ targetUserId }, '[Follow] Target user not found');
      return reply.status(404).send({ error: 'User not found' });
    }

    try {
      const success = await followService.follow(currentUserId, targetUserId);

      if (!success) {
        fastify.log.warn({ targetUserId, currentUserId }, '[Follow] Service returned false');
        return reply.status(400).send({ error: 'Could not follow user - service returned false' });
      }
    } catch (error) {
      fastify.log.error({ error, targetUserId, currentUserId }, '[Follow] Error following user');
      return reply.status(500).send({ error: 'Internal error following user' });
    }

    const followerCount = await followService.getFollowerCount(targetUserId);
    fastify.log.info({ targetUserId, followerCount }, '[Follow] Successfully followed user');

    return { success: true, followerCount };
  });

  // DELETE /users/:userId/follow - Unfollow a user
  fastify.delete<{ Params: UserIdParams }>('/:userId/follow', {
    preHandler: [fastify.authenticate],
  }, async (request, reply) => {
    const { userId: targetUserId } = request.params;
    const { userId: currentUserId } = request.user;

    const success = await followService.unfollow(currentUserId, targetUserId);

    if (!success) {
      return reply.status(400).send({ error: 'Not following this user' });
    }

    const followerCount = await followService.getFollowerCount(targetUserId);

    return { success: true, followerCount };
  });

  // GET /users/:userId/followers - Get user's followers
  fastify.get<{ Params: UserIdParams; Querystring: PaginationQuery }>('/:userId/followers', {
    preHandler: [fastify.optionalAuth],
  }, async (request, reply) => {
    const { userId } = request.params;
    const { cursor, limit = 20 } = request.query;

    // Check if user exists
    const userCheck = await fastify.db.query(
      'SELECT id FROM users WHERE id = $1',
      [userId]
    );

    if (userCheck.rows.length === 0) {
      return reply.status(404).send({ error: 'User not found' });
    }

    const result = await followService.getFollowers(
      userId,
      cursor,
      Math.min(limit, 50)
    );

    return result;
  });

  // GET /users/:userId/following - Get users that a user follows
  fastify.get<{ Params: UserIdParams; Querystring: PaginationQuery }>('/:userId/following', {
    preHandler: [fastify.optionalAuth],
  }, async (request, reply) => {
    const { userId } = request.params;
    const { cursor, limit = 20 } = request.query;

    // Check if user exists
    const userCheck = await fastify.db.query(
      'SELECT id FROM users WHERE id = $1',
      [userId]
    );

    if (userCheck.rows.length === 0) {
      return reply.status(404).send({ error: 'User not found' });
    }

    const result = await followService.getFollowing(
      userId,
      cursor,
      Math.min(limit, 50)
    );

    return result;
  });

  // GET /users/:userId/follow/status - Check if current user follows target
  fastify.get<{ Params: UserIdParams }>('/:userId/follow/status', {
    preHandler: [fastify.authenticate],
  }, async (request) => {
    const { userId: targetUserId } = request.params;
    const { userId: currentUserId } = request.user;

    const isFollowing = await followService.isFollowing(currentUserId, targetUserId);
    const followerCount = await followService.getFollowerCount(targetUserId);
    const followingCount = await followService.getFollowingCount(targetUserId);

    return { isFollowing, followerCount, followingCount };
  });
};
