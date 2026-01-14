import type { FastifyInstance } from 'fastify';

export interface ActivityItem {
  id: string;
  type: 'shot' | 'sparkle' | 'follow';
  actorId: string;
  actorUsername: string;
  actorDisplayName: string;
  actorAvatarUrl: string | null;
  targetUserId: string | null;
  targetUsername: string | null;
  shotId: string | null;
  timestamp: Date;
}

export interface ActivityFeedResult {
  items: ActivityItem[];
  nextCursor: string | null;
  hasMore: boolean;
}

export class ActivityService {
  constructor(private fastify: FastifyInstance) {}

  /**
   * Get activity relevant to the current user:
   * - Sparkles on their posts
   * - New followers
   */
  async getPersonalActivity(
    userId: string,
    cursor?: string,
    limit: number = 20
  ): Promise<ActivityFeedResult> {
    const actualLimit = Math.min(limit, 50) + 1; // +1 to check hasMore
    const params: (string | number)[] = [userId, actualLimit];

    let cursorCondition = '';
    if (cursor) {
      cursorCondition = `AND timestamp < $3`;
      params.push(cursor);
    }

    const result = await this.fastify.db.query(
      `WITH activity AS (
        -- Sparkles on user's posts
        SELECT
          r.id::text as id,
          'sparkle' as type,
          u.id as actor_id,
          u.username as actor_username,
          u.display_name as actor_display_name,
          u.avatar_url as actor_avatar_url,
          s.user_id as target_user_id,
          target_u.username as target_username,
          r.shot_id::text as shot_id,
          r.created_at as timestamp
        FROM reactions r
        JOIN users u ON r.user_id = u.id
        JOIN shots s ON r.shot_id = s.id
        JOIN users target_u ON s.user_id = target_u.id
        WHERE s.user_id = $1
          AND r.user_id != $1  -- Exclude self-sparkles
          AND r.reaction_type = 'sparkle'

        UNION ALL

        -- New followers
        SELECT
          (f.follower_id::text || '-' || f.following_id::text) as id,
          'follow' as type,
          u.id as actor_id,
          u.username as actor_username,
          u.display_name as actor_display_name,
          u.avatar_url as actor_avatar_url,
          f.following_id as target_user_id,
          target_u.username as target_username,
          NULL as shot_id,
          f.created_at as timestamp
        FROM follows f
        JOIN users u ON f.follower_id = u.id
        JOIN users target_u ON f.following_id = target_u.id
        WHERE f.following_id = $1
      )
      SELECT * FROM activity
      WHERE 1=1 ${cursorCondition}
      ORDER BY timestamp DESC
      LIMIT $2`,
      params
    );

    const items = result.rows.slice(0, limit).map(row => this.mapActivityRow(row));
    const hasMore = result.rows.length > limit;
    const lastItem = items[items.length - 1];
    const nextCursor = hasMore && lastItem
      ? lastItem.timestamp.toISOString()
      : null;

    return { items, nextCursor, hasMore };
  }

  /**
   * Get activity from users the current user follows:
   * - New posts from followed users
   * - Sparkles by followed users
   */
  async getFollowingActivity(
    userId: string,
    cursor?: string,
    limit: number = 20
  ): Promise<ActivityFeedResult> {
    const actualLimit = Math.min(limit, 50) + 1;
    const params: (string | number)[] = [userId, actualLimit];

    let cursorCondition = '';
    if (cursor) {
      cursorCondition = `AND timestamp < $3`;
      params.push(cursor);
    }

    const result = await this.fastify.db.query(
      `WITH activity AS (
        -- New shots from followed users
        SELECT
          s.id::text as id,
          'shot' as type,
          u.id as actor_id,
          u.username as actor_username,
          u.display_name as actor_display_name,
          u.avatar_url as actor_avatar_url,
          NULL as target_user_id,
          NULL as target_username,
          s.id::text as shot_id,
          s.created_at as timestamp
        FROM shots s
        JOIN users u ON s.user_id = u.id
        JOIN follows f ON f.following_id = s.user_id AND f.follower_id = $1

        UNION ALL

        -- Sparkles by followed users
        SELECT
          r.id::text as id,
          'sparkle' as type,
          u.id as actor_id,
          u.username as actor_username,
          u.display_name as actor_display_name,
          u.avatar_url as actor_avatar_url,
          s.user_id as target_user_id,
          target_u.username as target_username,
          r.shot_id::text as shot_id,
          r.created_at as timestamp
        FROM reactions r
        JOIN users u ON r.user_id = u.id
        JOIN shots s ON r.shot_id = s.id
        JOIN users target_u ON s.user_id = target_u.id
        JOIN follows f ON f.following_id = r.user_id AND f.follower_id = $1
        WHERE r.reaction_type = 'sparkle'
          AND r.user_id != s.user_id  -- Exclude self-sparkles
      )
      SELECT * FROM activity
      WHERE 1=1 ${cursorCondition}
      ORDER BY timestamp DESC
      LIMIT $2`,
      params
    );

    const items = result.rows.slice(0, limit).map(row => this.mapActivityRow(row));
    const hasMore = result.rows.length > limit;
    const lastItem = items[items.length - 1];
    const nextCursor = hasMore && lastItem
      ? lastItem.timestamp.toISOString()
      : null;

    return { items, nextCursor, hasMore };
  }

