import Fastify from 'fastify';
import type { FastifyInstance } from 'fastify';
import fastifyCookie from '@fastify/cookie';
import fastifyJwt from '@fastify/jwt';
import fastifyMultipart from '@fastify/multipart';
import fastifyRateLimit from '@fastify/rate-limit';
import fastifyCors from '@fastify/cors';
import { vi } from 'vitest';

import { authPlugin } from '../../src/plugins/auth.js';
import { getTestPool } from './setup.js';

// Route imports for integration tests
import { authRoutes } from '../../src/routes/auth/index.js';
import { shotRoutes } from '../../src/routes/shots/index.js';
import { reactionRoutes } from '../../src/routes/reactions/index.js';
import { commentRoutes } from '../../src/routes/shots/comments.js';
import { userRoutes } from '../../src/routes/users/index.js';
import { followRoutes } from '../../src/routes/users/follow.js';
import { presenceRoutes } from '../../src/routes/users/presence.js';
import { uploadRoutes } from '../../src/routes/upload/index.js';
import { challengeRoutes } from '../../src/routes/challenges/index.js';
import { tagRoutes } from '../../src/routes/tags/index.js';
import { activityRoutes } from '../../src/routes/activity/index.js';
import { reportRoutes } from '../../src/routes/reports/index.js';

// ============================================================================
// Mock S3 Client
// ============================================================================

export function createMockS3() {
  return {
    send: vi.fn().mockResolvedValue({}),
  };
}

export const mockS3Config = {
  bucket: 'test-bucket',
  region: 'us-east-1',
  publicUrl: 'https://test-cdn.example.com',
};

// ============================================================================
// Test App Builder
// ============================================================================

export interface BuildTestAppOptions {
  withRoutes?: boolean;
  withRateLimit?: boolean;
  rateLimitMax?: number;
}

/**
 * Build a Fastify instance configured for testing
 */
export async function buildTestApp(options: BuildTestAppOptions = {}): Promise<FastifyInstance> {
  const { withRoutes = false, withRateLimit = true, rateLimitMax = 1000 } = options;

  const app = Fastify({
    logger: false, // Disable logging in tests
  });

  // Register CORS
  await app.register(fastifyCors, {
    origin: true,
    credentials: true,
  });

  // Register cookie support
  await app.register(fastifyCookie, {
    secret: process.env.COOKIE_SECRET || 'test-cookie-secret',
  });

  // Register JWT
  await app.register(fastifyJwt, {
    secret: process.env.JWT_SECRET || 'test-jwt-secret',
    cookie: {
      cookieName: 'access_token',
      signed: false,
    },
  });

  // Register multipart for file uploads
  await app.register(fastifyMultipart, {
    limits: {
      fileSize: 50 * 1024 * 1024, // 50MB max
      files: 1,
    },
  });

  // Register rate limiting (configurable for tests)
  if (withRateLimit) {
    await app.register(fastifyRateLimit, {
      max: rateLimitMax,
      timeWindow: '1 minute',
      keyGenerator: (request) => request.ip,
      errorResponseBuilder: () => ({
        error: 'Too many requests. Please try again later.',
      }),
    });
  }

  // Use test database pool
  app.decorate('db', getTestPool());

  // Register auth plugin (adds authenticate and optionalAuth decorators)
  await app.register(authPlugin);

  // Mock S3 client
  app.decorate('s3', createMockS3());
  app.decorate('s3Config', mockS3Config);

  // Register routes if requested
  if (withRoutes) {
    await app.register(authRoutes, { prefix: '/auth' });
    await app.register(shotRoutes, { prefix: '/shots' });
    await app.register(reactionRoutes, { prefix: '/shots' });
    await app.register(commentRoutes, { prefix: '/shots' });
    await app.register(userRoutes, { prefix: '/users' });
    await app.register(followRoutes, { prefix: '/users' });
    await app.register(presenceRoutes, { prefix: '/users' });
    await app.register(uploadRoutes, { prefix: '/upload' });
    await app.register(challengeRoutes, { prefix: '/challenges' });
    await app.register(tagRoutes, { prefix: '/tags' });
    await app.register(activityRoutes, { prefix: '/activity' });
    await app.register(reportRoutes, { prefix: '/reports' });

    // Health check endpoint
    app.get('/health', async () => {
      return { status: 'ok', timestamp: new Date().toISOString() };
    });
  }

  return app;
}

// ============================================================================
// JWT Token Helpers
// ============================================================================

export interface TokenPayload {
  userId: string;
  username: string;
}

/**
 * Generate a valid access token for testing
 */
export function generateTestToken(app: FastifyInstance, payload: TokenPayload): string {
  return app.jwt.sign(
    {
      userId: payload.userId,
      username: payload.username,
      type: 'access',
    },
    { expiresIn: '1h' }
  );
}

/**
 * Generate a valid refresh token for testing
 */
export function generateRefreshToken(app: FastifyInstance, payload: TokenPayload): string {
  return app.jwt.sign(
    {
      userId: payload.userId,
      username: payload.username,
      type: 'refresh',
    },
    { expiresIn: '7d' }
  );
}

/**
 * Generate an expired token for testing
 */
export function generateExpiredToken(app: FastifyInstance, payload: TokenPayload): string {
  return app.jwt.sign(
    {
      userId: payload.userId,
      username: payload.username,
      type: 'access',
    },
    { expiresIn: '-1h' }
  );
}

/**
 * Create a request with authorization header
 */
export function authorizedRequest(token: string) {
  return {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  };
}

// ============================================================================
// Request Helpers
// ============================================================================

export interface InjectOptions {
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  url: string;
  payload?: Record<string, unknown>;
  headers?: Record<string, string>;
  cookies?: Record<string, string>;
}

/**
 * Helper to make authenticated requests
 */
export async function authenticatedRequest(
  app: FastifyInstance,
  options: InjectOptions,
  user: TokenPayload
) {
  const token = generateTestToken(app, user);

  return app.inject({
    method: options.method,
    url: options.url,
    payload: options.payload,
    headers: {
      ...options.headers,
      Authorization: `Bearer ${token}`,
    },
    cookies: options.cookies,
  });
}

/**
 * Helper to make unauthenticated requests
 */
export async function request(app: FastifyInstance, options: InjectOptions) {
  return app.inject({
    method: options.method,
    url: options.url,
    payload: options.payload,
    headers: options.headers,
    cookies: options.cookies,
  });
}

// ============================================================================
// Response Helpers
// ============================================================================

/**
 * Parse JSON response body
 */
export function parseBody<T>(response: { body: string }): T {
  return JSON.parse(response.body) as T;
}

/**
 * Assert successful response (2xx status)
 */
export function assertSuccess(response: { statusCode: number }) {
  if (response.statusCode < 200 || response.statusCode >= 300) {
    throw new Error(`Expected success status, got ${response.statusCode}`);
  }
}

/**
 * Assert error response with specific status
 */
export function assertError(response: { statusCode: number }, expectedStatus: number) {
  if (response.statusCode !== expectedStatus) {
    throw new Error(`Expected status ${expectedStatus}, got ${response.statusCode}`);
  }
}
