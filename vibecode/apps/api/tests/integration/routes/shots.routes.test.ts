import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { buildTestApp, generateTestToken, parseBody } from '../../setup/app.js';
import { factories, createShots } from '../../setup/fixtures.js';

describe('Shots Routes', () => {
  let app: FastifyInstance;

  beforeEach(async () => {
    app = await buildTestApp({ withRoutes: true });
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('GET /shots', () => {
    it('should return feed without authentication', async () => {
      const user = await factories.createUser();
      await factories.createShot(user.id);

      const response = await app.inject({
        method: 'GET',
        url: '/shots',
      });

      expect(response.statusCode).toBe(200);
      const body = parseBody<{ shots: unknown[]; hasMore: boolean }>(response);
      expect(body.shots).toBeInstanceOf(Array);
      expect(body.shots.length).toBe(1);
      expect(body.hasMore).toBe(false);
    });

    it('should paginate with cursor parameter', async () => {
      const user = await factories.createUser();
      await createShots(user.id, 25);

      const page1 = await app.inject({
        method: 'GET',
        url: '/shots?limit=10',
      });

      const body1 = parseBody<{ shots: unknown[]; nextCursor: string; hasMore: boolean }>(page1);
      expect(body1.shots.length).toBe(10);
      expect(body1.hasMore).toBe(true);
      expect(body1.nextCursor).toBeDefined();

      const page2 = await app.inject({
        method: 'GET',
        url: `/shots?limit=10&cursor=${body1.nextCursor}`,
      });

      const body2 = parseBody<{ shots: unknown[]; hasMore: boolean }>(page2);
      expect(body2.shots.length).toBe(10);
    });

    it('should include hasSparkled for authenticated user', async () => {
      const author = await factories.createUser();
      const viewer = await factories.createUser();
      const shot = await factories.createShot(author.id);
      await factories.createReaction(shot.id, viewer.id);

      const token = generateTestToken(app, { userId: viewer.id, username: viewer.username });

      const response = await app.inject({
        method: 'GET',
        url: '/shots',
        headers: { Authorization: `Bearer ${token}` },
      });

      const body = parseBody<{ shots: Array<{ id: string; hasSparkled: boolean }> }>(response);
      const returnedShot = body.shots.find((s) => s.id === shot.id);
      expect(returnedShot?.hasSparkled).toBe(true);
    });

    it('should respect limit parameter', async () => {
      const user = await factories.createUser();
      await createShots(user.id, 10);

      const response = await app.inject({
        method: 'GET',
        url: '/shots?limit=5',
      });

      const body = parseBody<{ shots: unknown[] }>(response);
      expect(body.shots.length).toBe(5);
    });

    it('should enforce maximum limit', async () => {
      const user = await factories.createUser();
      await createShots(user.id, 60);

      const response = await app.inject({
        method: 'GET',
        url: '/shots?limit=100',
      });

      const body = parseBody<{ shots: unknown[] }>(response);
      // Should cap at 50
      expect(body.shots.length).toBeLessThanOrEqual(50);
    });
  });

  describe('GET /shots/:id', () => {
    it('should return shot by ID', async () => {
      const user = await factories.createUser();
      const shot = await factories.createShot(user.id, { prompt: 'Test prompt' });

      const response = await app.inject({
        method: 'GET',
        url: `/shots/${shot.id}`,
      });

      expect(response.statusCode).toBe(200);
      const body = parseBody<{ id: string; prompt: string }>(response);
      expect(body.id).toBe(shot.id);
      expect(body.prompt).toBe('Test prompt');
    });

    it('should return 404 for non-existent shot', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/shots/00000000-0000-0000-0000-000000000000',
      });

      expect(response.statusCode).toBe(404);
    });

    it('should return 400 for invalid UUID', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/shots/not-a-uuid',
      });

      expect([400, 404]).toContain(response.statusCode);
    });
  });

  describe('POST /shots', () => {
    it('should require authentication', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/shots',
        payload: {
          prompt: 'Test',
          imageUrl: 'https://example.com/img.png',
          imageKey: 'test.png',
        },
      });

      expect(response.statusCode).toBe(401);
    });

    it('should create shot with valid data', async () => {
      const user = await factories.createUser();
      const token = generateTestToken(app, { userId: user.id, username: user.username });

      const response = await app.inject({
        method: 'POST',
        url: '/shots',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        payload: {
          prompt: 'Build a dashboard',
          imageUrl: 'https://example.com/result.png',
          imageKey: 'shots/test/result.png',
          caption: 'My creation',
        },
      });

      expect(response.statusCode).toBe(201);
      const body = parseBody<{
        id: string;
        prompt: string;
        caption: string;
        user: { id: string };
      }>(response);
      expect(body.id).toBeDefined();
      expect(body.prompt).toBe('Build a dashboard');
      expect(body.caption).toBe('My creation');
      expect(body.user.id).toBe(user.id);
    });

    it('should require prompt field', async () => {
      const user = await factories.createUser();
      const token = generateTestToken(app, { userId: user.id, username: user.username });

      const response = await app.inject({
        method: 'POST',
        url: '/shots',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        payload: {
          imageUrl: 'https://example.com/result.png',
          imageKey: 'shots/test/result.png',
        },
      });

      expect(response.statusCode).toBe(400);
    });

    it('should create shot with video result type', async () => {
      const user = await factories.createUser();
      const token = generateTestToken(app, { userId: user.id, username: user.username });

      const response = await app.inject({
        method: 'POST',
        url: '/shots',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        payload: {
          prompt: 'Video tutorial',
          imageUrl: 'https://example.com/video.mp4',
          imageKey: 'shots/test/video.mp4',
          resultType: 'video',
        },
      });

      expect(response.statusCode).toBe(201);
      const body = parseBody<{ resultType: string }>(response);
      expect(body.resultType).toBe('video');
    });
  });

  describe('DELETE /shots/:id', () => {
    it('should require authentication', async () => {
      const user = await factories.createUser();
      const shot = await factories.createShot(user.id);

      const response = await app.inject({
        method: 'DELETE',
        url: `/shots/${shot.id}`,
      });

      expect(response.statusCode).toBe(401);
    });

    it('should delete own shot', async () => {
      const user = await factories.createUser();
      const shot = await factories.createShot(user.id);
      const token = generateTestToken(app, { userId: user.id, username: user.username });

      const response = await app.inject({
        method: 'DELETE',
        url: `/shots/${shot.id}`,
        headers: { Authorization: `Bearer ${token}` },
      });

      expect(response.statusCode).toBe(200);

      // Verify deleted
      const getResponse = await app.inject({
        method: 'GET',
        url: `/shots/${shot.id}`,
      });
      expect(getResponse.statusCode).toBe(404);
    });

    it('should not delete another user\'s shot', async () => {
      const owner = await factories.createUser();
      const attacker = await factories.createUser();
      const shot = await factories.createShot(owner.id);
      const token = generateTestToken(app, { userId: attacker.id, username: attacker.username });

      const response = await app.inject({
        method: 'DELETE',
        url: `/shots/${shot.id}`,
        headers: { Authorization: `Bearer ${token}` },
      });

      expect(response.statusCode).toBe(404);

      // Verify not deleted
      const getResponse = await app.inject({
        method: 'GET',
        url: `/shots/${shot.id}`,
      });
      expect(getResponse.statusCode).toBe(200);
    });
  });

  describe('GET /shots?sort=popular', () => {
    it('should sort by sparkle count', async () => {
      const user = await factories.createUser();
      const shot1 = await factories.createShot(user.id, { prompt: 'Less popular' });
      const shot2 = await factories.createShot(user.id, { prompt: 'More popular' });

      // Add sparkles
      const sparkler1 = await factories.createUser();
      const sparkler2 = await factories.createUser();
      const sparkler3 = await factories.createUser();
      await factories.createReaction(shot2.id, sparkler1.id);
      await factories.createReaction(shot2.id, sparkler2.id);
      await factories.createReaction(shot2.id, sparkler3.id);
      await factories.createReaction(shot1.id, sparkler1.id);

      const response = await app.inject({
        method: 'GET',
        url: '/shots?sort=popular',
      });

      expect(response.statusCode).toBe(200);
      const body = parseBody<{ shots: Array<{ id: string }> }>(response);

      // shot2 should come first (3 sparkles vs 1)
      expect(body.shots[0].id).toBe(shot2.id);
    });
  });

  describe('GET /shots/following', () => {
    it('should require authentication', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/shots/following',
      });

      expect(response.statusCode).toBe(401);
    });

    it('should return shots only from followed users', async () => {
      const viewer = await factories.createUser();
      const followedUser = await factories.createUser();
      const notFollowedUser = await factories.createUser();

      await factories.createFollow(viewer.id, followedUser.id);

      const followedShot = await factories.createShot(followedUser.id);
      await factories.createShot(notFollowedUser.id);

      const token = generateTestToken(app, { userId: viewer.id, username: viewer.username });

      const response = await app.inject({
        method: 'GET',
        url: '/shots/following',
        headers: { Authorization: `Bearer ${token}` },
      });

      expect(response.statusCode).toBe(200);
      const body = parseBody<{ shots: Array<{ id: string }> }>(response);
      expect(body.shots.length).toBe(1);
      expect(body.shots[0].id).toBe(followedShot.id);
    });

    it('should return empty when not following anyone', async () => {
      const viewer = await factories.createUser();
      const other = await factories.createUser();
      await factories.createShot(other.id);

      const token = generateTestToken(app, { userId: viewer.id, username: viewer.username });

      const response = await app.inject({
        method: 'GET',
        url: '/shots/following',
        headers: { Authorization: `Bearer ${token}` },
      });

      expect(response.statusCode).toBe(200);
      const body = parseBody<{ shots: unknown[] }>(response);
      expect(body.shots.length).toBe(0);
    });
  });

  describe('POST /shots/:id/sparkle', () => {
    it('should require authentication', async () => {
      const user = await factories.createUser();
      const shot = await factories.createShot(user.id);

      const response = await app.inject({
        method: 'POST',
        url: `/shots/${shot.id}/sparkle`,
      });

      expect(response.statusCode).toBe(401);
    });

    it('should add sparkle to shot', async () => {
      const author = await factories.createUser();
      const viewer = await factories.createUser();
      const shot = await factories.createShot(author.id);
      const token = generateTestToken(app, { userId: viewer.id, username: viewer.username });

      const response = await app.inject({
        method: 'POST',
        url: `/shots/${shot.id}/sparkle`,
        headers: { Authorization: `Bearer ${token}` },
      });

      expect([200, 201]).toContain(response.statusCode);

      // Verify sparkle added
      const getResponse = await app.inject({
        method: 'GET',
        url: `/shots/${shot.id}`,
        headers: { Authorization: `Bearer ${token}` },
      });
      const body = parseBody<{ hasSparkled: boolean; sparkleCount: number }>(getResponse);
      expect(body.hasSparkled).toBe(true);
      expect(body.sparkleCount).toBe(1);
    });

    it('should not allow duplicate sparkles', async () => {
      const author = await factories.createUser();
      const viewer = await factories.createUser();
      const shot = await factories.createShot(author.id);
      await factories.createReaction(shot.id, viewer.id);
      const token = generateTestToken(app, { userId: viewer.id, username: viewer.username });

      const response = await app.inject({
        method: 'POST',
        url: `/shots/${shot.id}/sparkle`,
        headers: { Authorization: `Bearer ${token}` },
      });

      // Should either return error or be idempotent
      expect(response.statusCode).not.toBe(500);
    });
  });

  describe('DELETE /shots/:id/sparkle', () => {
    it('should remove sparkle from shot', async () => {
      const author = await factories.createUser();
      const viewer = await factories.createUser();
      const shot = await factories.createShot(author.id);
      await factories.createReaction(shot.id, viewer.id);
      const token = generateTestToken(app, { userId: viewer.id, username: viewer.username });

      const response = await app.inject({
        method: 'DELETE',
        url: `/shots/${shot.id}/sparkle`,
        headers: { Authorization: `Bearer ${token}` },
      });

      expect(response.statusCode).toBe(200);

      // Verify sparkle removed
      const getResponse = await app.inject({
        method: 'GET',
        url: `/shots/${shot.id}`,
        headers: { Authorization: `Bearer ${token}` },
      });
      const body = parseBody<{ hasSparkled: boolean; sparkleCount: number }>(getResponse);
      expect(body.hasSparkled).toBe(false);
      expect(body.sparkleCount).toBe(0);
    });
  });

  describe('GET /shots/:id/comments', () => {
    it('should return comments for shot', async () => {
      const author = await factories.createUser();
      const commenter = await factories.createUser();
      const shot = await factories.createShot(author.id);
      await factories.createComment(shot.id, commenter.id, 'Great work!');

      const response = await app.inject({
        method: 'GET',
        url: `/shots/${shot.id}/comments`,
      });

      expect(response.statusCode).toBe(200);
      const body = parseBody<{ comments: Array<{ content: string }> }>(response);
      expect(body.comments.length).toBe(1);
      expect(body.comments[0].content).toBe('Great work!');
    });
  });

  describe('POST /shots/:id/comments', () => {
    it('should require authentication', async () => {
      const author = await factories.createUser();
      const shot = await factories.createShot(author.id);

      const response = await app.inject({
        method: 'POST',
        url: `/shots/${shot.id}/comments`,
        payload: { content: 'Test comment' },
      });

      expect(response.statusCode).toBe(401);
    });

    it('should add comment to shot', async () => {
      const author = await factories.createUser();
      const commenter = await factories.createUser();
      const shot = await factories.createShot(author.id);
      const token = generateTestToken(app, { userId: commenter.id, username: commenter.username });

      const response = await app.inject({
        method: 'POST',
        url: `/shots/${shot.id}/comments`,
        headers: { Authorization: `Bearer ${token}` },
        payload: { content: 'Nice shot!' },
      });

      expect(response.statusCode).toBe(201);
      const body = parseBody<{ id: string; content: string }>(response);
      expect(body.content).toBe('Nice shot!');
    });

    it('should validate comment content', async () => {
      const author = await factories.createUser();
      const commenter = await factories.createUser();
      const shot = await factories.createShot(author.id);
      const token = generateTestToken(app, { userId: commenter.id, username: commenter.username });

      // Empty content
      const response = await app.inject({
        method: 'POST',
        url: `/shots/${shot.id}/comments`,
        headers: { Authorization: `Bearer ${token}` },
        payload: { content: '' },
      });

      expect(response.statusCode).toBe(400);
    });
  });

  describe('DELETE /shots/:id/comments/:commentId', () => {
    it('should delete own comment', async () => {
      const author = await factories.createUser();
      const commenter = await factories.createUser();
      const shot = await factories.createShot(author.id);
      const comment = await factories.createComment(shot.id, commenter.id, 'To delete');
      const token = generateTestToken(app, { userId: commenter.id, username: commenter.username });

      const response = await app.inject({
        method: 'DELETE',
        url: `/shots/${shot.id}/comments/${comment.id}`,
        headers: { Authorization: `Bearer ${token}` },
      });

      expect(response.statusCode).toBe(200);
    });

    it('should not delete another user\'s comment', async () => {
      const author = await factories.createUser();
      const commenter = await factories.createUser();
      const attacker = await factories.createUser();
      const shot = await factories.createShot(author.id);
      const comment = await factories.createComment(shot.id, commenter.id, 'Protected');
      const token = generateTestToken(app, { userId: attacker.id, username: attacker.username });

      const response = await app.inject({
        method: 'DELETE',
        url: `/shots/${shot.id}/comments/${comment.id}`,
        headers: { Authorization: `Bearer ${token}` },
      });

      expect([403, 404]).toContain(response.statusCode);
    });
  });
});
