import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { buildTestApp } from '../../setup/app.js';
import { factories } from '../../setup/fixtures.js';
import { CommentService } from '../../../src/services/comment.service.js';

describe('CommentService', () => {
  let app: FastifyInstance;
  let commentService: CommentService;

  beforeEach(async () => {
    app = await buildTestApp();
    await app.ready();
    commentService = new CommentService(app);
  });

  afterAll(async () => {
    await app.close();
  });

  describe('addComment', () => {
    it('should create a new comment', async () => {
      const author = await factories.createUser();
      const commenter = await factories.createUser();
      const shot = await factories.createShot(author.id);

      const comment = await commentService.addComment(shot.id, commenter.id, 'Great work!');

      expect(comment).toBeDefined();
      expect(comment.id).toBeDefined();
      expect(comment.content).toBe('Great work!');
      expect(comment.user.id).toBe(commenter.id);
    });

    it('should allow comments from shot author', async () => {
      const author = await factories.createUser();
      const shot = await factories.createShot(author.id);

      const comment = await commentService.addComment(shot.id, author.id, 'Thanks everyone!');

      expect(comment.user.id).toBe(author.id);
    });

    it('should trim whitespace from content', async () => {
      const author = await factories.createUser();
      const commenter = await factories.createUser();
      const shot = await factories.createShot(author.id);

      const comment = await commentService.addComment(shot.id, commenter.id, '  Great work!  ');

      expect(comment.content).toBe('Great work!');
    });
  });

  describe('getComments', () => {
    it('should return empty array when no comments exist', async () => {
      const author = await factories.createUser();
      const shot = await factories.createShot(author.id);

      const result = await commentService.getComments(shot.id, undefined, 20);

      expect(result.comments).toEqual([]);
      expect(result.hasMore).toBe(false);
    });

    it('should return comments in chronological order', async () => {
      const author = await factories.createUser();
      const commenter = await factories.createUser();
      const shot = await factories.createShot(author.id);

      // Create comments with slight delay to ensure order
      const comment1 = await factories.createComment(shot.id, commenter.id, 'First comment');
      await new Promise((resolve) => setTimeout(resolve, 10));
      const comment2 = await factories.createComment(shot.id, commenter.id, 'Second comment');

      const result = await commentService.getComments(shot.id, undefined, 10);

      expect(result.comments.length).toBe(2);
      expect(result.comments[0].id).toBe(comment1.id);
      expect(result.comments[1].id).toBe(comment2.id);
    });

    it('should support cursor-based pagination', async () => {
      const author = await factories.createUser();
      const commenter = await factories.createUser();
      const shot = await factories.createShot(author.id);

      // Create enough comments to trigger pagination
      for (let i = 0; i < 12; i++) {
        await factories.createComment(shot.id, commenter.id, `Comment ${i}`);
      }

      const page1 = await commentService.getComments(shot.id, undefined, 10);
      expect(page1.comments.length).toBe(10);
      expect(page1.hasMore).toBe(true);
      expect(page1.nextCursor).toBeDefined();

      // Verify cursor is a valid ISO date string
      expect(() => new Date(page1.nextCursor!)).not.toThrow();
    });

    it('should include user info with each comment', async () => {
      const author = await factories.createUser();
      const commenter = await factories.createUser({
        username: 'commenter_user',
        displayName: 'Commenter User',
        avatarUrl: 'https://example.com/avatar.png',
      });
      const shot = await factories.createShot(author.id);
      await factories.createComment(shot.id, commenter.id, 'Nice!');

      const result = await commentService.getComments(shot.id, undefined, 10);

      expect(result.comments[0].user.username).toBe('commenter_user');
      expect(result.comments[0].user.displayName).toBe('Commenter User');
      expect(result.comments[0].user.avatarUrl).toBe('https://example.com/avatar.png');
    });
  });

  describe('deleteComment', () => {
    it('should delete comment owned by user', async () => {
      const author = await factories.createUser();
      const commenter = await factories.createUser();
      const shot = await factories.createShot(author.id);
      const comment = await factories.createComment(shot.id, commenter.id, 'To be deleted');

      const result = await commentService.deleteComment(comment.id, commenter.id);

      expect(result).toBe(true);

      // Verify deleted
      const comments = await commentService.getComments(shot.id, undefined, 10);
      expect(comments.comments.find((c) => c.id === comment.id)).toBeUndefined();
    });

    it('should not delete comment owned by another user', async () => {
      const author = await factories.createUser();
      const commenter = await factories.createUser();
      const attacker = await factories.createUser();
      const shot = await factories.createShot(author.id);
      const comment = await factories.createComment(shot.id, commenter.id, 'Protected comment');

      const result = await commentService.deleteComment(comment.id, attacker.id);

      expect(result).toBe(false);

      // Verify still exists
      const comments = await commentService.getComments(shot.id, undefined, 10);
      expect(comments.comments.find((c) => c.id === comment.id)).toBeDefined();
    });

    it('should return false for non-existent comment', async () => {
      const user = await factories.createUser();

      const result = await commentService.deleteComment('00000000-0000-0000-0000-000000000000', user.id);

      expect(result).toBe(false);
    });
  });

  describe('getCommentCount', () => {
    it('should return correct count of comments', async () => {
      const author = await factories.createUser();
      const commenter = await factories.createUser();
      const shot = await factories.createShot(author.id);

      await factories.createComment(shot.id, commenter.id, 'Comment 1');
      await factories.createComment(shot.id, commenter.id, 'Comment 2');
      await factories.createComment(shot.id, commenter.id, 'Comment 3');

      const count = await commentService.getCommentCount(shot.id);

      expect(count).toBe(3);
    });

    it('should return 0 for shot with no comments', async () => {
      const author = await factories.createUser();
      const shot = await factories.createShot(author.id);

      const count = await commentService.getCommentCount(shot.id);

      expect(count).toBe(0);
    });
  });
});
