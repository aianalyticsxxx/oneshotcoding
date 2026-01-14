import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { buildTestApp, generateTestToken, parseBody } from '../setup/app.js';
import { factories } from '../setup/fixtures.js';

describe('IDOR (Insecure Direct Object Reference) Security', () => {
  let app: FastifyInstance;
  let victim: { id: string; username: string };
  let attacker: { id: string; username: string };
  let victimToken: string;
  let attackerToken: string;

  beforeEach(async () => {
    app = await buildTestApp({ withRoutes: true });
    await app.ready();

    victim = await factories.createUser({ username: 'victim_user' });
    attacker = await factories.createUser({ username: 'attacker_user' });
    victimToken = generateTestToken(app, { userId: victim.id, username: victim.username });
    attackerToken = generateTestToken(app, { userId: attacker.id, username: attacker.username });
  });

  afterAll(async () => {
    await app.close();
  });

  describe('Shot ownership', () => {
    it('should not allow deleting another user\'s shot', async () => {
      const victimShot = await factories.createShot(victim.id, { prompt: 'Victim\'s shot' });

      // Attacker tries to delete victim's shot
      const response = await app.inject({
        method: 'DELETE',
        url: `/shots/${victimShot.id}`,
        headers: { Authorization: `Bearer ${attackerToken}` },
      });

      // Should fail - either 403 or 404 (hiding existence)
      expect([403, 404]).toContain(response.statusCode);

      // Verify shot still exists
      const getResponse = await app.inject({
        method: 'GET',
        url: `/shots/${victimShot.id}`,
      });
      expect(getResponse.statusCode).toBe(200);
    });

    it('should allow owner to delete their own shot', async () => {
      const victimShot = await factories.createShot(victim.id);

      const response = await app.inject({
        method: 'DELETE',
        url: `/shots/${victimShot.id}`,
        headers: { Authorization: `Bearer ${victimToken}` },
      });

      expect(response.statusCode).toBe(200);
    });
  });

  describe('Comment ownership', () => {
    it('should not allow deleting another user\'s comment', async () => {
      const shot = await factories.createShot(victim.id);
      const comment = await factories.createComment(shot.id, victim.id, 'Victim\'s comment');

      // Attacker tries to delete victim's comment
      const response = await app.inject({
        method: 'DELETE',
        url: `/shots/${shot.id}/comments/${comment.id}`,
        headers: { Authorization: `Bearer ${attackerToken}` },
      });

      expect([403, 404]).toContain(response.statusCode);

      // Verify comment still exists
      const getResponse = await app.inject({
        method: 'GET',
        url: `/shots/${shot.id}/comments`,
      });
      const body = parseBody<{ comments: Array<{ id: string }> }>(getResponse);
      expect(body.comments.some((c) => c.id === comment.id)).toBe(true);
    });

    it('should allow owner to delete their own comment', async () => {
      const shot = await factories.createShot(attacker.id);
      const comment = await factories.createComment(shot.id, attacker.id, 'My comment');

      const response = await app.inject({
        method: 'DELETE',
        url: `/shots/${shot.id}/comments/${comment.id}`,
        headers: { Authorization: `Bearer ${attackerToken}` },
      });

      expect(response.statusCode).toBe(200);
    });

    it('shot owner cannot delete comments by others', async () => {
      // Shot owned by victim
      const shot = await factories.createShot(victim.id);
      // Comment by attacker on victim's shot
      const comment = await factories.createComment(shot.id, attacker.id, 'Attacker\'s comment');

      // Victim (shot owner) tries to delete attacker's comment
      const response = await app.inject({
        method: 'DELETE',
        url: `/shots/${shot.id}/comments/${comment.id}`,
        headers: { Authorization: `Bearer ${victimToken}` },
      });

      // Shot ownership should not grant comment deletion rights
      expect([403, 404]).toContain(response.statusCode);
    });
  });

  describe('Profile access', () => {
    it('attacker cannot update victim\'s profile via API manipulation', async () => {
      // Even if attacker could somehow try to target another user
      // The endpoint should only update the authenticated user
      const response = await app.inject({
        method: 'PATCH',
        url: '/users/me',
        headers: { Authorization: `Bearer ${attackerToken}` },
        payload: { displayName: 'Hacked Name', bio: 'Hacked bio' },
      });

      expect(response.statusCode).toBe(200);

      // Verify victim's profile is unchanged
      const victimProfile = await app.inject({
        method: 'GET',
        url: `/users/${victim.username}`,
      });
      const body = parseBody<{ displayName: string; bio?: string }>(victimProfile);
      expect(body.displayName).toBe(victim.displayName || 'Test User');
    });

    it('attacker cannot delete victim\'s account', async () => {
      // DELETE /users/me should only affect authenticated user
      const response = await app.inject({
        method: 'DELETE',
        url: '/users/me',
        headers: { Authorization: `Bearer ${attackerToken}` },
      });

      // This should delete attacker's account, not victim's
      expect(response.statusCode).toBe(200);

      // Verify victim's account still exists
      const victimProfile = await app.inject({
        method: 'GET',
        url: `/users/${victim.username}`,
      });
      expect(victimProfile.statusCode).toBe(200);
    });
  });

  describe('Report access (admin only)', () => {
    let adminUser: { id: string; username: string };
    let adminToken: string;

    beforeEach(async () => {
      adminUser = await factories.createUser({ username: 'admin_user', isAdmin: true });
      adminToken = generateTestToken(app, { userId: adminUser.id, username: adminUser.username });

      // Create a test report
      await factories.createReport(victim.id, {
        reportedUserId: attacker.id,
        reason: 'spam',
      });
    });

    it('non-admin user cannot view reports list', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/reports',
        headers: { Authorization: `Bearer ${attackerToken}` },
      });

      expect([401, 403]).toContain(response.statusCode);
    });

    it('non-admin user cannot update report status', async () => {
      const report = await factories.createReport(victim.id, {
        reportedUserId: attacker.id,
        reason: 'harassment',
      });

      const response = await app.inject({
        method: 'PATCH',
        url: `/reports/${report.id}`,
        headers: { Authorization: `Bearer ${attackerToken}` },
        payload: { status: 'dismissed' },
      });

      expect([401, 403]).toContain(response.statusCode);
    });

    it('admin can view reports', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/reports',
        headers: { Authorization: `Bearer ${adminToken}` },
      });

      expect(response.statusCode).toBe(200);
    });

    it('admin can update report status', async () => {
      const report = await factories.createReport(victim.id, {
        reportedUserId: attacker.id,
        reason: 'spam',
      });

      const response = await app.inject({
        method: 'PATCH',
        url: `/reports/${report.id}`,
        headers: { Authorization: `Bearer ${adminToken}` },
        payload: { status: 'reviewed', actionTaken: 'warning' },
      });

      expect(response.statusCode).toBe(200);
    });
  });

  describe('Challenge voting', () => {
    it('user cannot vote on behalf of another user', async () => {
      const challenge = await factories.createChallenge();
      const shot = await factories.createShot(victim.id, { challengeId: challenge.id });

      // Attacker votes - should record their vote, not victim's
      const response = await app.inject({
        method: 'POST',
        url: `/challenges/${challenge.id}/vote/${shot.id}`,
        headers: { Authorization: `Bearer ${attackerToken}` },
        payload: {
          creativityScore: 5,
          usefulnessScore: 5,
          qualityScore: 5,
        },
      });

      expect([200, 201]).toContain(response.statusCode);

      // Verify the vote was recorded for attacker, not manipulated
      const voteResponse = await app.inject({
        method: 'GET',
        url: `/challenges/${challenge.id}/vote/${shot.id}`,
        headers: { Authorization: `Bearer ${attackerToken}` },
      });

      if (voteResponse.statusCode === 200) {
        const vote = parseBody<{ userId: string }>(voteResponse);
        // The vote should be associated with attacker, not victim
        expect(vote.userId).not.toBe(victim.id);
      }
    });
  });

  describe('Follow system', () => {
    it('user cannot follow as another user', async () => {
      const targetUser = await factories.createUser();

      // Attacker follows - should follow as attacker, not victim
      const response = await app.inject({
        method: 'POST',
        url: `/users/${targetUser.id}/follow`,
        headers: { Authorization: `Bearer ${attackerToken}` },
      });

      expect([200, 201]).toContain(response.statusCode);

      // Check attacker's following list
      const attackerFollowing = await app.inject({
        method: 'GET',
        url: `/users/${attacker.id}/following`,
      });
      const attackerFollowingBody = parseBody<{ users: Array<{ id: string }> }>(attackerFollowing);

      // Check victim's following list
      const victimFollowing = await app.inject({
        method: 'GET',
        url: `/users/${victim.id}/following`,
      });
      const victimFollowingBody = parseBody<{ users: Array<{ id: string }> }>(victimFollowing);

      // Attacker should have the follow, victim should not
      expect(attackerFollowingBody.users.some((u) => u.id === targetUser.id)).toBe(true);
      expect(victimFollowingBody.users.some((u) => u.id === targetUser.id)).toBe(false);
    });

    it('user cannot unfollow on behalf of another user', async () => {
      const targetUser = await factories.createUser();

      // Victim follows target
      await factories.createFollow(victim.id, targetUser.id);

      // Attacker tries to unfollow for victim
      const response = await app.inject({
        method: 'DELETE',
        url: `/users/${targetUser.id}/follow`,
        headers: { Authorization: `Bearer ${attackerToken}` },
      });

      // This should only affect attacker's follow status (which doesn't exist)
      expect([200, 404]).toContain(response.statusCode);

      // Victim should still be following
      const victimFollowing = await app.inject({
        method: 'GET',
        url: `/users/${victim.id}/following`,
      });
      const body = parseBody<{ users: Array<{ id: string }> }>(victimFollowing);
      expect(body.users.some((u) => u.id === targetUser.id)).toBe(true);
    });
  });

  describe('Sparkle reactions', () => {
    it('user cannot remove another user\'s sparkle', async () => {
      const shot = await factories.createShot(victim.id);

      // Victim sparkles the shot
      await factories.createReaction(shot.id, victim.id);

      // Attacker tries to remove the sparkle
      const response = await app.inject({
        method: 'DELETE',
        url: `/shots/${shot.id}/sparkle`,
        headers: { Authorization: `Bearer ${attackerToken}` },
      });

      // Should not find attacker's sparkle (doesn't exist)
      expect([200, 404]).toContain(response.statusCode);

      // Verify victim's sparkle still exists
      const shotResponse = await app.inject({
        method: 'GET',
        url: `/shots/${shot.id}`,
        headers: { Authorization: `Bearer ${victimToken}` },
      });
      const body = parseBody<{ hasSparkled: boolean; sparkleCount: number }>(shotResponse);
      expect(body.hasSparkled).toBe(true);
      expect(body.sparkleCount).toBeGreaterThanOrEqual(1);
    });
  });

  describe('UUID enumeration', () => {
    it('should not reveal if a resource exists via different error codes', async () => {
      const existingShot = await factories.createShot(victim.id);
      const nonExistentId = '00000000-0000-0000-0000-000000000000';

      // Request for existing shot (unauthorized access)
      const existingResponse = await app.inject({
        method: 'DELETE',
        url: `/shots/${existingShot.id}`,
        headers: { Authorization: `Bearer ${attackerToken}` },
      });

      // Request for non-existent shot
      const nonExistentResponse = await app.inject({
        method: 'DELETE',
        url: `/shots/${nonExistentId}`,
        headers: { Authorization: `Bearer ${attackerToken}` },
      });

      // Both should return the same error code to prevent enumeration
      expect(existingResponse.statusCode).toBe(nonExistentResponse.statusCode);
    });
  });
});
