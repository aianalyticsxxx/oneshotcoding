'use client';

import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { User } from '@/lib/auth';
import {
  getToken,
  setToken,
  getUser,
  setUser,
  clearAuth,
  isAuthenticated,
} from '@/lib/auth';
import { api } from '@/lib/api';

export interface AuthContextValue {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (token: string) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
  refreshAuth: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);

  if (!context) {
    // Return a default implementation for when context isn't available
    // This happens during SSR or before provider mounts
    return useAuthState();
  }

  return context;
}

// Standalone hook for when we don't have context
function useAuthState(): AuthContextValue {
  const [user, setUserState] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refreshUser = useCallback(async () => {
    if (!isAuthenticated()) {
      setUserState(null);
      setIsLoading(false);
      return;
    }

    try {
      const { data, error } = await api.getMe();

      if (error || !data) {
        clearAuth();
        setUserState(null);
      } else {
        setUser(data.user);
        setUserState(data.user);
      }
    } catch {
      clearAuth();
      setUserState(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Refresh auth from cookies (used after OAuth callback)
  const refreshAuth = useCallback(async () => {
    setIsLoading(true);
    try {
      const { data, error } = await api.getMe();

      if (error || !data) {
        clearAuth();
        setUserState(null);
      } else {
        setUser(data.user);
        setUserState(data.user);
      }
    } catch {
      clearAuth();
      setUserState(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const login = useCallback(async (token: string) => {
    setToken(token);
    // Fetch user data directly instead of relying on refreshUser
    // to avoid stale closure issues
    setIsLoading(true);
    try {
      const { data, error } = await api.getMe();
      if (error || !data) {
        clearAuth();
        setUserState(null);
      } else {
        setUser(data.user);
        setUserState(data.user);
      }
    } catch {
      clearAuth();
      setUserState(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const logout = useCallback(() => {
    clearAuth();
    setUserState(null);
  }, []);

  useEffect(() => {
    // Check for stored user first
    const storedUser = getUser();
    if (storedUser) {
      setUserState(storedUser);
    }

    // Then validate with server
    if (getToken()) {
      refreshUser();
    } else {
      setIsLoading(false);
    }
  }, [refreshUser]);

  return {
    user,
    isLoading,
    isAuthenticated: !!user,
    login,
    logout,
    refreshUser,
    refreshAuth,
  };
}

export { AuthContext, useAuthState };