  /**
   * Get global activity feed (all recent activity)
   * Shows: new posts, sparkles, follows
   */
  async getGlobalActivity(
    cursor?: string,
    limit: number = 20
  ): Promise<ActivityFeedResult> {
    const actualLimit = Math.min(limit, 50) + 1;
    const params: (string | number)[] = [actualLimit];

    let cursorCondition = '';
    if (cursor) {
      cursorCondition = `AND timestamp < $2`;
      params.push(cursor);
    }

    const result = await this.fastify.db.query(
      `WITH activity AS (
        -- New shots (posts)
        SELECT
          s.id::text as id,
          'shot' as type,
          u.id as actor_id,
          u.username as actor_username,
          u.display_name as actor_display_name,
          u.avatar_url as actor_avatar_url,
          NULL as target_user_id,
          NULL as target_username,
          s.id::text as shot_id,
          s.created_at as timestamp
        FROM shots s
        JOIN users u ON s.user_id = u.id

        UNION ALL

        -- Sparkles
        SELECT
          r.id::text as id,
          'sparkle' as type,
          u.id as actor_id,
          u.username as actor_username,
          u.display_name as actor_display_name,
          u.avatar_url as actor_avatar_url,
          s.user_id as target_user_id,
          target_u.username as target_username,
          r.shot_id::text as shot_id,
          r.created_at as timestamp
        FROM reactions r
        JOIN users u ON r.user_id = u.id
        JOIN shots s ON r.shot_id = s.id
        JOIN users target_u ON s.user_id = target_u.id
        WHERE r.reaction_type = 'sparkle'
          AND r.user_id != s.user_id  -- Exclude self-sparkles

        UNION ALL

        -- Follows
        SELECT
          (f.follower_id::text || '-' || f.following_id::text) as id,
          'follow' as type,
          u.id as actor_id,
          u.username as actor_username,
          u.display_name as actor_display_name,
          u.avatar_url as actor_avatar_url,
          f.following_id as target_user_id,
          target_u.username as target_username,
          NULL as shot_id,
          f.created_at as timestamp
        FROM follows f
        JOIN users u ON f.follower_id = u.id
        JOIN users target_u ON f.following_id = target_u.id
      )
      SELECT * FROM activity
      WHERE 1=1 ${cursorCondition}
      ORDER BY timestamp DESC
      LIMIT $1`,
      params
    );

    const items = result.rows.slice(0, limit).map(row => this.mapActivityRow(row));
    const hasMore = result.rows.length > limit;
    const lastItem = items[items.length - 1];
    const nextCursor = hasMore && lastItem
      ? lastItem.timestamp.toISOString()
      : null;

    return { items, nextCursor, hasMore };
  }

  /**
   * Map database row to ActivityItem
   */
  private mapActivityRow(row: Record<string, unknown>): ActivityItem {
    return {
      id: row.id as string,
      type: row.type as 'shot' | 'sparkle' | 'follow',
      actorId: row.actor_id as string,
      actorUsername: row.actor_username as string,
      actorDisplayName: row.actor_display_name as string || row.actor_username as string,
      actorAvatarUrl: row.actor_avatar_url as string | null,
      targetUserId: row.target_user_id as string | null,
      targetUsername: row.target_username as string | null,
      shotId: row.shot_id as string | null,
      timestamp: new Date(row.timestamp as string),
    };
  }
}
