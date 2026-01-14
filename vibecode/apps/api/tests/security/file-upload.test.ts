import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { buildTestApp, generateTestToken, parseBody } from '../setup/app.js';
import { factories } from '../setup/fixtures.js';

describe('File Upload Security', () => {
  let app: FastifyInstance;
  let user: { id: string; username: string };
  let token: string;

  beforeEach(async () => {
    app = await buildTestApp({ withRoutes: true });
    await app.ready();
    user = await factories.createUser();
    token = generateTestToken(app, { userId: user.id, username: user.username });
  });

  afterAll(async () => {
    await app.close();
  });

  describe('Presigned URL generation', () => {
    describe('Content type validation', () => {
      const allowedTypes = [
        { contentType: 'image/jpeg', extension: '.jpg' },
        { contentType: 'image/png', extension: '.png' },
        { contentType: 'image/gif', extension: '.gif' },
        { contentType: 'image/webp', extension: '.webp' },
        { contentType: 'video/mp4', extension: '.mp4' },
        { contentType: 'video/webm', extension: '.webm' },
        { contentType: 'video/quicktime', extension: '.mov' },
      ];

      allowedTypes.forEach(({ contentType, extension }) => {
        it(`should allow ${contentType} files`, async () => {
          const response = await app.inject({
            method: 'POST',
            url: '/upload/presigned',
            headers: { Authorization: `Bearer ${token}` },
            payload: {
              fileName: `test${extension}`,
              contentType,
              fileSize: 1024 * 1024, // 1MB
            },
          });

          expect(response.statusCode).toBe(200);
          const body = parseBody<{ uploadUrl: string; fileKey: string }>(response);
          expect(body.uploadUrl).toBeDefined();
          expect(body.fileKey).toBeDefined();
        });
      });

      const disallowedTypes = [
        { contentType: 'application/javascript', extension: '.js' },
        { contentType: 'text/html', extension: '.html' },
        { contentType: 'application/x-php', extension: '.php' },
        { contentType: 'application/x-executable', extension: '.exe' },
        { contentType: 'application/x-sh', extension: '.sh' },
        { contentType: 'text/x-python', extension: '.py' },
        { contentType: 'application/java-archive', extension: '.jar' },
        { contentType: 'application/x-httpd-php', extension: '.phtml' },
        { contentType: 'application/octet-stream', extension: '.bin' },
        { contentType: 'application/pdf', extension: '.pdf' },
        { contentType: 'application/zip', extension: '.zip' },
        { contentType: 'text/plain', extension: '.txt' },
        { contentType: 'application/xml', extension: '.xml' },
        { contentType: 'image/svg+xml', extension: '.svg' }, // SVG can contain scripts
      ];

      disallowedTypes.forEach(({ contentType, extension }) => {
        it(`should reject ${contentType} files`, async () => {
          const response = await app.inject({
            method: 'POST',
            url: '/upload/presigned',
            headers: { Authorization: `Bearer ${token}` },
            payload: {
              fileName: `malicious${extension}`,
              contentType,
              fileSize: 1024,
            },
          });

          expect(response.statusCode).toBe(400);
          const body = parseBody<{ error: string }>(response);
          expect(body.error).toBeDefined();
        });
      });
    });

    describe('File size validation', () => {
      it('should reject files exceeding 50MB limit', async () => {
        const response = await app.inject({
          method: 'POST',
          url: '/upload/presigned',
          headers: { Authorization: `Bearer ${token}` },
          payload: {
            fileName: 'large-file.mp4',
            contentType: 'video/mp4',
            fileSize: 51 * 1024 * 1024, // 51MB
          },
        });

        expect(response.statusCode).toBe(400);
        const body = parseBody<{ error: string }>(response);
        expect(body.error).toContain('size');
      });

      it('should accept files at exactly 50MB', async () => {
        const response = await app.inject({
          method: 'POST',
          url: '/upload/presigned',
          headers: { Authorization: `Bearer ${token}` },
          payload: {
            fileName: 'max-size-file.mp4',
            contentType: 'video/mp4',
            fileSize: 50 * 1024 * 1024, // Exactly 50MB
          },
        });

        expect(response.statusCode).toBe(200);
      });

      it('should reject zero-byte files', async () => {
        const response = await app.inject({
          method: 'POST',
          url: '/upload/presigned',
          headers: { Authorization: `Bearer ${token}` },
          payload: {
            fileName: 'empty.jpg',
            contentType: 'image/jpeg',
            fileSize: 0,
          },
        });

        expect(response.statusCode).toBe(400);
      });

      it('should reject negative file sizes', async () => {
        const response = await app.inject({
          method: 'POST',
          url: '/upload/presigned',
          headers: { Authorization: `Bearer ${token}` },
          payload: {
            fileName: 'negative.jpg',
            contentType: 'image/jpeg',
            fileSize: -1,
          },
        });

        expect(response.statusCode).toBe(400);
      });
    });

    describe('File name validation', () => {
      it('should handle path traversal attempts in filename', async () => {
        const maliciousNames = [
          '../../../etc/passwd',
          '..\\..\\..\\windows\\system32\\config\\sam',
          'test/../../../etc/passwd.jpg',
          'test/../../secret.jpg',
          '....//....//....//etc/passwd',
          '%2e%2e%2f%2e%2e%2f%2e%2e%2fetc%2fpasswd',
          '..%c0%af..%c0%af..%c0%afetc%c0%afpasswd',
        ];

        for (const fileName of maliciousNames) {
          const response = await app.inject({
            method: 'POST',
            url: '/upload/presigned',
            headers: { Authorization: `Bearer ${token}` },
            payload: {
              fileName,
              contentType: 'image/jpeg',
              fileSize: 1024,
            },
          });

          // Should either sanitize the name or reject
          if (response.statusCode === 200) {
            const body = parseBody<{ fileKey: string }>(response);
            // File key should not contain path traversal
            expect(body.fileKey).not.toContain('..');
            expect(body.fileKey).not.toContain('etc/passwd');
          } else {
            expect(response.statusCode).toBe(400);
          }
        }
      });

      it('should handle null bytes in filename', async () => {
        const response = await app.inject({
          method: 'POST',
          url: '/upload/presigned',
          headers: { Authorization: `Bearer ${token}` },
          payload: {
            fileName: 'test.jpg\x00.php',
            contentType: 'image/jpeg',
            fileSize: 1024,
          },
        });

        // Should either sanitize or reject
        expect(response.statusCode).not.toBe(500);
      });

      it('should handle very long filenames', async () => {
        const longName = 'a'.repeat(1000) + '.jpg';

        const response = await app.inject({
          method: 'POST',
          url: '/upload/presigned',
          headers: { Authorization: `Bearer ${token}` },
          payload: {
            fileName: longName,
            contentType: 'image/jpeg',
            fileSize: 1024,
          },
        });

        // Should either truncate or reject, not error
        expect(response.statusCode).not.toBe(500);
      });

      it('should handle special characters in filename', async () => {
        const specialNames = [
          'file with spaces.jpg',
          'file<script>alert(1)</script>.jpg',
          'file"quotes".jpg',
          "file'quotes'.jpg",
          'file;semicolon.jpg',
          'file|pipe.jpg',
          'file&ampersand.jpg',
          'file`backtick`.jpg',
        ];

        for (const fileName of specialNames) {
          const response = await app.inject({
            method: 'POST',
            url: '/upload/presigned',
            headers: { Authorization: `Bearer ${token}` },
            payload: {
              fileName,
              contentType: 'image/jpeg',
              fileSize: 1024,
            },
          });

          // Should handle gracefully
          expect(response.statusCode).not.toBe(500);
        }
      });
    });

    describe('Content type spoofing prevention', () => {
      it('should not trust file extension alone for content type', async () => {
        // Attempting to upload executable with image extension
        const response = await app.inject({
          method: 'POST',
          url: '/upload/presigned',
          headers: { Authorization: `Bearer ${token}` },
          payload: {
            fileName: 'malware.exe.jpg', // Disguised executable
            contentType: 'image/jpeg', // Claiming to be image
            fileSize: 1024,
          },
        });

        // Should allow based on claimed content type
        // Real validation should happen on S3/CDN level
        expect(response.statusCode).toBe(200);

        // Note: Full protection requires server-side content type detection
        // after upload, which should be tested in integration tests
      });

      it('should handle mismatch between extension and content type', async () => {
        const mismatches = [
          { fileName: 'test.jpg', contentType: 'video/mp4' },
          { fileName: 'test.mp4', contentType: 'image/jpeg' },
          { fileName: 'test.gif', contentType: 'image/png' },
        ];

        for (const { fileName, contentType } of mismatches) {
          const response = await app.inject({
            method: 'POST',
            url: '/upload/presigned',
            headers: { Authorization: `Bearer ${token}` },
            payload: {
              fileName,
              contentType,
              fileSize: 1024,
            },
          });

          // Should accept based on content type (extension is unreliable)
          expect(response.statusCode).toBe(200);
        }
      });
    });
  });

  describe('Multipart upload validation', () => {
    it('should require authentication for multipart uploads', async () => {
      // Create a minimal multipart request
      const boundary = '----WebKitFormBoundary7MA4YWxkTrZu0gW';
      const body = [
        `--${boundary}`,
        'Content-Disposition: form-data; name="file"; filename="test.jpg"',
        'Content-Type: image/jpeg',
        '',
        'fake image content',
        `--${boundary}`,
        'Content-Disposition: form-data; name="prompt"',
        '',
        'Test prompt',
        `--${boundary}--`,
      ].join('\r\n');

      const response = await app.inject({
        method: 'POST',
        url: '/shots',
        headers: {
          'Content-Type': `multipart/form-data; boundary=${boundary}`,
        },
        payload: body,
      });

      expect(response.statusCode).toBe(401);
    });
  });

  describe('URL injection in imageUrl field', () => {
    const maliciousUrls = [
      'javascript:alert(1)',
      'data:text/html,<script>alert(1)</script>',
      'file:///etc/passwd',
      'ftp://evil.com/malware.exe',
      'http://169.254.169.254/latest/meta-data/', // AWS metadata endpoint
      'http://localhost:3001/admin', // Internal service
      'http://127.0.0.1:22/', // SSH port scan
      '//evil.com/xss.js', // Protocol-relative URL
    ];

    maliciousUrls.forEach((url) => {
      it(`should handle malicious URL: ${url.slice(0, 30)}...`, async () => {
        const response = await app.inject({
          method: 'POST',
          url: '/shots',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          payload: {
            prompt: 'Test',
            imageUrl: url,
            imageKey: 'test.png',
          },
        });

        // Should either reject or store as-is (frontend validation is separate)
        expect(response.statusCode).not.toBe(500);

        // If it was accepted, verify it's stored verbatim
        if (response.statusCode === 201) {
          const body = parseBody<{ imageUrl: string }>(response);
          expect(body.imageUrl).toBe(url);
        }
      });
    });
  });

  describe('Image key validation', () => {
    it('should handle path traversal in imageKey', async () => {
      const maliciousKeys = [
        '../../../etc/passwd',
        'test/../../../secret',
        '..\\..\\..\\windows',
      ];

      for (const imageKey of maliciousKeys) {
        const response = await app.inject({
          method: 'POST',
          url: '/shots',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          payload: {
            prompt: 'Test',
            imageUrl: 'https://example.com/img.png',
            imageKey,
          },
        });

        // Should either sanitize, reject, or store safely
        expect(response.statusCode).not.toBe(500);
      }
    });
  });
});
