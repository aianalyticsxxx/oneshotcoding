import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { buildTestApp } from '../../setup/app.js';
import { factories, createShots } from '../../setup/fixtures.js';
import { ShotService } from '../../../src/services/shot.service.js';

describe('ShotService', () => {
  let app: FastifyInstance;
  let shotService: ShotService;

  beforeEach(async () => {
    app = await buildTestApp();
    await app.ready();
    shotService = new ShotService(app);
  });

  afterAll(async () => {
    await app.close();
  });

  describe('create', () => {
    it('should create a new shot', async () => {
      const user = await factories.createUser();

      const shot = await shotService.create({
        userId: user.id,
        prompt: 'Build a landing page',
        imageUrl: 'https://example.com/result.png',
        imageKey: 'shots/test/result.png',
        caption: 'My first shot',
      });

      expect(shot).toBeDefined();
      expect(shot.id).toBeDefined();
      expect(shot.prompt).toBe('Build a landing page');
      expect(shot.imageUrl).toBe('https://example.com/result.png');
      expect(shot.caption).toBe('My first shot');
      expect(shot.user.id).toBe(user.id);
      expect(shot.user.username).toBe(user.username);
      expect(shot.sparkleCount).toBe(0);
      expect(shot.hasSparkled).toBe(false);
      expect(shot.commentCount).toBe(0);
      expect(shot.resultType).toBe('image');
    });

    it('should create shot with video result type', async () => {
      const user = await factories.createUser();

      const shot = await shotService.create({
        userId: user.id,
        prompt: 'Create a video tutorial',
        imageUrl: 'https://example.com/video.mp4',
        imageKey: 'shots/test/video.mp4',
        resultType: 'video',
      });

      expect(shot.resultType).toBe('video');
    });

    it('should create shot linked to a challenge', async () => {
      const user = await factories.createUser();
      const challenge = await factories.createChallenge();

      const shot = await shotService.create({
        userId: user.id,
        prompt: 'Challenge submission',
        imageUrl: 'https://example.com/result.png',
        imageKey: 'shots/test/result.png',
        challengeId: challenge.id,
      });

      expect(shot.challengeId).toBe(challenge.id);
    });

    it('should allow multiple shots per user (no daily limit)', async () => {
      const user = await factories.createUser();

      const shot1 = await shotService.create({
        userId: user.id,
        prompt: 'First shot',
        imageUrl: 'https://example.com/1.png',
        imageKey: 'shots/test/1.png',
      });

      const shot2 = await shotService.create({
        userId: user.id,
        prompt: 'Second shot',
        imageUrl: 'https://example.com/2.png',
        imageKey: 'shots/test/2.png',
      });

      expect(shot1.id).not.toBe(shot2.id);
    });
  });

  describe('getById', () => {
    it('should return null for non-existent shot', async () => {
      const shot = await shotService.getById('00000000-0000-0000-0000-000000000000');
      expect(shot).toBeNull();
    });

    it('should return shot with user info', async () => {
      const user = await factories.createUser({
        username: 'testcreator',
        displayName: 'Test Creator',
      });
      const createdShot = await factories.createShot(user.id, { prompt: 'Test shot' });

      const shot = await shotService.getById(createdShot.id);

      expect(shot).toBeDefined();
      expect(shot!.id).toBe(createdShot.id);
      expect(shot!.prompt).toBe('Test shot');
      expect(shot!.user.id).toBe(user.id);
      expect(shot!.user.username).toBe('testcreator');
      expect(shot!.user.displayName).toBe('Test Creator');
    });

    it('should indicate hasSparkled=false when user has not sparkled', async () => {
      const author = await factories.createUser();
      const viewer = await factories.createUser();
      const shot = await factories.createShot(author.id);

      const result = await shotService.getById(shot.id, viewer.id);

      expect(result!.hasSparkled).toBe(false);
    });

    it('should indicate hasSparkled=true when user has sparkled', async () => {
      const author = await factories.createUser();
      const viewer = await factories.createUser();
      const shot = await factories.createShot(author.id);
      await factories.createReaction(shot.id, viewer.id);

      const result = await shotService.getById(shot.id, viewer.id);

      expect(result!.hasSparkled).toBe(true);
    });

    it('should return correct sparkle count', async () => {
      const author = await factories.createUser();
      const shot = await factories.createShot(author.id);

      // Add 3 sparkles
      const user1 = await factories.createUser();
      const user2 = await factories.createUser();
      const user3 = await factories.createUser();
      await factories.createReaction(shot.id, user1.id);
      await factories.createReaction(shot.id, user2.id);
      await factories.createReaction(shot.id, user3.id);

      const result = await shotService.getById(shot.id);

      expect(result!.sparkleCount).toBe(3);
    });

    it('should return correct comment count', async () => {
      const author = await factories.createUser();
      const shot = await factories.createShot(author.id);
      const commenter = await factories.createUser();

      await factories.createComment(shot.id, commenter.id, 'Comment 1');
      await factories.createComment(shot.id, commenter.id, 'Comment 2');

      const result = await shotService.getById(shot.id);

      expect(result!.commentCount).toBe(2);
    });
  });

  describe('delete', () => {
    it('should delete shot owned by user', async () => {
      const user = await factories.createUser();
      const shot = await factories.createShot(user.id);

      const result = await shotService.delete(shot.id, user.id);

      expect(result).toBe(true);

      const deleted = await shotService.getById(shot.id);
      expect(deleted).toBeNull();
    });

    it('should not delete shot owned by another user', async () => {
      const owner = await factories.createUser();
      const attacker = await factories.createUser();
      const shot = await factories.createShot(owner.id);

      const result = await shotService.delete(shot.id, attacker.id);

      expect(result).toBe(false);

      const stillExists = await shotService.getById(shot.id);
      expect(stillExists).not.toBeNull();
    });

    it('should return false for non-existent shot', async () => {
      const user = await factories.createUser();

      const result = await shotService.delete('00000000-0000-0000-0000-000000000000', user.id);

      expect(result).toBe(false);
    });
  });

  describe('getFeed', () => {
    it('should return empty array when no shots exist', async () => {
      const result = await shotService.getFeed({ limit: 20 });

      expect(result.shots).toEqual([]);
      expect(result.hasMore).toBe(false);
      expect(result.nextCursor).toBeUndefined();
    });

    it('should return shots in reverse chronological order', async () => {
      const user = await factories.createUser();
      const shots = await createShots(user.id, 5);

      const result = await shotService.getFeed({ limit: 10 });

      expect(result.shots.length).toBe(5);
      // First shot should be most recent (shots are created with staggered times)
      expect(result.shots[0].id).toBe(shots[0].id);
    });

    it('should paginate results correctly', async () => {
      const user = await factories.createUser();
      await createShots(user.id, 25);

      // First page
      const page1 = await shotService.getFeed({ limit: 10 });
      expect(page1.shots.length).toBe(10);
      expect(page1.hasMore).toBe(true);
      expect(page1.nextCursor).toBeDefined();

      // Second page
      const page2 = await shotService.getFeed({ limit: 10, cursor: page1.nextCursor });
      expect(page2.shots.length).toBe(10);
      expect(page2.hasMore).toBe(true);

      // Third page
      const page3 = await shotService.getFeed({ limit: 10, cursor: page2.nextCursor });
      expect(page3.shots.length).toBe(5);
      expect(page3.hasMore).toBe(false);

      // Verify no duplicates
      const allIds = [...page1.shots, ...page2.shots, ...page3.shots].map((s) => s.id);
      const uniqueIds = new Set(allIds);
      expect(uniqueIds.size).toBe(25);
    });

    it('should include hasSparkled when currentUserId provided', async () => {
      const author = await factories.createUser();
      const viewer = await factories.createUser();
      const shot = await factories.createShot(author.id);
      await factories.createReaction(shot.id, viewer.id);

      const result = await shotService.getFeed({ limit: 10, currentUserId: viewer.id });

      const foundShot = result.shots.find((s) => s.id === shot.id);
      expect(foundShot?.hasSparkled).toBe(true);
    });
  });

  describe('getDiscoveryFeed', () => {
    it('should return all shots sorted by recent by default', async () => {
      const user = await factories.createUser();
      await createShots(user.id, 5);

      const result = await shotService.getDiscoveryFeed({ limit: 10 });

      expect(result.shots.length).toBe(5);
    });

    it('should sort by popular when specified', async () => {
      const user = await factories.createUser();
      const shot1 = await factories.createShot(user.id, { prompt: 'Less popular' });
      const shot2 = await factories.createShot(user.id, { prompt: 'More popular' });

      // Add more sparkles to shot2
      const sparklers = await Promise.all([
        factories.createUser(),
        factories.createUser(),
        factories.createUser(),
      ]);
      await factories.createReaction(shot2.id, sparklers[0].id);
      await factories.createReaction(shot2.id, sparklers[1].id);
      await factories.createReaction(shot2.id, sparklers[2].id);
      await factories.createReaction(shot1.id, sparklers[0].id);

      const result = await shotService.getDiscoveryFeed({ limit: 10, sort: 'popular' });

      // More popular shot should come first
      expect(result.shots[0].id).toBe(shot2.id);
    });
  });

  describe('getFollowingFeed', () => {
    it('should return empty array when user follows no one', async () => {
      const user = await factories.createUser();

      const result = await shotService.getFollowingFeed({
        limit: 10,
        currentUserId: user.id,
      });

      expect(result.shots).toEqual([]);
      expect(result.hasMore).toBe(false);
    });

    it('should return shots only from followed users', async () => {
      const viewer = await factories.createUser();
      const followedUser = await factories.createUser();
      const notFollowedUser = await factories.createUser();

      await factories.createFollow(viewer.id, followedUser.id);

      const followedShot = await factories.createShot(followedUser.id, { prompt: 'Followed' });
      await factories.createShot(notFollowedUser.id, { prompt: 'Not followed' });

      const result = await shotService.getFollowingFeed({
        limit: 10,
        currentUserId: viewer.id,
      });

      expect(result.shots.length).toBe(1);
      expect(result.shots[0].id).toBe(followedShot.id);
    });

    it('should return empty when currentUserId not provided', async () => {
      const result = await shotService.getFollowingFeed({ limit: 10 });

      expect(result.shots).toEqual([]);
    });
  });

  describe('getUserShots', () => {
    it('should return only shots from specified user', async () => {
      const user1 = await factories.createUser();
      const user2 = await factories.createUser();

      await createShots(user1.id, 3);
      await createShots(user2.id, 2);

      const result = await shotService.getUserShots(user1.id, { limit: 10 });

      expect(result.shots.length).toBe(3);
      result.shots.forEach((shot) => {
        expect(shot.user.id).toBe(user1.id);
      });
    });

    it('should paginate user shots correctly', async () => {
      const user = await factories.createUser();
      await createShots(user.id, 15);

      const page1 = await shotService.getUserShots(user.id, { limit: 10 });
      expect(page1.shots.length).toBe(10);
      expect(page1.hasMore).toBe(true);

      const page2 = await shotService.getUserShots(user.id, { limit: 10, cursor: page1.nextCursor });
      expect(page2.shots.length).toBe(5);
      expect(page2.hasMore).toBe(false);
    });
  });

  describe('getChallengeShots', () => {
    it('should return only shots submitted to the challenge', async () => {
      const user = await factories.createUser();
      const challenge = await factories.createChallenge();

      const challengeShot = await factories.createShot(user.id, {
        prompt: 'Challenge entry',
        challengeId: challenge.id,
      });
      await factories.createShot(user.id, { prompt: 'Regular shot' });

      const result = await shotService.getChallengeShots(challenge.id, { limit: 10 });

      expect(result.shots.length).toBe(1);
      expect(result.shots[0].id).toBe(challengeShot.id);
    });
  });

  describe('submitToChallenge', () => {
    it('should link shot to challenge', async () => {
      const user = await factories.createUser();
      const shot = await factories.createShot(user.id);
      const challenge = await factories.createChallenge();

      const result = await shotService.submitToChallenge(shot.id, challenge.id, user.id);

      expect(result).toBe(true);

      const updatedShot = await shotService.getById(shot.id);
      expect(updatedShot!.challengeId).toBe(challenge.id);
    });

    it('should not allow submitting another user\'s shot', async () => {
      const owner = await factories.createUser();
      const attacker = await factories.createUser();
      const shot = await factories.createShot(owner.id);
      const challenge = await factories.createChallenge();

      const result = await shotService.submitToChallenge(shot.id, challenge.id, attacker.id);

      expect(result).toBe(false);
    });
  });
});
