import type { FastifyPluginAsync } from 'fastify';
import { VibeService } from '../../services/vibe.service.js';

interface CreateVibeBody {
  imageUrl: string;
  imageKey: string;
  caption?: string;
}

interface GetVibesQuery {
  cursor?: string;
  limit?: number;
}

interface DiscoveryQuery extends GetVibesQuery {
  sort?: 'recent' | 'popular';
}

interface VibeParams {
  id: string;
}

export const vibeRoutes: FastifyPluginAsync = async (fastify) => {
  const vibeService = new VibeService(fastify);

  // GET /vibes - Chronological feed with cursor pagination
  fastify.get<{ Querystring: GetVibesQuery }>('/', {
    preHandler: [fastify.optionalAuth],
  }, async (request, _reply) => {
    const { cursor, limit = 20 } = request.query;
    const userId = request.user?.userId;

    const vibes = await vibeService.getFeed({
      cursor,
      limit: Math.min(limit, 50),
      currentUserId: userId,
    });

    return vibes;
  });

  // GET /vibes/today - Check if user posted today
  fastify.get('/today', {
    preHandler: [fastify.authenticate],
  }, async (request, _reply) => {
    const { userId } = request.user;
    const todayVibe = await vibeService.getTodayVibe(userId);

    return {
      hasPostedToday: !!todayVibe,
      vibe: todayVibe,
    };
  });

  // GET /vibes/discovery - Global discovery feed
  fastify.get<{ Querystring: DiscoveryQuery }>('/discovery', {
    preHandler: [fastify.optionalAuth],
  }, async (request, _reply) => {
    const { cursor, limit = 20, sort = 'recent' } = request.query;
    const userId = request.user?.userId;

    const vibes = await vibeService.getDiscoveryFeed({
      cursor,
      limit: Math.min(limit, 50),
      currentUserId: userId,
      sort,
    });

    return vibes;
  });

  // GET /vibes/:id - Get single vibe
  fastify.get<{ Params: VibeParams }>('/:id', {
    preHandler: [fastify.optionalAuth],
  }, async (request, reply) => {
    const { id } = request.params;
    const userId = request.user?.userId;

    const vibe = await vibeService.getById(id, userId);

    if (!vibe) {
      return reply.status(404).send({ error: 'Vibe not found' });
    }

    return vibe;
  });

  // POST /vibes - Create or replace today's vibe
  fastify.post<{ Body: CreateVibeBody }>('/', {
    preHandler: [fastify.authenticate],
  }, async (request, reply) => {
    const { userId } = request.user;
    const { imageUrl, imageKey, caption } = request.body;

    if (!imageUrl || !imageKey) {
      return reply.status(400).send({ error: 'Image URL and key are required' });
    }

    try {
      const vibe = await vibeService.createOrReplaceTodayVibe({
        userId,
        imageUrl,
        imageKey,
        caption: caption?.trim(),
      });

      return reply.status(201).send(vibe);
    } catch (err) {
      fastify.log.error({ err }, 'Error creating vibe');
      return reply.status(500).send({ error: 'Failed to create vibe' });
    }
  });

  // DELETE /vibes/:id - Delete own vibe
  fastify.delete<{ Params: VibeParams }>('/:id', {
    preHandler: [fastify.authenticate],
  }, async (request, reply) => {
    const { id } = request.params;
    const { userId } = request.user;

    const deleted = await vibeService.delete(id, userId);

    if (!deleted) {
      return reply.status(404).send({ error: 'Vibe not found or not authorized' });
    }

    return { success: true };
  });
};
