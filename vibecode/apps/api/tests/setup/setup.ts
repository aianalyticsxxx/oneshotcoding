import { beforeAll, afterAll, afterEach, vi } from 'vitest';
import pg from 'pg';

const { Pool } = pg;

let testPool: pg.Pool | null = null;

/**
 * Get or create the test database pool
 */
export function getTestPool(): pg.Pool {
  if (!testPool) {
    testPool = new Pool({
      connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/oneshotcoding_test',
      max: 5,
    });
  }
  return testPool;
}

/**
 * Clean up test data from all tables
 */
async function cleanupTestData(): Promise<void> {
  const pool = getTestPool();

  // Truncate all tables in correct order due to foreign key constraints
  await pool.query(`
    TRUNCATE TABLE
      reports,
      challenge_votes,
      shot_tags,
      tags,
      comments,
      reactions,
      shots,
      follows,
      challenges,
      refresh_tokens,
      sessions,
      users
    CASCADE
  `);
}

// Set required environment variables for tests
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-jwt-secret-key-for-testing';
process.env.COOKIE_SECRET = process.env.COOKIE_SECRET || 'test-cookie-secret-key-for-testing';
process.env.NODE_ENV = 'test';

beforeAll(async () => {
  // Initialize test database pool and verify connection
  const pool = getTestPool();
  try {
    await pool.query('SELECT 1');
    // Clean up any leftover data from previous test runs
    await cleanupTestData();
  } catch (error) {
    console.error('Failed to connect to test database:', error);
    throw error;
  }
});

afterEach(async () => {
  // Clean up test data between tests
  await cleanupTestData();
  vi.clearAllMocks();
});

afterAll(async () => {
  // Close the database pool
  if (testPool) {
    await testPool.end();
    testPool = null;
  }
});

// Re-export vi for convenience
export { vi };
