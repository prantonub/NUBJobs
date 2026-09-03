"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  AUTH_EVENT,
  TOKEN_KEY,
  clearAuthToken,
  setAuthToken,
} from "@/lib/axios";

export type UserRole = "STUDENT" | "EMPLOYER" | "ADMIN" | (string & {});

export interface AuthUser {
  id?: string;
  name?: string;
  email?: string;
  role?: UserRole;
  [key: string]: unknown;
}

interface JwtPayload extends AuthUser {
  sub?: string;
  exp?: number;
  iat?: number;
}

/** Decode a base64url segment to a UTF-8 string (browser-only). */
function base64UrlDecode(input: string): string {
  const base64 = input.replace(/-/g, "+").replace(/_/g, "/");
  const padded = base64.padEnd(
    base64.length + ((4 - (base64.length % 4)) % 4),
    "="
  );
  const binary = atob(padded);
  const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

function decodeToken(token: string): JwtPayload | null {
  try {
    const payload = token.split(".")[1];
    if (!payload) return null;
    return JSON.parse(base64UrlDecode(payload)) as JwtPayload;
  } catch {
    return null;
  }
}

export interface UseAuthResult {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  role: UserRole | null;
  token: string | null;
  login: (token: string) => void;
  logout: () => void;
}

/**
 * Client-side auth state backed by a JWT in localStorage. Decodes the token
 * payload for the current user, keeps every hook instance in sync through a
 * window event, and exposes login/logout helpers. `isLoading` stays true until
 * the component mounts, since localStorage is unavailable during SSR.
 */
export function useAuth(): UseAuthResult {
  const router = useRouter();
  const [token, setToken] = React.useState<string | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);

  const read = React.useCallback(() => {
    if (typeof window === "undefined") return;
    setToken(window.localStorage.getItem(TOKEN_KEY));
    setIsLoading(false);
  }, []);

  React.useEffect(() => {
    read();
    const handler = () => read();
    window.addEventListener(AUTH_EVENT, handler);
    window.addEventListener("storage", handler); // sync across tabs
    return () => {
      window.removeEventListener(AUTH_EVENT, handler);
      window.removeEventListener("storage", handler);
    };
  }, [read]);

  const payload = React.useMemo(
    () => (token ? decodeToken(token) : null),
    [token]
  );

  const isExpired =
    typeof payload?.exp === "number" ? payload.exp * 1000 < Date.now() : false;

  const user: AuthUser | null =
    payload && !isExpired
      ? { ...payload, id: (payload.id ?? payload.sub) as string | undefined }
      : null;

  const login = React.useCallback((newToken: string) => {
    setAuthToken(newToken);
    setToken(newToken);
  }, []);

  const logout = React.useCallback(() => {
    clearAuthToken();
    setToken(null);
    router.replace("/login");
  }, [router]);

  return {
    user,
    isAuthenticated: Boolean(user),
    isLoading,
    role: user?.role ?? null,
    token: isExpired ? null : token,
    login,
    logout,
  };
}

export default useAuth;
