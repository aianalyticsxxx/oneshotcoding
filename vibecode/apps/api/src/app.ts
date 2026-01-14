import Fastify from 'fastify';
import type { FastifyInstance } from 'fastify';
import fastifyCookie from '@fastify/cookie';
import fastifyCors from '@fastify/cors';
import fastifyJwt from '@fastify/jwt';
import fastifyMultipart from '@fastify/multipart';
import fastifyRateLimit from '@fastify/rate-limit';

import { dbPlugin } from './plugins/db.js';
import { authPlugin } from './plugins/auth.js';
import { s3Plugin } from './plugins/s3.js';

import { authRoutes } from './routes/auth/index.js';
import { shotRoutes } from './routes/shots/index.js';
import { reactionRoutes } from './routes/reactions/index.js';
import { commentRoutes } from './routes/shots/comments.js';
import { userRoutes } from './routes/users/index.js';
import { followRoutes } from './routes/users/follow.js';
import { presenceRoutes } from './routes/users/presence.js';
import { uploadRoutes } from './routes/upload/index.js';
import { challengeRoutes } from './routes/challenges/index.js';
import { tagRoutes } from './routes/tags/index.js';
import { activityRoutes } from './routes/activity/index.js';
import { reportRoutes } from './routes/reports/index.js';

export async function buildApp(): Promise<FastifyInstance> {
  // Validate required environment variables
  if (!process.env.JWT_SECRET) {
    throw new Error('JWT_SECRET environment variable is required');
  }
  if (!process.env.COOKIE_SECRET) {
    throw new Error('COOKIE_SECRET environment variable is required');
  }
  const app = Fastify({
    logger: {
      level: process.env.LOG_LEVEL || 'info',
    },
  });

  // Register CORS
  const allowedOrigins = [
    process.env.FRONTEND_URL || 'http://localhost:3000',
    'http://localhost:3000',
    'http://127.0.0.1:3000',
  ].filter(Boolean);

  await app.register(fastifyCors, {
    origin: (origin, callback) => {
      // Allow requests with no origin (mobile apps, curl, etc.)
      if (!origin) {
        callback(null, true);
        return;
      }
      // Check if origin matches allowed list or is a Railway/Vercel domain
      if (
        allowedOrigins.includes(origin) ||
        origin.endsWith('.railway.app') ||
        origin.endsWith('.up.railway.app') ||
        origin.endsWith('.vercel.app') ||
        origin.endsWith('.oneshotcoding.io')
      ) {
        callback(null, true);
      } else {
        callback(null, false);
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  });

  // Register cookie support
  await app.register(fastifyCookie, {
    secret: process.env.COOKIE_SECRET,
  });

  // Register JWT
  await app.register(fastifyJwt, {
    secret: process.env.JWT_SECRET,
    cookie: {
      cookieName: 'access_token',
      signed: false,
    },
  });

  // Register multipart for file uploads
  await app.register(fastifyMultipart, {
    limits: {
      fileSize: 50 * 1024 * 1024, // 50MB max (increased for video uploads)
      files: 1,
    },
  });

  // Register rate limiting
  await app.register(fastifyRateLimit, {
    max: 100,
    timeWindow: '1 minute',
    keyGenerator: (request) => request.ip,
    errorResponseBuilder: () => ({
      error: 'Too many requests. Please try again later.',
    }),
  });

  // Register custom plugins
  await app.register(dbPlugin);
  await app.register(authPlugin);
  await app.register(s3Plugin);

  // Register routes
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

  return app;
}
