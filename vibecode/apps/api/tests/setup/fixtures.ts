import { randomUUID } from 'crypto';
import { getTestPool } from './setup.js';

// ============================================================================
// Types
// ============================================================================

export interface TestUser {
  id: string;
  githubId: string;
  username: string;
  displayName: string;
  avatarUrl?: string;
  bio?: string;
  isAdmin?: boolean;
}

export interface TestShot {
  id: string;
  userId: string;
  prompt: string;
  imageUrl: string;
  imageKey: string;
  caption?: string;
  resultType: 'image' | 'video' | 'link' | 'embed';
  challengeId?: string;
  createdAt: Date;
}

export interface TestComment {
  id: string;
  shotId: string;
  userId: string;
  content: string;
  createdAt: Date;
}

export interface TestChallenge {
  id: string;
  title: string;
  description?: string;
  createdBy?: string;
  isOfficial: boolean;
  startsAt: Date;
  endsAt: Date;
  votingEndsAt?: Date;
}

export interface TestReport {
  id: string;
  reporterId: string;
  reportedUserId?: string;
  reportedShotId?: string;
  reportedCommentId?: string;
  reason: 'spam' | 'harassment' | 'inappropriate' | 'impersonation' | 'other';
  details?: string;
  status: 'pending' | 'reviewed' | 'actioned' | 'dismissed';
}

// ============================================================================
// Factory Functions
// ============================================================================

