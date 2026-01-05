import { getToken } from './auth';

// Use proxy for API calls - rewrites handle routing to the correct backend
const API_URL = '/api';

export interface ApiError {
  message: string;
  statusCode: number;
}

export interface ApiResponse<T> {
  data: T | null;
  error: ApiError | null;
}

export interface Vibe {
  id: string;
  imageUrl: string;
  caption: string | null;
  createdAt: string;
  sparkleCount: number;
  hasSparkled: boolean;
  isLate: boolean;
  lateByMinutes: number;
  user: {
    id: string;
    username: string;
    displayName: string;
    avatarUrl: string | null;
  };
}

export interface VibecheckStatus {
  vibecheck: {
    id: string;
    vibecheckDate: string;
    triggerTime: string;
    windowEndTime: string;
  } | null;
  status: 'waiting' | 'active' | 'late' | 'closed';
  timeRemainingSeconds: number | null;
  hasPostedToday: boolean;
  userPostIsLate: boolean | null;
}

export interface UserStreak {
  currentStreak: number;
  longestStreak: number;
  lastPostDate: string | null;
  streakStartedAt: string | null;
  milestone: {
    days: number;
    name: string;
    emoji: string;
  } | null;
  nextMilestone: {
    days: number;
    name: string;
    emoji: string;
    daysRemaining: number;
  } | null;
}

export interface Reaction {
  id: string;
  vibeId: string;
  userId: string;
  reactionType: 'sparkle' | 'photo';
  imageUrl: string | null;
  createdAt: string;
  user: {
    id: string;
    username: string;
    displayName: string;
    avatarUrl: string | null;
  };
}

export interface ReactionsResponse {
  reactions: Reaction[];
  total: number;
  sparkleCount: number;
  photoCount: number;
}

export interface PaginatedResponse<T> {
  items: T[];
  nextCursor: string | null;
  hasMore: boolean;
}

/**
 * Base fetch wrapper with auth
 */
async function fetchApi<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> {
  const token = getToken();

  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  if (token) {
    (headers as Record<string, string>)['Authorization'] = `Bearer ${token}`;
  }

  try {
    const response = await fetch(`${API_URL}${endpoint}`, {
      ...options,
      headers,
      credentials: 'include', // Include cookies for auth
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return {
        data: null,
        error: {
          message: errorData.message || 'An error occurred',
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

/**
 * GET request
 */
export function get<T>(endpoint: string): Promise<ApiResponse<T>> {
  return fetchApi<T>(endpoint, { method: 'GET' });
}

/**
 * POST request
 */
export function post<T>(
  endpoint: string,
  body?: unknown
): Promise<ApiResponse<T>> {
  return fetchApi<T>(endpoint, {
    method: 'POST',
    body: body ? JSON.stringify(body) : undefined,
  });
}

/**
 * PUT request
 */
export function put<T>(endpoint: string, body?: unknown): Promise<ApiResponse<T>> {
  return fetchApi<T>(endpoint, {
    method: 'PUT',
    body: body ? JSON.stringify(body) : undefined,
  });
}

/**
 * PATCH request
 */
export function patch<T>(endpoint: string, body?: unknown): Promise<ApiResponse<T>> {
  return fetchApi<T>(endpoint, {
    method: 'PATCH',
    body: body ? JSON.stringify(body) : undefined,
  });
}

/**
 * DELETE request
 */
export function del<T>(endpoint: string): Promise<ApiResponse<T>> {
  return fetchApi<T>(endpoint, { method: 'DELETE' });
}

/**
 * Upload file with multipart form data
 */
export async function uploadFile<T>(
  endpoint: string,
  file: File,
  additionalData?: Record<string, string>
): Promise<ApiResponse<T>> {
  const token = getToken();
  const formData = new FormData();
  formData.append('image', file);

  if (additionalData) {
    Object.entries(additionalData).forEach(([key, value]) => {
      formData.append(key, value);
    });
  }

  try {
    const headers: HeadersInit = {};
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${API_URL}${endpoint}`, {
      method: 'POST',
      headers,
      body: formData,
      credentials: 'include', // Include cookies for auth
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return {
        data: null,
        error: {
          message: errorData.message || 'Upload failed',
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
        message: error instanceof Error ? error.message : 'Upload error',
        statusCode: 0,
      },
    };
  }
}

// API Endpoints
export const api = {
  // Auth
  getMe: () => get<{ user: import('./auth').User }>('/auth/me'),

  // Vibes
  getFeed: (cursor?: string) =>
    get<PaginatedResponse<Vibe>>(`/vibes${cursor ? `?cursor=${cursor}` : ''}`),

  getVibe: (id: string) => get<Vibe>(`/vibes/${id}`),

  createVibe: (file: File, caption?: string) =>
    uploadFile<Vibe>('/vibes', file, caption ? { caption } : undefined),

  deleteVibe: (id: string) => del<void>(`/vibes/${id}`),

  // Discovery feed
  getDiscoveryFeed: (cursor?: string, sort: 'recent' | 'popular' = 'recent') =>
    get<PaginatedResponse<Vibe>>(`/vibes/discovery?sort=${sort}${cursor ? `&cursor=${cursor}` : ''}`),

  // Sparkles
  sparkleVibe: (vibeId: string) => post<{ sparkleCount: number }>(`/vibes/${vibeId}/vibe`),

  unsparkleVibe: (vibeId: string) => del<{ sparkleCount: number }>(`/vibes/${vibeId}/vibe`),

  // Photo reactions
  addPhotoReaction: (vibeId: string, imageUrl: string, imageKey: string) =>
    post<{ success: boolean; reactionCount: number }>(`/vibes/${vibeId}/reactions/photo`, { imageUrl, imageKey }),

  removePhotoReaction: (vibeId: string) =>
    del<{ success: boolean; reactionCount: number }>(`/vibes/${vibeId}/reactions/photo`),

  getReactions: (vibeId: string) => get<ReactionsResponse>(`/vibes/${vibeId}/reactions`),

  // Users
  getUser: (username: string) =>
    get<import('./auth').User>(`/users/${username}`),

  getUserVibes: (username: string, cursor?: string) =>
    get<PaginatedResponse<Vibe>>(`/users/${username}/vibes${cursor ? `?cursor=${cursor}` : ''}`),

  updateProfile: (data: { displayName?: string; bio?: string }) =>
    patch<{ user: import('./auth').User }>('/users/me', data),

  // Streaks
  getUserStreak: (username: string) => get<UserStreak>(`/users/${username}/streak`),

  getStreakLeaderboard: () =>
    get<{
      leaderboard: Array<{
        rank: number;
        username: string;
        displayName: string;
        avatarUrl: string | null;
        currentStreak: number;
        milestone: { days: number; name: string; emoji: string } | null;
      }>;
    }>('/users/streaks/leaderboard'),

  // VibeCheck
  getVibecheckStatus: () => get<VibecheckStatus>('/vibecheck/today'),

  generateVibecheck: () => post<{ id: string; triggerTime: string; windowEndTime: string }>('/vibecheck/generate'),

  // Daily vibe check
  getDailyVibeStatus: () => get<{ hasPostedToday: boolean; todaysVibe: Vibe | null }>('/vibes/today'),
};
