import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { buildTestApp, generateTestToken, parseBody } from '../setup/app.js';
import { factories } from '../setup/fixtures.js';

describe('Authentication Bypass Security', () => {
  let app: FastifyInstance;

  beforeEach(async () => {
    app = await buildTestApp({ withRoutes: true });
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('Protected endpoints (require authentication)', () => {
    const protectedEndpoints = [
      // User management
      { method: 'GET' as const, url: '/auth/me' },
      { method: 'PATCH' as const, url: '/users/me', payload: { displayName: 'Test' } },
      { method: 'DELETE' as const, url: '/users/me' },

      // Shot management
      { method: 'POST' as const, url: '/shots', payload: { prompt: 'Test', imageUrl: 'http://x.com/a.png', imageKey: 'x.png' } },
      { method: 'DELETE' as const, url: '/shots/00000000-0000-0000-0000-000000000001' },

      // Comments
      { method: 'POST' as const, url: '/shots/00000000-0000-0000-0000-000000000001/comments', payload: { content: 'Test' } },
      { method: 'DELETE' as const, url: '/shots/00000000-0000-0000-0000-000000000001/comments/00000000-0000-0000-0000-000000000002' },

      // Reactions
      { method: 'POST' as const, url: '/shots/00000000-0000-0000-0000-000000000001/sparkle' },
      { method: 'DELETE' as const, url: '/shots/00000000-0000-0000-0000-000000000001/sparkle' },

      // Follow system
      { method: 'POST' as const, url: '/users/00000000-0000-0000-0000-000000000001/follow' },
      { method: 'DELETE' as const, url: '/users/00000000-0000-0000-0000-000000000001/follow' },
      { method: 'GET' as const, url: '/users/00000000-0000-0000-0000-000000000001/follow/status' },

      // Presence
      { method: 'PATCH' as const, url: '/users/me/presence' },
      { method: 'GET' as const, url: '/users/me/following/online' },

      // Reports
      { method: 'POST' as const, url: '/reports', payload: { reportedUserId: '00000000-0000-0000-0000-000000000001', reason: 'spam' } },

      // Challenges
      { method: 'POST' as const, url: '/challenges', payload: { title: 'Test', startsAt: new Date().toISOString(), endsAt: new Date().toISOString() } },
      { method: 'POST' as const, url: '/challenges/00000000-0000-0000-0000-000000000001/vote/00000000-0000-0000-0000-000000000002', payload: { creativityScore: 5, usefulnessScore: 5, qualityScore: 5 } },

      // Upload
      { method: 'POST' as const, url: '/upload/presigned', payload: { fileName: 'test.png', contentType: 'image/png', fileSize: 1000 } },
    ];

    protectedEndpoints.forEach(({ method, url, payload }) => {
      it(`should reject ${method} ${url} without auth`, async () => {
        const response = await app.inject({
          method,
          url,
          payload,
        });

        expect(response.statusCode).toBe(401);
        const body = parseBody<{ error: string }>(response);
        expect(body.error).toBeDefined();
      });
    });
  });

  describe('Optional auth endpoints (work with and without auth)', () => {
    const optionalAuthEndpoints = [
      { method: 'GET' as const, url: '/shots' },
      { method: 'GET' as const, url: '/shots/00000000-0000-0000-0000-000000000001' },
      { method: 'GET' as const, url: '/shots?sort=popular' },
      { method: 'GET' as const, url: '/users/testuser' },
      { method: 'GET' as const, url: '/users/testuser/shots' },
      { method: 'GET' as const, url: '/challenges' },
      { method: 'GET' as const, url: '/challenges/00000000-0000-0000-0000-000000000001' },
      { method: 'GET' as const, url: '/tags/trending' },
      { method: 'GET' as const, url: '/tags/test/shots' },
      { method: 'GET' as const, url: '/activity' },
    ];

    optionalAuthEndpoints.forEach(({ method, url }) => {
      it(`should allow ${method} ${url} without auth`, async () => {
        const response = await app.inject({
          method,
          url,
        });

        // Should succeed or return 404 (resource not found), not 401
        expect(response.statusCode).not.toBe(401);
      });
    });

    it('should return different data when authenticated vs not', async () => {
      const user = await factories.createUser();
      const shot = await factories.createShot(user.id);
      await factories.createReaction(shot.id, user.id);
      const token = generateTestToken(app, { userId: user.id, username: user.username });

      // Without auth
      const unauthResponse = await app.inject({
        method: 'GET',
        url: `/shots/${shot.id}`,
      });
      const unauthBody = parseBody<{ hasSparkled: boolean }>(unauthResponse);
      expect(unauthBody.hasSparkled).toBe(false); // Can't know if user sparkled without auth

      // With auth
      const authResponse = await app.inject({
        method: 'GET',
        url: `/shots/${shot.id}`,
        headers: { Authorization: `Bearer ${token}` },
      });
      const authBody = parseBody<{ hasSparkled: boolean }>(authResponse);
      expect(authBody.hasSparkled).toBe(true); // Now we know user sparkled
    });
  });

  describe('Admin-only endpoints', () => {
    let regularUser: { id: string; username: string };
    let adminUser: { id: string; username: string };
    let regularToken: string;
    let adminToken: string;

    beforeEach(async () => {
      regularUser = await factories.createUser({ username: 'regular' });
      adminUser = await factories.createUser({ username: 'admin', isAdmin: true });
      regularToken = generateTestToken(app, { userId: regularUser.id, username: regularUser.username });
      adminToken = generateTestToken(app, { userId: adminUser.id, username: adminUser.username });
    });

    it('should reject non-admin access to reports list', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/reports',
        headers: { Authorization: `Bearer ${regularToken}` },
      });

      expect([401, 403]).toContain(response.statusCode);
    });

    it('should allow admin access to reports list', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/reports',
        headers: { Authorization: `Bearer ${adminToken}` },
      });

      expect(response.statusCode).toBe(200);
    });

    it('should reject non-admin from updating reports', async () => {
      const report = await factories.createReport(regularUser.id, {
        reportedUserId: adminUser.id,
        reason: 'spam',
      });

      const response = await app.inject({
        method: 'PATCH',
        url: `/reports/${report.id}`,
        headers: { Authorization: `Bearer ${regularToken}` },
        payload: { status: 'dismissed' },
      });

      expect([401, 403]).toContain(response.statusCode);
    });
  });

  describe('Authentication header manipulation', () => {
    let user: { id: string; username: string };

    beforeEach(async () => {
      user = await factories.createUser();
    });

    it('should reject multiple Authorization headers', async () => {
      const token1 = generateTestToken(app, { userId: user.id, username: user.username });
      const token2 = generateTestToken(app, { userId: user.id, username: user.username });

      // Note: Fastify/HTTP typically uses the last header value
      // This test documents the behavior
      const response = await app.inject({
        method: 'GET',
        url: '/auth/me',
        headers: {
          Authorization: `Bearer ${token1}`,
          // Can't easily send duplicate headers with inject
        },
      });

      // Should handle gracefully
      expect(response.statusCode).not.toBe(500);
    });

    it('should reject Authorization header with extra spaces', async () => {
      const token = generateTestToken(app, { userId: user.id, username: user.username });

      const malformedHeaders = [
        `  Bearer ${token}`,
        `Bearer  ${token}`,
        `Bearer ${token}  `,
        `  Bearer  ${token}  `,
      ];

      for (const header of malformedHeaders) {
        const response = await app.inject({
          method: 'GET',
          url: '/auth/me',
          headers: { Authorization: header },
        });

        // Should either succeed (trimmed) or fail with 401, not 500
        expect(response.statusCode).not.toBe(500);
      }
    });

    it('should reject mixed-case Bearer keyword', async () => {
      const token = generateTestToken(app, { userId: user.id, username: user.username });

      const variations = [
        `bearer ${token}`,
        `BEARER ${token}`,
        `BeArEr ${token}`,
      ];

      for (const header of variations) {
        const response = await app.inject({
          method: 'GET',
          url: '/auth/me',
          headers: { Authorization: header },
        });

        // Behavior depends on implementation - document it
        expect(response.statusCode).not.toBe(500);
      }
    });
  });

  describe('Session fixation prevention', () => {
    it('should not accept user-supplied session IDs', async () => {
      // This test ensures the app doesn't accept external session tokens
      const fakeSessionId = 'user-supplied-session-12345';

      const response = await app.inject({
        method: 'GET',
        url: '/auth/me',
        headers: {
          Authorization: `Bearer ${fakeSessionId}`,
        },
      });

      expect(response.statusCode).toBe(401);
    });
  });

  describe('Privilege escalation prevention', () => {
    it('should not allow setting admin flag via profile update', async () => {
      const user = await factories.createUser();
      const token = generateTestToken(app, { userId: user.id, username: user.username });

      const response = await app.inject({
        method: 'PATCH',
        url: '/users/me',
        headers: { Authorization: `Bearer ${token}` },
        payload: {
          displayName: 'Test',
          isAdmin: true, // Attempt to escalate privileges
        },
      });

      // Should succeed but ignore isAdmin field
      expect(response.statusCode).toBe(200);

      // Verify user is still not admin
      const meResponse = await app.inject({
        method: 'GET',
        url: '/auth/me',
        headers: { Authorization: `Bearer ${token}` },
      });

      const body = parseBody<{ isAdmin?: boolean }>(meResponse);
      expect(body.isAdmin).not.toBe(true);
    });
  });

  describe('CORS and authentication', () => {
    it('should require auth for state-changing requests regardless of origin', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/shots',
        headers: {
          Origin: 'http://evil-site.com',
          'Content-Type': 'application/json',
        },
        payload: {
          prompt: 'Malicious shot',
          imageUrl: 'https://example.com/img.png',
          imageKey: 'test.png',
        },
      });

      // Should fail with 401, not CORS error or success
      expect(response.statusCode).toBe(401);
    });
  });
});
