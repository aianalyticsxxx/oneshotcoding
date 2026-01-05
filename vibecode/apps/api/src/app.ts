import Fastify from 'fastify';
import type { FastifyInstance } from 'fastify';
import fastifyCookie from '@fastify/cookie';
import fastifyCors from '@fastify/cors';
import fastifyJwt from '@fastify/jwt';

import { dbPlugin } from './plugins/db.js';
import { authPlugin } from './plugins/auth.js';
import { s3Plugin } from './plugins/s3.js';

import { authRoutes } from './routes/auth/index.js';
import { vibeRoutes } from './routes/vibes/index.js';
import { reactionRoutes } from './routes/reactions/index.js';
import { userRoutes } from './routes/users/index.js';
import { uploadRoutes } from './routes/upload/index.js';
import { vibecheckRoutes } from './routes/vibecheck/index.js';

export async function buildApp(): Promise<FastifyInstance> {
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
        origin.endsWith('.vercel.app')
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
    secret: process.env.COOKIE_SECRET || process.env.JWT_SECRET || 'cookie-secret',
  });

  // Register JWT
  await app.register(fastifyJwt, {
    secret: process.env.JWT_SECRET || 'your-super-secret-jwt-key',
    cookie: {
      cookieName: 'access_token',
      signed: false,
    },
  });

  // Register custom plugins
  await app.register(dbPlugin);
  await app.register(authPlugin);
  await app.register(s3Plugin);

  // Register routes
  await app.register(authRoutes, { prefix: '/auth' });
  await app.register(vibeRoutes, { prefix: '/vibes' });
  await app.register(reactionRoutes, { prefix: '/vibes' });
  await app.register(userRoutes, { prefix: '/users' });
  await app.register(uploadRoutes, { prefix: '/upload' });
  await app.register(vibecheckRoutes, { prefix: '/vibecheck' });

  // Health check endpoint
  app.get('/health', async () => {
    return { status: 'ok', timestamp: new Date().toISOString() };
  });

  return app;
}
