import type { FastifyInstance } from 'fastify';
import { FollowService } from './follow.service.js';

interface CreateShotData {
  userId: string;
  prompt: string;
  imageUrl: string;
  imageKey: string;
  caption?: string;
  resultType?: 'image' | 'video' | 'link' | 'embed';
  embedHtml?: string;
  externalUrl?: string;
  challengeId?: string;
}

interface FeedOptions {
  cursor?: string;
  limit: number;
  currentUserId?: string;
}

interface DiscoveryFeedOptions extends FeedOptions {
  sort?: 'recent' | 'popular';
}

interface Shot {
  id: string;
  prompt: string;
  imageUrl: string;
  caption?: string;
  resultType: 'image' | 'video' | 'link' | 'embed';
  embedHtml?: string;
  externalUrl?: string;
  createdAt: Date;
  user: {
    id: string;
    username: string;
    displayName: string;
    avatarUrl?: string;
  };
  sparkleCount: number;
  hasSparkled: boolean;
  commentCount: number;
  challengeId?: string;
}

interface FeedResult {
  shots: Shot[];
  nextCursor?: string;
  hasMore: boolean;
}

export class ShotService {
  private followService: FollowService;

  constructor(private fastify: FastifyInstance) {
    this.followService = new FollowService(fastify);
  }

