import { http, HttpResponse } from 'msw';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

// Mock data generators
export const mockUser = (overrides = {}) => ({
  id: 'user-1',
  username: 'testuser',
  displayName: 'Test User',
  avatarUrl: 'https://example.com/avatar.png',
  bio: 'Test bio',
  ...overrides,
});

export const mockShot = (overrides = {}) => ({
  id: 'shot-1',
  prompt: 'Build a landing page',
  imageUrl: 'https://example.com/shot.png',
  caption: 'My creation',
  resultType: 'image',
  createdAt: new Date().toISOString(),
  sparkleCount: 5,
  hasSparkled: false,
  commentCount: 3,
  user: mockUser(),
  ...overrides,
});

export const mockComment = (overrides = {}) => ({
  id: 'comment-1',
  content: 'Great work!',
  createdAt: new Date().toISOString(),
  user: mockUser(),
  ...overrides,
});

export const mockChallenge = (overrides = {}) => ({
  id: 'challenge-1',
  title: 'Test Challenge',
  description: 'A test challenge description',
  startsAt: new Date().toISOString(),
  endsAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
  isOfficial: false,
  isSponsored: false,
  ...overrides,
});

// MSW handlers
export const handlers = [
  // Auth
  http.get(`${API_URL}/auth/me`, () => {
    return HttpResponse.json(mockUser());
  }),

  http.post(`${API_URL}/auth/logout`, () => {
    return HttpResponse.json({ success: true });
  }),

  // Shots
  http.get(`${API_URL}/shots`, ({ request }) => {
    const url = new URL(request.url);
    const limit = parseInt(url.searchParams.get('limit') || '20', 10);
    const shots = Array.from({ length: Math.min(limit, 10) }, (_, i) =>
      mockShot({ id: `shot-${i}` })
    );
    return HttpResponse.json({
      shots,
      hasMore: false,
      nextCursor: undefined,
    });
  }),

  http.get(`${API_URL}/shots/:id`, ({ params }) => {
    return HttpResponse.json(mockShot({ id: params.id as string }));
  }),

  http.post(`${API_URL}/shots`, async ({ request }) => {
    const body = await request.json() as Record<string, unknown>;
    return HttpResponse.json(
      mockShot({
        prompt: body.prompt as string,
        imageUrl: body.imageUrl as string,
        caption: body.caption as string,
      }),
      { status: 201 }
    );
  }),

  http.delete(`${API_URL}/shots/:id`, () => {
    return HttpResponse.json({ success: true });
  }),

  // Reactions
  http.post(`${API_URL}/shots/:id/sparkle`, () => {
    return HttpResponse.json({ success: true }, { status: 201 });
  }),

  http.delete(`${API_URL}/shots/:id/sparkle`, () => {
    return HttpResponse.json({ success: true });
  }),

  // Comments
  http.get(`${API_URL}/shots/:id/comments`, () => {
    return HttpResponse.json({
      comments: [mockComment()],
      hasMore: false,
    });
  }),

  http.post(`${API_URL}/shots/:id/comments`, async ({ request }) => {
    const body = await request.json() as Record<string, unknown>;
    return HttpResponse.json(
      mockComment({ content: body.content as string }),
      { status: 201 }
    );
  }),

  http.delete(`${API_URL}/shots/:id/comments/:commentId`, () => {
    return HttpResponse.json({ success: true });
  }),

  // Users
  http.get(`${API_URL}/users/:username`, ({ params }) => {
    return HttpResponse.json(mockUser({ username: params.username }));
  }),

  http.get(`${API_URL}/users/:username/shots`, () => {
    return HttpResponse.json({
      shots: [mockShot()],
      hasMore: false,
    });
  }),

  http.patch(`${API_URL}/users/me`, async ({ request }) => {
    const body = await request.json() as Record<string, unknown>;
    return HttpResponse.json(mockUser(body));
  }),

  http.delete(`${API_URL}/users/me`, () => {
    return HttpResponse.json({ success: true });
  }),

  // Follow
  http.get(`${API_URL}/users/:id/follow/status`, () => {
    return HttpResponse.json({
      isFollowing: false,
      followerCount: 10,
      followingCount: 5,
    });
  }),

  http.post(`${API_URL}/users/:id/follow`, () => {
    return HttpResponse.json({ success: true }, { status: 201 });
  }),

  http.delete(`${API_URL}/users/:id/follow`, () => {
    return HttpResponse.json({ success: true });
  }),

  http.get(`${API_URL}/users/:id/followers`, () => {
    return HttpResponse.json({
      users: [mockUser()],
      hasMore: false,
    });
  }),

  http.get(`${API_URL}/users/:id/following`, () => {
    return HttpResponse.json({
      users: [mockUser()],
      hasMore: false,
    });
  }),

  // Challenges
  http.get(`${API_URL}/challenges`, () => {
    return HttpResponse.json({
      challenges: [mockChallenge()],
      hasMore: false,
    });
  }),

  http.get(`${API_URL}/challenges/:id`, ({ params }) => {
    return HttpResponse.json(mockChallenge({ id: params.id }));
  }),

  // Tags
  http.get(`${API_URL}/tags/trending`, () => {
    return HttpResponse.json({
      tags: [
        { name: 'webdev', count: 100 },
        { name: 'ai', count: 80 },
        { name: 'design', count: 60 },
      ],
    });
  }),

  http.get(`${API_URL}/tags/:name/shots`, () => {
    return HttpResponse.json({
      shots: [mockShot()],
      hasMore: false,
    });
  }),

  // Reports
  http.post(`${API_URL}/reports`, () => {
    return HttpResponse.json({ id: 'report-1' }, { status: 201 });
  }),

  // Upload
  http.post(`${API_URL}/upload/presigned`, () => {
    return HttpResponse.json({
      uploadUrl: 'https://s3.example.com/upload',
      fileKey: 'shots/test/file.png',
    });
  }),
];

export { http, HttpResponse };
