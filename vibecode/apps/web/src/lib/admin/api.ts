// Admin API - uses the same API as the main app
const API_URL = '/api';

export interface AdminUser {
  id: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
  isAdmin: boolean;
}

export interface ApiError {
  message: string;
  statusCode: number;
}

export interface ApiResponse<T> {
  data: T | null;
  error: ApiError | null;
}

async function fetchApi<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> {
  const token = typeof window !== 'undefined' ? localStorage.getItem('oneshotcoding_token') : null;

  const headers: HeadersInit = {
    ...(options.body ? { 'Content-Type': 'application/json' } : {}),
    ...options.headers,
  };

  if (token) {
    (headers as Record<string, string>)['Authorization'] = `Bearer ${token}`;
  }

  try {
    const response = await fetch(`${API_URL}${endpoint}`, {
      ...options,
      headers,
      credentials: 'include',
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return {
        data: null,
        error: {
          message: errorData.error || errorData.message || 'An error occurred',
          statusCode: response.status,
        },
      };
    }

    const data = await response.json();
    return { data, error: null };
  } catch (error) {
    return {
      data: null,
      error: {
        message: error instanceof Error ? error.message : 'Network error',
        statusCode: 0,
      },
    };
  }
}

function get<T>(endpoint: string): Promise<ApiResponse<T>> {
  return fetchApi<T>(endpoint, { method: 'GET' });
}

function post<T>(endpoint: string, body?: unknown): Promise<ApiResponse<T>> {
  return fetchApi<T>(endpoint, {
    method: 'POST',
    body: body ? JSON.stringify(body) : undefined,
  });
}

function patch<T>(endpoint: string, body?: unknown): Promise<ApiResponse<T>> {
  return fetchApi<T>(endpoint, {
    method: 'PATCH',
    body: body ? JSON.stringify(body) : undefined,
  });
}

function del<T>(endpoint: string): Promise<ApiResponse<T>> {
  return fetchApi<T>(endpoint, { method: 'DELETE' });
}

// Types for admin endpoints
export interface AdminUserListItem {
  id: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
  isAdmin: boolean;
  createdAt: string;
  deletedAt: string | null;
  lastActiveAt: string | null;
  shotCount: number;
  followerCount: number;
}

export interface AdminUserDetail extends AdminUserListItem {
  bio: string | null;
  followingCount: number;
  totalSparkles: number;
  reportsAgainst: number;
}

export interface AdminShot {
  id: string;
  prompt: string;
  imageUrl: string;
  caption: string | null;
  resultType: 'image' | 'video' | 'link' | 'embed';
  createdAt: string;
  sparkleCount: number;
  commentCount: number;
  userId: string;
  username: string;
  displayName: string;
  challengeId: string | null;
}

export interface AdminComment {
  id: string;
  shotId: string;
  content: string;
  createdAt: string;
  userId: string;
  username: string;
  displayName: string;
}

export interface AdminChallenge {
  id: string;
  title: string;
  description: string | null;
  createdBy: string | null;
  isOfficial: boolean;
  isSponsored: boolean;
  sponsorName: string | null;
  prizeDescription: string | null;
  startsAt: string;
  endsAt: string;
  votingEndsAt: string | null;
  createdAt: string;
  status: 'upcoming' | 'active' | 'voting' | 'completed';
  submissionCount: number;
}

export interface AdminReport {
  id: string;
  reporterId: string;
  reporterUsername: string;
  reportedUserId: string | null;
  reportedUsername: string | null;
  reportedShotId: string | null;
  reportedCommentId: string | null;
  reason: 'spam' | 'harassment' | 'inappropriate' | 'impersonation' | 'other';
  details: string | null;
  status: 'pending' | 'reviewed' | 'actioned' | 'dismissed';
  reviewedBy: string | null;
  reviewedAt: string | null;
  actionTaken: 'none' | 'warning' | 'content_removed' | 'user_banned' | null;
  createdAt: string;
}

export interface AdminTag {
  id: string;
  name: string;
  shotCount: number;
  createdAt: string;
}

export interface AdminAuditLogEntry {
  id: string;
  adminUserId: string;
  adminUsername: string;
  action: string;
  targetType: string | null;
  targetId: string | null;
  details: Record<string, unknown> | null;
  createdAt: string;
}

export interface DashboardStats {
  totalUsers: number;
  activeToday: number;
  totalShots: number;
  pendingReports: number;
  newUsersToday: number;
  shotsToday: number;
}

export interface AnalyticsData {
  userGrowth: { date: string; count: number }[];
  contentStats: { date: string; shots: number; comments: number; sparkles: number }[];
  engagement: { dau: number; wau: number; mau: number };
  topCreators: { userId: string; username: string; shotCount: number; sparkleCount: number }[];
}

// API functions
export const adminApi = {
  // Auth
  getMe: () => get<{ user: AdminUser }>('/auth/me'),

  // Dashboard
  getDashboardStats: () => get<DashboardStats>('/admin/stats'),

  // Users
  getUsers: (params?: { search?: string; status?: string; isAdmin?: boolean; cursor?: string; limit?: number }) => {
    const searchParams = new URLSearchParams();
    if (params?.search) searchParams.set('search', params.search);
    if (params?.status) searchParams.set('status', params.status);
    if (params?.isAdmin !== undefined) searchParams.set('isAdmin', String(params.isAdmin));
    if (params?.cursor) searchParams.set('cursor', params.cursor);
    if (params?.limit) searchParams.set('limit', String(params.limit));
    const query = searchParams.toString();
    return get<{ users: AdminUserListItem[]; nextCursor: string | null; hasMore: boolean }>(
      `/admin/users${query ? `?${query}` : ''}`
    );
  },

  getUser: (id: string) => get<AdminUserDetail>(`/admin/users/${id}`),

  updateUser: (id: string, data: { isAdmin?: boolean }) =>
    patch<{ user: AdminUserDetail }>(`/admin/users/${id}`, data),

  banUser: (id: string, reason: string) =>
    post<{ success: boolean }>(`/admin/users/${id}/ban`, { reason }),

  deleteUser: (id: string) => del<{ success: boolean }>(`/admin/users/${id}`),

  revokeUserSessions: (id: string) =>
    post<{ success: boolean }>(`/admin/users/${id}/revoke`),

  // Shots
  getShots: (params?: { userId?: string; challengeId?: string; cursor?: string; limit?: number }) => {
    const searchParams = new URLSearchParams();
    if (params?.userId) searchParams.set('userId', params.userId);
    if (params?.challengeId) searchParams.set('challengeId', params.challengeId);
    if (params?.cursor) searchParams.set('cursor', params.cursor);
    if (params?.limit) searchParams.set('limit', String(params.limit));
    const query = searchParams.toString();
    return get<{ shots: AdminShot[]; nextCursor: string | null; hasMore: boolean }>(
      `/admin/shots${query ? `?${query}` : ''}`
    );
  },

  deleteShot: (id: string) => del<{ success: boolean }>(`/admin/shots/${id}`),

  // Comments
  getComments: (params?: { shotId?: string; userId?: string; cursor?: string; limit?: number }) => {
    const searchParams = new URLSearchParams();
    if (params?.shotId) searchParams.set('shotId', params.shotId);
    if (params?.userId) searchParams.set('userId', params.userId);
    if (params?.cursor) searchParams.set('cursor', params.cursor);
    if (params?.limit) searchParams.set('limit', String(params.limit));
    const query = searchParams.toString();
    return get<{ comments: AdminComment[]; nextCursor: string | null; hasMore: boolean }>(
      `/admin/comments${query ? `?${query}` : ''}`
    );
  },

  deleteComment: (id: string) => del<{ success: boolean }>(`/admin/comments/${id}`),

  // Challenges
  getChallenges: (params?: { status?: string; cursor?: string; limit?: number }) => {
    const searchParams = new URLSearchParams();
    if (params?.status) searchParams.set('status', params.status);
    if (params?.cursor) searchParams.set('cursor', params.cursor);
    if (params?.limit) searchParams.set('limit', String(params.limit));
    const query = searchParams.toString();
    return get<{ challenges: AdminChallenge[]; nextCursor: string | null; hasMore: boolean }>(
      `/admin/challenges${query ? `?${query}` : ''}`
    );
  },

  getChallenge: (id: string) => get<AdminChallenge>(`/admin/challenges/${id}`),

  createChallenge: (data: {
    title: string;
    description?: string;
    startsAt: string;
    endsAt: string;
    votingEndsAt?: string;
    isOfficial?: boolean;
    isSponsored?: boolean;
    sponsorName?: string;
    prizeDescription?: string;
  }) => post<{ challenge: AdminChallenge }>('/admin/challenges', data),

  updateChallenge: (id: string, data: Partial<{
    title: string;
    description: string;
    startsAt: string;
    endsAt: string;
    votingEndsAt: string;
    isOfficial: boolean;
    isSponsored: boolean;
    sponsorName: string;
    prizeDescription: string;
  }>) => patch<{ challenge: AdminChallenge }>(`/admin/challenges/${id}`, data),

  deleteChallenge: (id: string) => del<{ success: boolean }>(`/admin/challenges/${id}`),

  // Reports
  getReports: (params?: { status?: string; reason?: string; cursor?: string; limit?: number }) => {
    const searchParams = new URLSearchParams();
    if (params?.status) searchParams.set('status', params.status);
    if (params?.reason) searchParams.set('reason', params.reason);
    if (params?.cursor) searchParams.set('cursor', params.cursor);
    if (params?.limit) searchParams.set('limit', String(params.limit));
    const query = searchParams.toString();
    return get<{ reports: AdminReport[]; nextCursor: string | null; hasMore: boolean }>(
      `/reports${query ? `?${query}` : ''}`
    );
  },

  getReport: (id: string) => get<AdminReport>(`/reports/${id}`),

  updateReport: (id: string, data: {
    status: 'reviewed' | 'actioned' | 'dismissed';
    actionTaken?: 'none' | 'warning' | 'content_removed' | 'user_banned';
  }) => patch<{ report: AdminReport }>(`/reports/${id}`, data),

  // Tags
  getTags: (params?: { search?: string; cursor?: string; limit?: number }) => {
    const searchParams = new URLSearchParams();
    if (params?.search) searchParams.set('search', params.search);
    if (params?.cursor) searchParams.set('cursor', params.cursor);
    if (params?.limit) searchParams.set('limit', String(params.limit));
    const query = searchParams.toString();
    return get<{ tags: AdminTag[]; nextCursor: string | null; hasMore: boolean }>(
      `/admin/tags${query ? `?${query}` : ''}`
    );
  },

  deleteTag: (id: string) => del<{ success: boolean }>(`/admin/tags/${id}`),

  banTag: (id: string, reason: string) =>
    post<{ success: boolean }>(`/admin/tags/${id}/ban`, { reason }),

  // Analytics
  getAnalytics: (params?: { startDate?: string; endDate?: string }) => {
    const searchParams = new URLSearchParams();
    if (params?.startDate) searchParams.set('startDate', params.startDate);
    if (params?.endDate) searchParams.set('endDate', params.endDate);
    const query = searchParams.toString();
    return get<AnalyticsData>(`/admin/analytics${query ? `?${query}` : ''}`);
  },

  // Audit Log
  getAuditLog: (params?: { adminId?: string; action?: string; cursor?: string; limit?: number }) => {
    const searchParams = new URLSearchParams();
    if (params?.adminId) searchParams.set('adminId', params.adminId);
    if (params?.action) searchParams.set('action', params.action);
    if (params?.cursor) searchParams.set('cursor', params.cursor);
    if (params?.limit) searchParams.set('limit', String(params.limit));
    const query = searchParams.toString();
    return get<{ entries: AdminAuditLogEntry[]; nextCursor: string | null; hasMore: boolean }>(
      `/admin/audit-log${query ? `?${query}` : ''}`
    );
  },
};