  /**
   * Get chronological feed with cursor pagination
   */
  async getFeed(options: FeedOptions): Promise<FeedResult> {
    const { cursor, limit, currentUserId } = options;

    const params: (string | number)[] = [];
    let paramIndex = 1;

    // Base condition: exclude hidden/rejected content
    let cursorCondition = 'WHERE (s.is_hidden = FALSE OR s.is_hidden IS NULL) AND (s.moderation_status != \'rejected\' OR s.moderation_status IS NULL)';
    if (cursor) {
      cursorCondition += ` AND s.created_at < $${paramIndex}`;
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
      LEFT JOIN reactions r ON r.shot_id = s.id
      ${cursorCondition}
      GROUP BY s.id, u.id
      ORDER BY s.created_at DESC
      LIMIT $${limitParam}
    `;

    const result = await this.fastify.db.query(query, params);

    const hasMore = result.rows.length > limit;
    const shots = result.rows.slice(0, limit).map(this.mapShotRow.bind(this));
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

  /**
   * Get a single shot by ID
   */
  async getById(shotId: string, currentUserId?: string): Promise<Shot | null> {
    const hasReactedClause = currentUserId
      ? 'EXISTS(SELECT 1 FROM reactions WHERE shot_id = s.id AND user_id = $2) as has_reacted'
      : 'false as has_reacted';

    const result = await this.fastify.db.query(
      `SELECT
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
      LEFT JOIN reactions r ON r.shot_id = s.id
      WHERE s.id = $1
      GROUP BY s.id, u.id`,
      currentUserId ? [shotId, currentUserId] : [shotId]
    );

    if (result.rows.length === 0) {
      return null;
    }

    return this.mapShotRow(result.rows[0]);
  }

  /**
   * Create a new shot (no daily limit!)
   */
  async create(data: CreateShotData): Promise<Shot> {
    const {
      userId,
      prompt,
      imageUrl,
      imageKey,
      caption,
      resultType = 'image',
      embedHtml,
      externalUrl,
      challengeId
    } = data;

    const result = await this.fastify.db.query(
      `INSERT INTO shots (user_id, prompt, image_url, image_key, caption, result_type, embed_html, external_url, challenge_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING id`,
      [userId, prompt, imageUrl, imageKey, caption, resultType, embedHtml, externalUrl, challengeId]
    );

    const shotId = result.rows[0].id;

    // Fetch the complete shot with author info
    const shot = await this.getById(shotId, userId);
    if (!shot) {
      throw new Error('Failed to fetch created shot');
    }

    return shot;
  }

  /**
   * Get discovery feed (all shots from all users)
   */
  async getDiscoveryFeed(options: DiscoveryFeedOptions): Promise<FeedResult> {
    const { cursor, limit, currentUserId, sort = 'recent' } = options;

    const params: (string | number)[] = [];
    let paramIndex = 1;

    // Base condition: exclude hidden/rejected content
    let whereClause = 'WHERE (s.is_hidden = FALSE OR s.is_hidden IS NULL) AND (s.moderation_status != \'rejected\' OR s.moderation_status IS NULL)';
    if (cursor) {
      if (sort === 'recent') {
        whereClause += ` AND s.created_at < $${paramIndex}`;
      } else {
        whereClause += ` AND (COUNT(r.id), s.created_at) < ($${paramIndex}::int, $${paramIndex + 1}::timestamptz)`;
        paramIndex++;
      }
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

    const orderBy = sort === 'popular'
      ? 'COUNT(r.id) DESC, s.created_at DESC'
      : 's.created_at DESC';

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
      LEFT JOIN reactions r ON r.shot_id = s.id
      ${whereClause}
      GROUP BY s.id, u.id
      ORDER BY ${orderBy}
      LIMIT $${limitParam}
    `;

    const result = await this.fastify.db.query(query, params);

    const hasMore = result.rows.length > limit;
    const shots = result.rows.slice(0, limit).map(this.mapShotRow.bind(this));
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

  /**
   * Delete a shot (only by owner)
   */
  async delete(shotId: string, userId: string): Promise<boolean> {
    const result = await this.fastify.db.query(
      `DELETE FROM shots WHERE id = $1 AND user_id = $2 RETURNING id`,
      [shotId, userId]
    );

    return result.rows.length > 0;
  }

  /**
   * Get feed of shots from users the current user follows
   */
  async getFollowingFeed(options: FeedOptions): Promise<FeedResult> {
    const { cursor, limit, currentUserId } = options;

    if (!currentUserId) {
      return { shots: [], hasMore: false };
    }

    // Get list of users we follow
    const followingIds = await this.followService.getFollowingIds(currentUserId);

    if (followingIds.length === 0) {
      return { shots: [], hasMore: false };
    }

    const params: (string | number | string[])[] = [];
    let paramIndex = 1;

    // Add following IDs as array parameter
    params.push(followingIds);
    const followingParam = paramIndex;
    paramIndex++;

    // Cursor condition for pagination
    let cursorCondition = '';
    if (cursor) {
      cursorCondition = `AND s.created_at < $${paramIndex}`;
      params.push(cursor);
      paramIndex++;
    }

    const limitParam = paramIndex;
    params.push(limit + 1);
    paramIndex++;

    const hasReactedClause = `EXISTS(SELECT 1 FROM reactions WHERE shot_id = s.id AND user_id = $${paramIndex}) as has_reacted`;
    params.push(currentUserId);

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
      LEFT JOIN reactions r ON r.shot_id = s.id
      WHERE s.user_id = ANY($${followingParam}::uuid[])
        AND (s.is_hidden = FALSE OR s.is_hidden IS NULL)
        AND (s.moderation_status != 'rejected' OR s.moderation_status IS NULL)
      ${cursorCondition}
      GROUP BY s.id, u.id
      ORDER BY s.created_at DESC
      LIMIT $${limitParam}
    `;

    const result = await this.fastify.db.query(query, params);

    const hasMore = result.rows.length > limit;
    const shots = result.rows.slice(0, limit).map(this.mapShotRow.bind(this));
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

  /**
   * Get shots for a challenge
   */
  async getChallengeShots(challengeId: string, options: FeedOptions): Promise<FeedResult> {
    const { cursor, limit, currentUserId } = options;

    const params: (string | number)[] = [challengeId];
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
      LEFT JOIN reactions r ON r.shot_id = s.id
      WHERE s.challenge_id = $1
        AND (s.is_hidden = FALSE OR s.is_hidden IS NULL)
        AND (s.moderation_status != 'rejected' OR s.moderation_status IS NULL)
      ${cursorCondition}
      GROUP BY s.id, u.id
      ORDER BY s.created_at DESC
      LIMIT $${limitParam}
    `;

    const result = await this.fastify.db.query(query, params);

    const hasMore = result.rows.length > limit;
    const shots = result.rows.slice(0, limit).map(this.mapShotRow.bind(this));
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

  /**
   * Get shots by a specific user
   */
  async getUserShots(userId: string, options: FeedOptions): Promise<FeedResult> {
    const { cursor, limit, currentUserId } = options;

    const params: (string | number)[] = [userId];
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
      LEFT JOIN reactions r ON r.shot_id = s.id
      WHERE s.user_id = $1
        AND (s.is_hidden = FALSE OR s.is_hidden IS NULL)
        AND (s.moderation_status != 'rejected' OR s.moderation_status IS NULL)
      ${cursorCondition}
      GROUP BY s.id, u.id
      ORDER BY s.created_at DESC
      LIMIT $${limitParam}
    `;

    const result = await this.fastify.db.query(query, params);

    const hasMore = result.rows.length > limit;
    const shots = result.rows.slice(0, limit).map(this.mapShotRow.bind(this));
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

  /**
   * Submit shot to a challenge
   */
  async submitToChallenge(shotId: string, challengeId: string, userId: string): Promise<boolean> {
    // Verify user owns the shot
    const shot = await this.fastify.db.query(
      `SELECT id FROM shots WHERE id = $1 AND user_id = $2`,
      [shotId, userId]
    );

    if (shot.rows.length === 0) {
      return false;
    }

    // Update the shot with the challenge ID
    await this.fastify.db.query(
      `UPDATE shots SET challenge_id = $1 WHERE id = $2`,
      [challengeId, shotId]
    );

    return true;
  }

  /**
   * Map database row to Shot object
   */
  private mapShotRow(row: Record<string, unknown>): Shot {
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
}
