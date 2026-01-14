const TOKEN_KEY = 'oneshotcoding_token';
const USER_KEY = 'oneshotcoding_user';

export interface User {
  id: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
  bio: string | null;
  createdAt: string;
}

/**
 * Get the stored auth token
 */
export function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(TOKEN_KEY);
}

/**
 * Set the auth token
 */
export function setToken(token: string): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(TOKEN_KEY, token);
}

/**
 * Remove the auth token
 */
export function removeToken(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(TOKEN_KEY);
}

/**
 * Get the stored user
 */
export function getUser(): User | null {
  if (typeof window === 'undefined') return null;
  const user = localStorage.getItem(USER_KEY);
  return user ? JSON.parse(user) : null;
}

/**
 * Set the stored user
 */
export function setUser(user: User): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

/**
 * Remove the stored user
 */
export function removeUser(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(USER_KEY);
}

/**
 * Check if the user is authenticated
 */
export function isAuthenticated(): boolean {
  return !!getToken();
}

/**
 * Clear all auth data
 */
export function clearAuth(): void {
  removeToken();
  removeUser();
}

/**
 * Get the GitHub OAuth URL
 */
export function getGitHubOAuthUrl(): string {
  // For OAuth redirect, we need the actual backend URL (not the proxy)
  // because GitHub redirects back to this URL
  const apiUrl = process.env.NEXT_PUBLIC_AUTH_URL ||
    (typeof window !== 'undefined' && window.location.hostname !== 'localhost'
      ? 'https://oneshotcoding-production.up.railway.app'
      : 'http://localhost:4000');
  return `${apiUrl}/auth/github`;
}

/**
 * Get the Twitter OAuth URL
 */
export function getTwitterOAuthUrl(link?: boolean): string {
  const apiUrl = process.env.NEXT_PUBLIC_AUTH_URL ||
    (typeof window !== 'undefined' && window.location.hostname !== 'localhost'
      ? 'https://oneshotcoding-production.up.railway.app'
      : 'http://localhost:4000');
  return `${apiUrl}/auth/twitter${link ? '?link=true' : ''}`;
}

/**
 * Parse auth callback params
 */
export function parseAuthCallback(searchParams: URLSearchParams): {
  token?: string;
  error?: string;
} {
  const token = searchParams.get('token');
  const error = searchParams.get('error');

  return {
    token: token || undefined,
    error: error || undefined,
  };
}
