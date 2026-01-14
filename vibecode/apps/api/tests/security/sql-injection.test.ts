import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { buildTestApp, generateTestToken, parseBody } from '../setup/app.js';
import { factories } from '../setup/fixtures.js';

describe('SQL Injection Security', () => {
  let app: FastifyInstance;

  beforeEach(async () => {
    app = await buildTestApp({ withRoutes: true });
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  // Common SQL injection payloads to test
  const sqlInjectionPayloads = [
    // Basic injection attempts
    "'; DROP TABLE users; --",
    "1' OR '1'='1",
    "1; SELECT * FROM users WHERE '1'='1",
    "' UNION SELECT * FROM users --",
    "'; UPDATE users SET is_admin=true WHERE '1'='1",
    "1') OR ('1'='1",
    "' OR 1=1--",
    "admin'--",
    "' OR ''='",
    "'; TRUNCATE TABLE shots; --",

    // Advanced injection attempts
    "1; WAITFOR DELAY '0:0:5'--",
    "1' AND SLEEP(5)--",
    "1'; EXEC xp_cmdshell('dir')--",
    "1' AND 1=CONVERT(int, (SELECT TOP 1 username FROM users))--",
    "1' UNION SELECT NULL, username, password FROM users--",
    "1'; INSERT INTO users (username) VALUES ('hacker')--",
    "' OR EXISTS(SELECT * FROM users WHERE is_admin=true)--",

    // Blind SQL injection
    "1' AND SUBSTRING(@@version,1,1)='5",
    "1' AND (SELECT COUNT(*) FROM users) > 0--",

    // PostgreSQL specific
    "1'; SELECT pg_sleep(5);--",
    "1' UNION SELECT null, null, string_agg(username, ',') FROM users--",
    "1'; COPY users TO '/tmp/users.csv';--",
  ];

  describe('User lookup endpoints', () => {
    sqlInjectionPayloads.forEach((payload) => {
      it(`should safely handle username lookup: ${payload.slice(0, 40)}...`, async () => {
        const response = await app.inject({
          method: 'GET',
          url: `/users/${encodeURIComponent(payload)}`,
        });

        // Should return 404 (not found), not 500 (SQL error)
        expect(response.statusCode).not.toBe(500);
        expect([400, 404]).toContain(response.statusCode);
      });
    });
  });

  describe('Shot lookup endpoints', () => {
    sqlInjectionPayloads.forEach((payload) => {
      it(`should safely handle shot ID: ${payload.slice(0, 40)}...`, async () => {
        const response = await app.inject({
          method: 'GET',
          url: `/shots/${encodeURIComponent(payload)}`,
        });

        // Should return 400 (bad request) or 404, not 500
        expect(response.statusCode).not.toBe(500);
      });
    });
  });

  describe('Query parameter injection', () => {
    it('should handle malicious cursor parameter', async () => {
      for (const payload of sqlInjectionPayloads.slice(0, 5)) {
        const response = await app.inject({
          method: 'GET',
          url: `/shots?cursor=${encodeURIComponent(payload)}`,
        });

        expect(response.statusCode).not.toBe(500);
      }
    });

    it('should handle malicious limit parameter', async () => {
      const maliciousLimits = [
        "1; DROP TABLE shots; --",
        "1 OR 1=1",
        "-1",
        "999999999999",
        "abc",
        "1.5",
      ];

      for (const limit of maliciousLimits) {
        const response = await app.inject({
          method: 'GET',
          url: `/shots?limit=${encodeURIComponent(limit)}`,
        });

        expect(response.statusCode).not.toBe(500);
      }
    });

    it('should handle malicious sort parameter', async () => {
      const maliciousSorts = [
        "recent; DROP TABLE shots;--",
        "popular' OR '1'='1",
        "1 UNION SELECT * FROM users",
        "../../../etc/passwd",
      ];

      for (const sort of maliciousSorts) {
        const response = await app.inject({
          method: 'GET',
          url: `/shots?sort=${encodeURIComponent(sort)}`,
        });

        expect(response.statusCode).not.toBe(500);
      }
    });
  });

  describe('User-generated content storage', () => {
    let user: { id: string; username: string };
    let token: string;

    beforeEach(async () => {
      user = await factories.createUser();
      token = generateTestToken(app, { userId: user.id, username: user.username });
    });

    describe('Comments', () => {
      it('should safely store SQL injection payloads in comments', async () => {
        const shot = await factories.createShot(user.id);

        for (const payload of sqlInjectionPayloads.slice(0, 10)) {
          const response = await app.inject({
            method: 'POST',
            url: `/shots/${shot.id}/comments`,
            headers: { Authorization: `Bearer ${token}` },
            payload: { content: payload },
          });

          expect(response.statusCode).toBe(201);

          // Verify the payload was stored safely and can be retrieved
          const getResponse = await app.inject({
            method: 'GET',
            url: `/shots/${shot.id}/comments`,
          });

          expect(getResponse.statusCode).toBe(200);
          const body = parseBody<{ comments: Array<{ content: string }> }>(getResponse);
          const storedComment = body.comments.find((c) => c.content === payload);
          expect(storedComment).toBeDefined();
          expect(storedComment!.content).toBe(payload);
        }
      });
    });

    describe('User bio', () => {
      it('should safely store SQL injection payloads in bio', async () => {
        for (const payload of sqlInjectionPayloads.slice(0, 5)) {
          const response = await app.inject({
            method: 'PATCH',
            url: '/users/me',
            headers: { Authorization: `Bearer ${token}` },
            payload: { bio: payload },
          });

          expect(response.statusCode).toBe(200);

          // Verify stored correctly
          const getResponse = await app.inject({
            method: 'GET',
            url: `/users/${user.username}`,
          });

          const body = parseBody<{ bio: string }>(getResponse);
          expect(body.bio).toBe(payload);
        }
      });
    });

    describe('Shot prompts', () => {
      it('should safely store SQL injection payloads in prompts', async () => {
        for (const payload of sqlInjectionPayloads.slice(0, 5)) {
          const response = await app.inject({
            method: 'POST',
            url: '/shots',
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
            payload: {
              prompt: payload,
              imageUrl: 'https://example.com/img.png',
              imageKey: 'test.png',
            },
          });

          expect(response.statusCode).toBe(201);

          const body = parseBody<{ prompt: string }>(response);
          expect(body.prompt).toBe(payload);
        }
      });
    });
  });

  describe('Report creation', () => {
    let reporter: { id: string; username: string };
    let reportedUser: { id: string };
    let token: string;

    beforeEach(async () => {
      reporter = await factories.createUser();
      reportedUser = await factories.createUser();
      token = generateTestToken(app, { userId: reporter.id, username: reporter.username });
    });

    it('should safely handle SQL injection in report details', async () => {
      for (const payload of sqlInjectionPayloads.slice(0, 5)) {
        const response = await app.inject({
          method: 'POST',
          url: '/reports',
          headers: { Authorization: `Bearer ${token}` },
          payload: {
            reportedUserId: reportedUser.id,
            reason: 'other',
            details: payload,
          },
        });

        expect(response.statusCode).toBe(201);
      }
    });
  });

  describe('Challenge endpoints', () => {
    it('should safely handle SQL injection in challenge ID lookup', async () => {
      for (const payload of sqlInjectionPayloads.slice(0, 5)) {
        const response = await app.inject({
          method: 'GET',
          url: `/challenges/${encodeURIComponent(payload)}`,
        });

        expect(response.statusCode).not.toBe(500);
      }
    });

    it('should safely handle SQL injection in filter parameter', async () => {
      const maliciousFilters = [
        "active; DROP TABLE challenges;--",
        "upcoming' OR '1'='1",
        "all UNION SELECT * FROM users",
      ];

      for (const filter of maliciousFilters) {
        const response = await app.inject({
          method: 'GET',
          url: `/challenges?filter=${encodeURIComponent(filter)}`,
        });

        expect(response.statusCode).not.toBe(500);
      }
    });
  });

  describe('Tag endpoints', () => {
    it('should safely handle SQL injection in tag name', async () => {
      for (const payload of sqlInjectionPayloads.slice(0, 5)) {
        const response = await app.inject({
          method: 'GET',
          url: `/tags/${encodeURIComponent(payload)}/shots`,
        });

        expect(response.statusCode).not.toBe(500);
      }
    });
  });

  describe('Second-order injection prevention', () => {
    it('should not execute injection when data is retrieved', async () => {
      const user = await factories.createUser({ username: "testuser'; DROP TABLE users;--" });

      // Create a shot with the malicious user
      const shot = await factories.createShot(user.id);

      // Retrieving the shot should not execute the username injection
      const response = await app.inject({
        method: 'GET',
        url: `/shots/${shot.id}`,
      });

      expect(response.statusCode).toBe(200);

      // Verify user table still exists
      const usersResponse = await app.inject({
        method: 'GET',
        url: `/users/${encodeURIComponent(user.username)}`,
      });

      // The query might not find due to special chars, but DB should be intact
      expect([200, 404]).toContain(usersResponse.statusCode);
    });
  });
});
