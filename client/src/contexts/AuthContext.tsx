"use client";

import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { authApi, type AppUser } from '@/lib/api/auth.api';
import { connectSocket, disconnectSocket } from '@/lib/socket-client';

interface AuthContextValue {
  user: AppUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<AppUser>;
  logout: () => Promise<void>;
  register: (payload: { email: string; name: string; password: string; role: 'STUDENT' | 'EMPLOYER' }) => Promise<void>;
  setAuthTokens: (accessToken: string, refreshToken?: string) => void;
  refreshSession: () => Promise<void>;
}

const TOKEN_KEY = 'token';
const REFRESH_TOKEN_KEY = 'refreshToken';

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AppUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const setAuthTokens = (accessToken: string, refreshToken?: string) => {
    if (typeof window === 'undefined') return;
    localStorage.setItem(TOKEN_KEY, accessToken);
    if (refreshToken) localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
    connectSocket(accessToken);
  };

  const clearAuthTokens = () => {
    if (typeof window === 'undefined') return;
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
    disconnectSocket();
  };

  const refreshSession = async () => {
    const token = typeof window !== 'undefined' ? localStorage.getItem(TOKEN_KEY) : null;
    if (!token) {
      setUser(null);
      return;
    }

    try {
      const { data } = await authApi.me();
      setUser(data?.data?.user ?? data?.user ?? null);
    } catch {
      setUser(null);
      clearAuthTokens();
    }
  };

  const login = async (email: string, password: string) => {
    const { data } = await authApi.login({ email, password });
    const accessToken = data?.data?.accessToken ?? data?.accessToken;
    const refreshToken = data?.data?.refreshToken ?? data?.refreshToken;
    const nextUser = data?.data?.user ?? data?.user;

    if (accessToken) setAuthTokens(accessToken, refreshToken);
    if (nextUser) setUser(nextUser);
    return nextUser;
  };

  const register = async (payload: { email: string; name: string; password: string; role: 'STUDENT' | 'EMPLOYER' }) => {
    await authApi.register(payload);
  };

  const logout = async () => {
    try {
      await authApi.logout();
    } catch {
      // ignore logout failures
    } finally {
      clearAuthTokens();
      setUser(null);
    }
  };

  useEffect(() => {
    const initialize = async () => {
      try {
        const token = typeof window !== 'undefined' ? localStorage.getItem(TOKEN_KEY) : null;
        if (!token) {
          setUser(null);
          setIsLoading(false);
          return;
        }

        await refreshSession();
      } finally {
        setIsLoading(false);
      }
    };

    initialize();
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isAuthenticated: !!user,
      isLoading,
      login,
      logout,
      register,
      setAuthTokens,
      refreshSession,
    }),
    [user, isLoading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuthContext() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuthContext must be used within AuthProvider');
  }
  return context;
}
