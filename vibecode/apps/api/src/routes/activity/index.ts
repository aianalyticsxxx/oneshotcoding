import type { FastifyPluginAsync } from 'fastify';
import { ActivityService } from '../../services/activity.service.js';

interface ActivityQuery {
  mode?: 'personal' | 'global' | 'following';
  cursor?: string;
  limit?: number;
}

export const activityRoutes: FastifyPluginAsync = async (fastify) => {
  const activityService = new ActivityService(fastify);

  // GET /activity - Get activity feed
  // mode=personal: Activity relevant to current user (sparkles on posts, new followers)
  // mode=global: All recent activity
  fastify.get<{ Querystring: ActivityQuery }>('/', {
    preHandler: [fastify.optionalAuth],
  }, async (request, reply) => {
    const { mode = 'personal', cursor, limit = 20 } = request.query;
    const userId = request.user?.userId;

    // Personal and following modes require authentication
    if (mode === 'personal' || mode === 'following') {
      if (!userId) {
        return reply.status(401).send({ error: 'Authentication required for personal activity' });
      }
      if (mode === 'following') {
        return activityService.getFollowingActivity(userId, cursor, Math.min(limit, 50));
      }
      return activityService.getPersonalActivity(userId, cursor, Math.min(limit, 50));
    }

    // Global mode - anyone can view
    return activityService.getGlobalActivity(cursor, Math.min(limit, 50));
  });
};
