import type { FastifyInstance } from 'fastify';

interface GitHubUserData {
  githubId: string;
  username: string;
  displayName: string;
  avatarUrl?: string;
  email?: string;
}

interface TokenPayload {
  userId: string;
  username: string;
}

interface User {
  id: string;
  githubId: string;
  username: string;
  displayName: string;
  avatarUrl?: string;
  email?: string;
}

interface OAuthAccount {
  id: string;
  userId: string;
  provider: string;
  providerId: string;
  providerUsername: string | null;
  createdAt: string;
}

type OAuthProvider = 'github' | 'twitter';

export class AuthService {
  constructor(private fastify: FastifyInstance) {}

  /**
   * Find user by OAuth provider credentials
   */
  async findUserByOAuthProvider(provider: OAuthProvider, providerId: string): Promise<User | null> {
    const result = await this.fastify.db.query(
      `SELECT u.id, u.username, u.display_name, u.avatar_url, u.email
       FROM users u
       JOIN oauth_accounts oa ON u.id = oa.user_id
       WHERE oa.provider = $1 AND oa.provider_id = $2`,
      [provider, providerId]
    );

    if (result.rows.length === 0) return null;

    const user = result.rows[0];
    return {
      id: user.id,
      githubId: '', // deprecated, kept for interface compat
      username: user.username,
      displayName: user.display_name,
      avatarUrl: user.avatar_url,
      email: user.email,
    };
  }

