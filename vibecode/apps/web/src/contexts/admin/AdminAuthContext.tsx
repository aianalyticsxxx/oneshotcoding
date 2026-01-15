'use client';

import {
  createContext,
  useContext,
  useState,
  useEffect,
  type ReactNode,
} from 'react';
import { adminApi, type AdminUser } from '@/lib/admin/api';

// Only this username can access the admin panel
const ALLOWED_ADMIN_USERNAME = 'aianalyticsxxx';

interface AdminAuthContextType {
  user: AdminUser | null;
  isLoading: boolean;
  isAdmin: boolean;
  logout: () => void;
  refetch: () => Promise<void>;
}

const AdminAuthContext = createContext<AdminAuthContextType | undefined>(undefined);

export function AdminAuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AdminUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchUser = async () => {
    // Use the main app's token from localStorage (stored as 'oneshotcoding_token')
    const token = localStorage.getItem('oneshotcoding_token');

    if (!token) {
      setUser(null);
      setIsLoading(false);
      return;
    }

    const { data, error } = await adminApi.getMe();
    if (error || !data) {
      setUser(null);
    } else {
      // Only allow the specific admin username
      if (data.user.username === ALLOWED_ADMIN_USERNAME) {
        setUser(data.user);
      } else {
        setUser(null);
      }
    }
    setIsLoading(false);
  };

  useEffect(() => {
    fetchUser();
  }, []);

  const logout = () => {
    localStorage.removeItem('oneshotcoding_token');
    setUser(null);
    window.location.href = '/';
  };

  return (
    <AdminAuthContext.Provider
      value={{
        user,
        isLoading,
        isAdmin: user?.username === ALLOWED_ADMIN_USERNAME,
        logout,
        refetch: fetchUser,
      }}
    >
      {children}
    </AdminAuthContext.Provider>
  );
}

export function useAdminAuth() {
  const context = useContext(AdminAuthContext);
  if (context === undefined) {
    throw new Error('useAdminAuth must be used within an AdminAuthProvider');
  }
  return context;
}
