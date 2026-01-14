import type { FastifyPluginAsync } from 'fastify';
import { TagService } from '../../services/tag.service.js';
import { ShotService } from '../../services/shot.service.js';

interface GetTrendingQuery {
  days?: number;
  limit?: number;
}

interface TagParams {
  name: string;
}

interface GetShotsByTagQuery {
  cursor?: string;
  limit?: number;
}

export const tagRoutes: FastifyPluginAsync = async (fastify) => {
  const tagService = new TagService(fastify);
  const shotService = new ShotService(fastify);

  // GET /tags/trending - Get trending hashtags
  fastify.get<{ Querystring: GetTrendingQuery }>('/trending', async (request, _reply) => {
    const { days = 7, limit = 10 } = request.query;

    const trending = await tagService.getTrending(
      Math.min(days, 30),
      Math.min(limit, 50)
    );

    return { tags: trending };
  });

  // GET /tags/:name/shots - Get shots with a specific tag
  fastify.get<{ Params: TagParams; Querystring: GetShotsByTagQuery }>('/:name/shots', {
    preHandler: [fastify.optionalAuth],
  }, async (request, reply) => {
    const { name } = request.params;
    const { cursor, limit = 20 } = request.query;
    const userId = request.user?.userId;

    // Check if tag exists
    const tag = await tagService.getByName(name);
    if (!tag) {
      return reply.status(404).send({ error: 'Tag not found' });
    }

    // Get shots with this tag using a custom query
    const result = await getShotsByTag(fastify, tag.id, {
      cursor,
      limit: Math.min(limit, 50),
      currentUserId: userId,
    });

    return {
      tag: tag.name,
      ...result,
    };
  });
};

// Helper to get shots by tag ID with pagination
async function getShotsByTag(
  fastify: { db: { query: (sql: string, params: unknown[]) => Promise<{ rows: Record<string, unknown>[] }> } },
  tagId: string,
  options: { cursor?: string; limit: number; currentUserId?: string }
) {
  const { cursor, limit, currentUserId } = options;

  const params: (string | number)[] = [tagId];
  let paramIndex = 2;

  let cursorCondition = '';
  if (cursor) {
    cursorCondition = `AND s.created_at < $${paramIndex}`;
    params.push(cursor);
    paramIndex++;
  }

  const limitParam = paramIndex;
  params.push(limit + 1);
  paramIndex++;

  let hasReactedClause = 'false as has_reacted';
  if (currentUserId) {
    hasReactedClause = `EXISTS(SELECT 1 FROM reactions WHERE shot_id = s.id AND user_id = $${paramIndex}) as has_reacted`;
    params.push(currentUserId);
  }

  const query = `
    SELECT
      s.id,
      s.prompt,
      s.image_url,
      s.caption,
      s.result_type,
      s.embed_html,
      s.external_url,
      s.created_at,
      s.challenge_id,
      u.id as author_id,
      u.username,
      u.display_name,
      u.avatar_url,
      COUNT(r.id) as reaction_count,
      (SELECT COUNT(*) FROM comments c WHERE c.shot_id = s.id) as comment_count,
      ${hasReactedClause}
    FROM shots s
    JOIN users u ON s.user_id = u.id
    JOIN shot_tags st ON st.shot_id = s.id
    LEFT JOIN reactions r ON r.shot_id = s.id
    WHERE st.tag_id = $1
    ${cursorCondition}
    GROUP BY s.id, u.id
    ORDER BY s.created_at DESC
    LIMIT $${limitParam}
  `;

  const result = await fastify.db.query(query, params);

  const hasMore = result.rows.length > limit;
  const shots = result.rows.slice(0, limit).map(mapShotRow);
  const lastShot = shots[shots.length - 1];
  const nextCursor = hasMore && lastShot
    ? lastShot.createdAt.toISOString()
    : undefined;

  return {
    shots,
    nextCursor,
    hasMore,
  };
}

function mapShotRow(row: Record<string, unknown>) {
  return {
    id: row.id as string,
    prompt: row.prompt as string,
    imageUrl: row.image_url as string,
    caption: row.caption as string | undefined,
    resultType: (row.result_type as 'image' | 'video' | 'link' | 'embed') || 'image',
    embedHtml: row.embed_html as string | undefined,
    externalUrl: row.external_url as string | undefined,
    createdAt: new Date(row.created_at as string),
    user: {
      id: row.author_id as string,
      username: row.username as string,
      displayName: row.display_name as string,
      avatarUrl: row.avatar_url as string | undefined,
    },
    sparkleCount: parseInt(row.reaction_count as string, 10) || 0,
    hasSparkled: row.has_reacted as boolean,
    commentCount: parseInt(row.comment_count as string, 10) || 0,
    challengeId: row.challenge_id as string | undefined,
  };
}