export const factories = {
  /**
   * Create a test user
   */
  async createUser(overrides: Partial<TestUser> = {}): Promise<TestUser> {
    const pool = getTestPool();
    const user: TestUser = {
      id: overrides.id || randomUUID(),
      githubId: overrides.githubId || String(Math.floor(Math.random() * 1000000000)),
      username: overrides.username || `testuser_${randomUUID().slice(0, 8)}`,
      displayName: overrides.displayName || 'Test User',
      avatarUrl: overrides.avatarUrl,
      bio: overrides.bio,
      isAdmin: overrides.isAdmin || false,
    };

    await pool.query(
      `INSERT INTO users (id, github_id, username, display_name, avatar_url, bio, is_admin)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [user.id, user.githubId, user.username, user.displayName, user.avatarUrl, user.bio, user.isAdmin]
    );

    return user;
  },

  /**
   * Create a test shot
   */
  async createShot(userId: string, overrides: Partial<Omit<TestShot, 'userId'>> = {}): Promise<TestShot> {
    const pool = getTestPool();
    const shot: TestShot = {
      id: overrides.id || randomUUID(),
      userId,
      prompt: overrides.prompt || 'Test prompt for shot',
      imageUrl: overrides.imageUrl || 'https://example.com/test-image.jpg',
      imageKey: overrides.imageKey || `shots/${userId}/${randomUUID()}.jpg`,
      caption: overrides.caption,
      resultType: overrides.resultType || 'image',
      challengeId: overrides.challengeId,
      createdAt: overrides.createdAt || new Date(),
    };

    await pool.query(
      `INSERT INTO shots (id, user_id, prompt, image_url, image_key, caption, result_type, challenge_id, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [shot.id, shot.userId, shot.prompt, shot.imageUrl, shot.imageKey, shot.caption, shot.resultType, shot.challengeId, shot.createdAt]
    );

    return shot;
  },

  /**
   * Create a test comment
   */
  async createComment(shotId: string, userId: string, content: string): Promise<TestComment> {
    const pool = getTestPool();
    const id = randomUUID();
    const createdAt = new Date();

    await pool.query(
      `INSERT INTO comments (id, shot_id, user_id, content, created_at)
       VALUES ($1, $2, $3, $4, $5)`,
      [id, shotId, userId, content, createdAt]
    );

    return { id, shotId, userId, content, createdAt };
  },

  /**
   * Create a follow relationship
   */
  async createFollow(followerId: string, followingId: string): Promise<void> {
    const pool = getTestPool();
    await pool.query(
      `INSERT INTO follows (follower_id, following_id)
       VALUES ($1, $2)`,
      [followerId, followingId]
    );
  },

  /**
   * Create a sparkle reaction on a shot
   */
  async createReaction(shotId: string, userId: string): Promise<string> {
    const pool = getTestPool();
    const id = randomUUID();

    await pool.query(
      `INSERT INTO reactions (id, shot_id, user_id)
       VALUES ($1, $2, $3)`,
      [id, shotId, userId]
    );

    return id;
  },

  /**
   * Create a test challenge
   */
  async createChallenge(overrides: Partial<TestChallenge> = {}): Promise<TestChallenge> {
    const pool = getTestPool();
    const now = new Date();
    const challenge: TestChallenge = {
      id: overrides.id || randomUUID(),
      title: overrides.title || 'Test Challenge',
      description: overrides.description || 'A test challenge description',
      createdBy: overrides.createdBy,
      isOfficial: overrides.isOfficial ?? false,
      startsAt: overrides.startsAt || new Date(now.getTime() - 24 * 60 * 60 * 1000), // Yesterday
      endsAt: overrides.endsAt || new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000), // Next week
      votingEndsAt: overrides.votingEndsAt,
    };

    await pool.query(
      `INSERT INTO challenges (id, title, description, created_by, is_official, starts_at, ends_at, voting_ends_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [challenge.id, challenge.title, challenge.description, challenge.createdBy, challenge.isOfficial, challenge.startsAt, challenge.endsAt, challenge.votingEndsAt]
    );

    return challenge;
  },

  /**
   * Create a challenge vote
   */
  async createChallengeVote(
    shotId: string,
    userId: string,
    scores: { creativity: number; usefulness: number; quality: number }
  ): Promise<string> {
    const pool = getTestPool();
    const id = randomUUID();

    await pool.query(
      `INSERT INTO challenge_votes (id, shot_id, user_id, creativity_score, usefulness_score, quality_score)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [id, shotId, userId, scores.creativity, scores.usefulness, scores.quality]
    );

    return id;
  },

  /**
   * Create a test report
   */
  async createReport(reporterId: string, overrides: Partial<Omit<TestReport, 'reporterId'>> = {}): Promise<TestReport> {
    const pool = getTestPool();
    const report: TestReport = {
      id: overrides.id || randomUUID(),
      reporterId,
      reportedUserId: overrides.reportedUserId,
      reportedShotId: overrides.reportedShotId,
      reportedCommentId: overrides.reportedCommentId,
      reason: overrides.reason || 'spam',
      details: overrides.details,
      status: overrides.status || 'pending',
    };

    await pool.query(
      `INSERT INTO reports (id, reporter_id, reported_user_id, reported_shot_id, reported_comment_id, reason, details, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [report.id, report.reporterId, report.reportedUserId, report.reportedShotId, report.reportedCommentId, report.reason, report.details, report.status]
    );

    return report;
  },

  /**
   * Create a refresh token session
   */
  async createRefreshToken(userId: string, tokenHash: string, expiresAt?: Date): Promise<string> {
    const pool = getTestPool();
    const id = randomUUID();
    const expires = expiresAt || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    await pool.query(
      `INSERT INTO sessions (id, user_id, refresh_token_hash, expires_at)
       VALUES ($1, $2, $3, $4)`,
      [id, userId, tokenHash, expires]
    );

    return id;
  },
};

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Create multiple users at once
 */
export async function createUsers(count: number): Promise<TestUser[]> {
  const users: TestUser[] = [];
  for (let i = 0; i < count; i++) {
    users.push(await factories.createUser({ username: `testuser_${i}` }));
  }
  return users;
}

/**
 * Create multiple shots for a user
 */
export async function createShots(userId: string, count: number): Promise<TestShot[]> {
  const shots: TestShot[] = [];
  for (let i = 0; i < count; i++) {
    // Stagger creation times for pagination testing
    const createdAt = new Date(Date.now() - i * 60000); // Each shot 1 minute apart
    shots.push(await factories.createShot(userId, { prompt: `Shot ${i}`, createdAt }));
  }
  return shots;
}

/**
 * Get raw data from a table (for verification in tests)
 */
export async function getRawData<T>(table: string, id: string): Promise<T | null> {
  const pool = getTestPool();
  const result = await pool.query(`SELECT * FROM ${table} WHERE id = $1`, [id]);
  return result.rows[0] as T | null;
}
