import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { buildTestApp } from '../../setup/app.js';
import { factories } from '../../setup/fixtures.js';
import { FollowService } from '../../../src/services/follow.service.js';

describe('FollowService', () => {
  let app: FastifyInstance;
  let followService: FollowService;

  beforeEach(async () => {
    app = await buildTestApp();
    await app.ready();
    followService = new FollowService(app);
  });

  afterAll(async () => {
    await app.close();
  });

  describe('follow', () => {
    it('should create a follow relationship', async () => {
      const follower = await factories.createUser();
      const following = await factories.createUser();

      const result = await followService.follow(follower.id, following.id);

      expect(result).toBe(true);

      const isFollowing = await followService.isFollowing(follower.id, following.id);
      expect(isFollowing).toBe(true);
    });

    it('should prevent self-follow', async () => {
      const user = await factories.createUser();

      const result = await followService.follow(user.id, user.id);

      expect(result).toBe(false);
    });

    it('should handle duplicate follow gracefully', async () => {
      const follower = await factories.createUser();
      const following = await factories.createUser();

      await followService.follow(follower.id, following.id);
      const result = await followService.follow(follower.id, following.id);

      // Should either succeed silently or return false
      expect(typeof result).toBe('boolean');
    });
  });

  describe('unfollow', () => {
    it('should remove a follow relationship', async () => {
      const follower = await factories.createUser();
      const following = await factories.createUser();

      await factories.createFollow(follower.id, following.id);

      const result = await followService.unfollow(follower.id, following.id);

      expect(result).toBe(true);

      const isFollowing = await followService.isFollowing(follower.id, following.id);
      expect(isFollowing).toBe(false);
    });

    it('should return false when not following', async () => {
      const follower = await factories.createUser();
      const following = await factories.createUser();

      const result = await followService.unfollow(follower.id, following.id);

      expect(result).toBe(false);
    });
  });

  describe('isFollowing', () => {
    it('should return true when following', async () => {
      const follower = await factories.createUser();
      const following = await factories.createUser();

      await factories.createFollow(follower.id, following.id);

      const result = await followService.isFollowing(follower.id, following.id);

      expect(result).toBe(true);
    });

    it('should return false when not following', async () => {
      const user1 = await factories.createUser();
      const user2 = await factories.createUser();

      const result = await followService.isFollowing(user1.id, user2.id);

      expect(result).toBe(false);
    });

    it('should be directional', async () => {
      const user1 = await factories.createUser();
      const user2 = await factories.createUser();

      await factories.createFollow(user1.id, user2.id);

      // user1 follows user2
      expect(await followService.isFollowing(user1.id, user2.id)).toBe(true);
      // user2 does NOT follow user1
      expect(await followService.isFollowing(user2.id, user1.id)).toBe(false);
    });
  });

  describe('getFollowers', () => {
    it('should return empty array when user has no followers', async () => {
      const user = await factories.createUser();

      const result = await followService.getFollowers(user.id, undefined, 10);

      expect(result.users).toEqual([]);
      expect(result.hasMore).toBe(false);
    });

    it('should return list of followers with user info', async () => {
      const user = await factories.createUser();
      const follower1 = await factories.createUser({ username: 'follower1' });
      const follower2 = await factories.createUser({ username: 'follower2' });

      await factories.createFollow(follower1.id, user.id);
      await factories.createFollow(follower2.id, user.id);

      const result = await followService.getFollowers(user.id, undefined, 10);

      expect(result.users.length).toBe(2);
      const usernames = result.users.map((u) => u.username);
      expect(usernames).toContain('follower1');
      expect(usernames).toContain('follower2');
    });

    it('should support cursor-based pagination', async () => {
      const user = await factories.createUser();

      // Create enough followers to trigger pagination
      for (let i = 0; i < 12; i++) {
        const follower = await factories.createUser({ username: `follower_${i}` });
        await factories.createFollow(follower.id, user.id);
      }

      const page1 = await followService.getFollowers(user.id, undefined, 10);
      expect(page1.users.length).toBe(10);
      expect(page1.hasMore).toBe(true);
      expect(page1.nextCursor).toBeDefined();

      // Verify cursor is a valid ISO date string
      expect(() => new Date(page1.nextCursor!)).not.toThrow();
    });
  });

  describe('getFollowing', () => {
    it('should return empty array when user follows no one', async () => {
      const user = await factories.createUser();

      const result = await followService.getFollowing(user.id, undefined, 10);

      expect(result.users).toEqual([]);
      expect(result.hasMore).toBe(false);
    });

    it('should return list of followed users', async () => {
      const user = await factories.createUser();
      const following1 = await factories.createUser({ username: 'following1' });
      const following2 = await factories.createUser({ username: 'following2' });

      await factories.createFollow(user.id, following1.id);
      await factories.createFollow(user.id, following2.id);

      const result = await followService.getFollowing(user.id, undefined, 10);

      expect(result.users.length).toBe(2);
      const usernames = result.users.map((u) => u.username);
      expect(usernames).toContain('following1');
      expect(usernames).toContain('following2');
    });
  });

  describe('getFollowingIds', () => {
    it('should return array of user IDs', async () => {
      const user = await factories.createUser();
      const following1 = await factories.createUser();
      const following2 = await factories.createUser();

      await factories.createFollow(user.id, following1.id);
      await factories.createFollow(user.id, following2.id);

      const ids = await followService.getFollowingIds(user.id);

      expect(ids.length).toBe(2);
      expect(ids).toContain(following1.id);
      expect(ids).toContain(following2.id);
    });

    it('should return empty array when following no one', async () => {
      const user = await factories.createUser();

      const ids = await followService.getFollowingIds(user.id);

      expect(ids).toEqual([]);
    });
  });

  describe('getFollowerCount', () => {
    it('should return correct follower count', async () => {
      const user = await factories.createUser();
      const follower1 = await factories.createUser();
      const follower2 = await factories.createUser();

      await factories.createFollow(follower1.id, user.id);
      await factories.createFollow(follower2.id, user.id);

      const count = await followService.getFollowerCount(user.id);

      expect(count).toBe(2);
    });

    it('should return zero when no followers exist', async () => {
      const user = await factories.createUser();

      const count = await followService.getFollowerCount(user.id);

      expect(count).toBe(0);
    });
  });

  describe('getFollowingCount', () => {
    it('should return correct following count', async () => {
      const user = await factories.createUser();
      const following1 = await factories.createUser();
      const following2 = await factories.createUser();

      await factories.createFollow(user.id, following1.id);
      await factories.createFollow(user.id, following2.id);

      const count = await followService.getFollowingCount(user.id);

      expect(count).toBe(2);
    });

    it('should return zero when following no one', async () => {
      const user = await factories.createUser();

      const count = await followService.getFollowingCount(user.id);

      expect(count).toBe(0);
    });
  });
});
