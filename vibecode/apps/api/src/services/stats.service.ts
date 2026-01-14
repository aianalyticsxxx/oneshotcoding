import type { FastifyInstance } from 'fastify';

export interface UserStats {
  streak: number;        // consecutive posting days
  totalPosts: number;    // total shots
  totalSparkles: number; // sparkles received on all posts
  rank: number | null;   // rank by sparkles (null if 0 sparkles)
}

export class StatsService {
  constructor(private fastify: FastifyInstance) {}

  /**
   * Get complete stats for a user by username
   */
  async getUserStats(username: string): Promise<UserStats | null> {
    // First get the user ID
    const userResult = await this.fastify.db.query(
      `SELECT id FROM users WHERE username = $1`,
      [username]
    );

    if (userResult.rows.length === 0) {
      return null;
    }

    const userId = userResult.rows[0].id as string;
    return this.getStatsByUserId(userId);
  }

  /**
   * Get complete stats for a user by ID
   */
  async getStatsByUserId(userId: string): Promise<UserStats> {
    // Run all queries in parallel for performance
    const [streakResult, postsResult, sparklesResult, rankResult] = await Promise.all([
      this.calculateStreak(userId),
      this.countPosts(userId),
      this.countSparklesReceived(userId),
      this.getUserRank(userId),
    ]);

    return {
      streak: streakResult,
      totalPosts: postsResult,
      totalSparkles: sparklesResult,
      rank: rankResult,
    };
  }

  /**
   * Calculate consecutive posting days from today/yesterday
   * A streak continues if user posted today or yesterday
   */
  private async calculateStreak(userId: string): Promise<number> {
    const result = await this.fastify.db.query(
      `WITH posting_days AS (
        SELECT DISTINCT DATE(created_at AT TIME ZONE 'UTC') as post_date
        FROM shots
        WHERE user_id = $1
        ORDER BY post_date DESC
      ),
      numbered AS (
        SELECT
          post_date,
          ROW_NUMBER() OVER (ORDER BY post_date DESC) as rn
        FROM posting_days
      ),
      streak_check AS (
        SELECT
          post_date,
          rn,
          (CURRENT_DATE - post_date) as days_ago,
          (CURRENT_DATE - post_date) - (rn - 1) as gap
        FROM numbered
      )
      SELECT COUNT(*) as streak_length
      FROM streak_check
      WHERE gap <= 1  -- Allow for current day or yesterday as start
        AND days_ago = rn - 1 + gap`,
      [userId]
    );

    // Simpler approach: count consecutive days from most recent
    const simpleResult = await this.fastify.db.query(
      `WITH posting_days AS (
        SELECT DISTINCT DATE(created_at AT TIME ZONE 'UTC') as post_date
        FROM shots
        WHERE user_id = $1
        ORDER BY post_date DESC
      ),
      numbered AS (
        SELECT
          post_date,
          ROW_NUMBER() OVER (ORDER BY post_date DESC) as rn
        FROM posting_days
      )
      SELECT COUNT(*) as streak
      FROM numbered
      WHERE post_date >= CURRENT_DATE - (rn::int)
        AND post_date <= CURRENT_DATE`,
      [userId]
    );

    const streak = parseInt(simpleResult.rows[0]?.streak as string || '0', 10);
    return streak;
  }

  /**
   * Count total posts for a user
   */
  private async countPosts(userId: string): Promise<number> {
    const result = await this.fastify.db.query(
      `SELECT COUNT(*) as count FROM shots WHERE user_id = $1`,
      [userId]
    );
    return parseInt(result.rows[0]?.count as string || '0', 10);
  }

  /**
   * Count total sparkles received across all user's posts
   */
  private async countSparklesReceived(userId: string): Promise<number> {
    const result = await this.fastify.db.query(
      `SELECT COUNT(r.id) as count
       FROM reactions r
       JOIN shots s ON r.shot_id = s.id
       WHERE s.user_id = $1
         AND r.reaction_type = 'sparkle'`,
      [userId]
    );
    return parseInt(result.rows[0]?.count as string || '0', 10);
  }

  /**
   * Get user's rank by total sparkles received
   * Returns null if user has 0 sparkles
   */
  private async getUserRank(userId: string): Promise<number | null> {
    const result = await this.fastify.db.query(
      `WITH user_sparkles AS (
        SELECT
          u.id as user_id,
          COUNT(r.id) as sparkle_count
        FROM users u
        LEFT JOIN shots s ON s.user_id = u.id
        LEFT JOIN reactions r ON r.shot_id = s.id AND r.reaction_type = 'sparkle'
        GROUP BY u.id
        HAVING COUNT(r.id) > 0
      ),
      ranked AS (
        SELECT
          user_id,
          sparkle_count,
          RANK() OVER (ORDER BY sparkle_count DESC) as rank
        FROM user_sparkles
      )
      SELECT rank
      FROM ranked
      WHERE user_id = $1`,
      [userId]
    );

    if (result.rows.length === 0) {
      return null; // User has no sparkles, not ranked
    }

    return parseInt(result.rows[0].rank as string, 10);
  }
}
