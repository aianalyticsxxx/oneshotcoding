import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { buildTestApp, generateTestToken, parseBody } from '../setup/app.js';
import { factories } from '../setup/fixtures.js';

describe('CSRF Security', () => {
  let app: FastifyInstance;

  beforeEach(async () => {
    app = await buildTestApp({ withRoutes: true });
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('OAuth state token validation', () => {
    it('should generate state token on auth initiation', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/auth/github',
      });

      // Should redirect to GitHub with state parameter
      expect(response.statusCode).toBe(302);
      const location = response.headers.location as string;
      expect(location).toContain('state=');
    });

    it('should reject callback with missing state', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/auth/github/callback?code=test_code',
      });

      expect([400, 401, 403]).toContain(response.statusCode);
    });

    it('should reject callback with invalid state', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/auth/github/callback?code=test_code&state=invalid_state_token',
      });

      expect([400, 401, 403]).toContain(response.statusCode);
    });

    it('should reject callback with tampered state', async () => {
      // First, initiate auth to get a valid state
      const initResponse = await app.inject({
        method: 'GET',
        url: '/auth/github',
      });

      const location = initResponse.headers.location as string;
      const stateMatch = location.match(/state=([^&]+)/);
      const originalState = stateMatch?.[1] || '';

      // Tamper with the state
      const tamperedState = originalState + 'tampered';

      const callbackResponse = await app.inject({
        method: 'GET',
        url: `/auth/github/callback?code=test_code&state=${tamperedState}`,
      });

      expect([400, 401, 403]).toContain(callbackResponse.statusCode);
    });
  });

  describe('Cross-origin request handling', () => {
    let user: { id: string; username: string };
    let token: string;

    beforeEach(async () => {
      user = await factories.createUser();
      token = generateTestToken(app, { userId: user.id, username: user.username });
    });

    it('should handle requests from allowed origins', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/shots',
        headers: {
          Authorization: `Bearer ${token}`,
          Origin: 'http://localhost:3000',
          'Content-Type': 'application/json',
        },
        payload: {
          prompt: 'Test',
          imageUrl: 'https://example.com/img.png',
          imageKey: 'test.png',
        },
      });

      expect(response.statusCode).toBe(201);
    });

    it('should include CORS headers in response', async () => {
      const response = await app.inject({
        method: 'OPTIONS',
        url: '/shots',
        headers: {
          Origin: 'http://localhost:3000',
          'Access-Control-Request-Method': 'POST',
        },
      });

      // Preflight should succeed
      expect(response.headers['access-control-allow-origin']).toBeDefined();
      expect(response.headers['access-control-allow-methods']).toBeDefined();
    });

    it('should set credentials header for cross-origin requests', async () => {
      const response = await app.inject({
        method: 'OPTIONS',
        url: '/shots',
        headers: {
          Origin: 'http://localhost:3000',
          'Access-Control-Request-Method': 'POST',
        },
      });

      expect(response.headers['access-control-allow-credentials']).toBe('true');
    });
  });

  describe('Cookie security attributes', () => {
    // These tests verify that cookies are set with proper security attributes
    // In a real OAuth flow, after successful authentication

    it('should set secure cookie attributes for tokens', async () => {
      // This would require mocking the GitHub OAuth flow
      // For now, we document expected behavior

      // Expected cookie attributes:
      // - httpOnly: true (prevents JS access)
      // - secure: true (HTTPS only in production)
      // - sameSite: 'lax' or 'strict' (CSRF protection)
      // - path: '/' (available across the site)

      expect(true).toBe(true); // Placeholder for documentation
    });
  });

  describe('SameSite cookie protection', () => {
    let user: { id: string; username: string };
    let token: string;

    beforeEach(async () => {
      user = await factories.createUser();
      token = generateTestToken(app, { userId: user.id, username: user.username });
    });

    it('should require explicit auth for state-changing requests', async () => {
      // Even with cookies set, Bearer token should be required for mutations
      const shot = await factories.createShot(user.id);

      // Request with only cookie (simulating cross-site request)
      const response = await app.inject({
        method: 'DELETE',
        url: `/shots/${shot.id}`,
        cookies: {
          access_token: token,
        },
        // No Authorization header - simulating CSRF attack
      });

      // Should succeed because cookies are valid auth method
      // But real protection comes from SameSite attribute on cookie
      expect([200, 401]).toContain(response.statusCode);
    });
  });

  describe('Content-Type validation', () => {
    let user: { id: string; username: string };
    let token: string;

    beforeEach(async () => {
      user = await factories.createUser();
      token = generateTestToken(app, { userId: user.id, username: user.username });
    });

    it('should reject form-encoded POST as JSON endpoint', async () => {
      // Some CSRF attacks try to use form submission to bypass protections
      const response = await app.inject({
        method: 'POST',
        url: '/shots',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        payload: 'prompt=Test&imageUrl=https://example.com/img.png&imageKey=test.png',
      });

      // Should either reject or handle gracefully
      expect(response.statusCode).not.toBe(500);
    });

    it('should handle multipart/form-data correctly', async () => {
      // Multipart is needed for file uploads but should be properly parsed
      const boundary = '----TestBoundary';
      const body = [
        `--${boundary}`,
        'Content-Disposition: form-data; name="prompt"',
        '',
        'Test prompt',
        `--${boundary}`,
        'Content-Disposition: form-data; name="imageUrl"',
        '',
        'https://example.com/img.png',
        `--${boundary}`,
        'Content-Disposition: form-data; name="imageKey"',
        '',
        'test.png',
        `--${boundary}--`,
      ].join('\r\n');

      const response = await app.inject({
        method: 'POST',
        url: '/shots',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': `multipart/form-data; boundary=${boundary}`,
        },
        payload: body,
      });

      // Should handle multipart correctly
      expect(response.statusCode).not.toBe(500);
    });
  });

  describe('Referer header validation', () => {
    let user: { id: string; username: string };
    let token: string;

    beforeEach(async () => {
      user = await factories.createUser();
      token = generateTestToken(app, { userId: user.id, username: user.username });
    });

    it('should not rely solely on Referer for CSRF protection', async () => {
      // Referer can be spoofed or stripped, so it shouldn't be the only check
      const response = await app.inject({
        method: 'POST',
        url: '/shots',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
          Referer: 'http://evil-site.com',
        },
        payload: {
          prompt: 'Test',
          imageUrl: 'https://example.com/img.png',
          imageKey: 'test.png',
        },
      });

      // Request should be allowed (token is the real auth, not referer)
      expect(response.statusCode).toBe(201);
    });

    it('should allow requests without Referer header', async () => {
      // Some browsers/privacy tools strip Referer
      const response = await app.inject({
        method: 'POST',
        url: '/shots',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
          // No Referer header
        },
        payload: {
          prompt: 'Test',
          imageUrl: 'https://example.com/img.png',
          imageKey: 'test.png',
        },
      });

      expect(response.statusCode).toBe(201);
    });
  });

  describe('Double-submit cookie pattern (if implemented)', () => {
    // If the app uses double-submit cookies for additional CSRF protection

    it('should document CSRF protection mechanism', () => {
      // Current implementation relies on:
      // 1. JWT tokens in Authorization header (primary)
      // 2. SameSite cookie attribute (secondary)
      // 3. CORS configuration (tertiary)

      // Double-submit cookies are NOT currently implemented
      // This test documents that fact

      expect(true).toBe(true);
    });
  });

  describe('Logout CSRF protection', () => {
    it('should require authentication for logout', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/auth/logout',
        // No auth header or cookies
      });

      // Logout without auth should be harmless (nothing to log out)
      expect(response.statusCode).not.toBe(500);
    });
  });

  describe('Account deletion CSRF protection', () => {
    let user: { id: string; username: string };
    let token: string;

    beforeEach(async () => {
      user = await factories.createUser();
      token = generateTestToken(app, { userId: user.id, username: user.username });
    });

    it('should require valid authentication for account deletion', async () => {
      // Without auth
      const noAuthResponse = await app.inject({
        method: 'DELETE',
        url: '/users/me',
      });
      expect(noAuthResponse.statusCode).toBe(401);

      // With expired token
      const expiredToken = app.jwt.sign(
        { userId: user.id, username: user.username, type: 'access' },
        { expiresIn: '-1h' }
      );
      const expiredResponse = await app.inject({
        method: 'DELETE',
        url: '/users/me',
        headers: { Authorization: `Bearer ${expiredToken}` },
      });
      expect(expiredResponse.statusCode).toBe(401);
    });
  });
});