  /**
   * Create a new user from OAuth data (used when no existing account found)
   */
  async createUserFromOAuth(
    provider: OAuthProvider,
    providerId: string,
    username: string,
    displayName: string,
    avatarUrl?: string,
    email?: string
  ): Promise<User> {
    const client = await this.fastify.db.connect();

    try {
      await client.query('BEGIN');

      // Create user
      const userResult = await client.query(
        `INSERT INTO users (username, display_name, avatar_url, email)
         VALUES ($1, $2, $3, $4)
         RETURNING id, username, display_name, avatar_url, email`,
        [username, displayName, avatarUrl, email]
      );

      const user = userResult.rows[0];

      // Create oauth account link
      await client.query(
        `INSERT INTO oauth_accounts (user_id, provider, provider_id, provider_username)
         VALUES ($1, $2, $3, $4)`,
        [user.id, provider, providerId, username]
      );

      await client.query('COMMIT');

      return {
        id: user.id,
        githubId: '',
        username: user.username,
        displayName: user.display_name,
        avatarUrl: user.avatar_url,
        email: user.email,
      };
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  /**
   * Link an OAuth account to an existing user
   */
  async upsertOAuthAccount(
    userId: string,
    provider: OAuthProvider,
    providerId: string,
    providerUsername: string
  ): Promise<void> {
    await this.fastify.db.query(
      `INSERT INTO oauth_accounts (user_id, provider, provider_id, provider_username)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (provider, provider_id) DO UPDATE SET
         provider_username = EXCLUDED.provider_username`,
      [userId, provider, providerId, providerUsername]
    );
  }

  /**
   * Get all OAuth accounts linked to a user
   */
  async getUserOAuthAccounts(userId: string): Promise<OAuthAccount[]> {
    const result = await this.fastify.db.query(
      `SELECT id, user_id, provider, provider_id, provider_username, created_at
       FROM oauth_accounts
       WHERE user_id = $1
       ORDER BY created_at ASC`,
      [userId]
    );

    return result.rows.map((row: {
      id: string;
      user_id: string;
      provider: string;
      provider_id: string;
      provider_username: string | null;
      created_at: string;
    }) => ({
      id: row.id,
      userId: row.user_id,
      provider: row.provider,
      providerId: row.provider_id,
      providerUsername: row.provider_username,
      createdAt: row.created_at,
    }));
  }

  /**
   * Unlink an OAuth account from a user (fails if it's the last one)
   */
  async unlinkOAuthAccount(userId: string, provider: OAuthProvider): Promise<boolean> {
    // Check how many accounts are linked
    const countResult = await this.fastify.db.query(
      `SELECT COUNT(*) as count FROM oauth_accounts WHERE user_id = $1`,
      [userId]
    );

    if (parseInt(countResult.rows[0].count) <= 1) {
      return false; // Can't unlink last provider
    }

    await this.fastify.db.query(
      `DELETE FROM oauth_accounts WHERE user_id = $1 AND provider = $2`,
      [userId, provider]
    );

    return true;
  }

  /**
   * Upsert a user from GitHub OAuth data
   */
  async upsertGitHubUser(userData: GitHubUserData): Promise<User> {
    const { githubId, username, displayName, avatarUrl, email } = userData;

    // Check if OAuth account exists
    const existingUser = await this.findUserByOAuthProvider('github', githubId);

    if (existingUser) {
      // Update user profile
      const result = await this.fastify.db.query(
        `UPDATE users SET
           username = $1,
           display_name = COALESCE(display_name, $2),
           avatar_url = $3,
           email = COALESCE($4, email),
           updated_at = NOW()
         WHERE id = $5
         RETURNING id, username, display_name, avatar_url, email`,
        [username, displayName, avatarUrl, email, existingUser.id]
      );

      // Update provider username
      await this.upsertOAuthAccount(existingUser.id, 'github', githubId, username);

      const user = result.rows[0];
      return {
        id: user.id,
        githubId: '',
        username: user.username,
        displayName: user.display_name,
        avatarUrl: user.avatar_url,
        email: user.email,
      };
    }

    // Create new user with OAuth account
    return this.createUserFromOAuth('github', githubId, username, displayName, avatarUrl, email);
  }

  /**
   * Generate access and refresh tokens
   */
  generateTokens(payload: TokenPayload): { accessToken: string; refreshToken: string } {
    const accessExpiry = process.env.JWT_ACCESS_EXPIRY || '15m';
    const refreshExpiry = process.env.JWT_REFRESH_EXPIRY || '1y';

    const accessToken = this.fastify.jwt.sign(
      { ...payload, type: 'access' },
      { expiresIn: accessExpiry }
    );

    const refreshToken = this.fastify.jwt.sign(
      { ...payload, type: 'refresh' },
      { expiresIn: refreshExpiry }
    );

    return { accessToken, refreshToken };
  }

  /**
   * Store refresh token in database
   */
  async storeRefreshToken(userId: string, token: string): Promise<void> {
    const expiresAt = new Date();
    expiresAt.setFullYear(expiresAt.getFullYear() + 1); // 1 year from now

    await this.fastify.db.query(
      `INSERT INTO refresh_tokens (user_id, token, expires_at)
       VALUES ($1, $2, $3)`,
      [userId, token, expiresAt]
    );
  }

  /**
   * Validate that a refresh token exists and is valid
   */
  async validateRefreshToken(userId: string, token: string): Promise<boolean> {
    const result = await this.fastify.db.query(
      `SELECT id FROM refresh_tokens
       WHERE user_id = $1 AND token = $2 AND expires_at > NOW() AND revoked_at IS NULL`,
      [userId, token]
    );

    return result.rows.length > 0;
  }

  /**
   * Rotate refresh token - revoke old one and store new one
   */
  async rotateRefreshToken(userId: string, oldToken: string, newToken: string): Promise<void> {
    // Start a transaction
    const client = await this.fastify.db.connect();

    try {
      await client.query('BEGIN');

      // Revoke old token
      await client.query(
        `UPDATE refresh_tokens SET revoked_at = NOW()
         WHERE user_id = $1 AND token = $2`,
        [userId, oldToken]
      );

      // Store new token
      const expiresAt = new Date();
      expiresAt.setFullYear(expiresAt.getFullYear() + 1);

      await client.query(
        `INSERT INTO refresh_tokens (user_id, token, expires_at)
         VALUES ($1, $2, $3)`,
        [userId, newToken, expiresAt]
      );

      await client.query('COMMIT');
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  /**
   * Revoke all refresh tokens for a user (logout everywhere)
   */
  async revokeAllTokens(userId: string): Promise<void> {
    await this.fastify.db.query(
      `UPDATE refresh_tokens SET revoked_at = NOW()
       WHERE user_id = $1 AND revoked_at IS NULL`,
      [userId]
    );
  }

  /**
   * Clean up expired tokens (call periodically)
   */
  async cleanupExpiredTokens(): Promise<number> {
    const result = await this.fastify.db.query(
      `DELETE FROM refresh_tokens WHERE expires_at < NOW() OR revoked_at IS NOT NULL`
    );

    return result.rowCount ?? 0;
  }
}
