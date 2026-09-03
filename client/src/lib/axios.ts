import axios, { AxiosError, type InternalAxiosRequestConfig } from "axios";

/** localStorage key holding the JWT access token. Shared with useAuth. */
export const TOKEN_KEY = "token";
/** Window event fired when the token changes so useAuth() instances re-sync. */
export const AUTH_EVENT = "nubjobs:auth-change";

const baseURL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5000/api";

export function getAuthToken(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(TOKEN_KEY);
}

export function setAuthToken(token: string): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(TOKEN_KEY, token);
  window.dispatchEvent(new Event(AUTH_EVENT));
}

export function clearAuthToken(): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(TOKEN_KEY);
  window.dispatchEvent(new Event(AUTH_EVENT));
}

/**
 * Shared axios instance. Talks to NEXT_PUBLIC_API_URL, sends cookies
 * (withCredentials) for the refresh-token cookie, attaches the bearer access
 * token to every request, and transparently refreshes on a 401.
 */
const api = axios.create({
  baseURL,
  withCredentials: true,
  headers: { "Content-Type": "application/json" },
});

// Attach the current access token to every outgoing request.
api.interceptors.request.use((config) => {
  const token = getAuthToken();
  if (token) config.headers.set("Authorization", `Bearer ${token}`);
  return config;
});

// ── Refresh-on-401 with a single-flight queue ────────────────────────────────
// While one refresh request is in flight, other 401s wait in `queue` and are
// replayed with the new token once it resolves (or all rejected on failure).
type QueueEntry = {
  resolve: (token: string) => void;
  reject: (error: unknown) => void;
};

let isRefreshing = false;
let queue: QueueEntry[] = [];

function flushQueue(error: unknown, token: string | null) {
  queue.forEach(({ resolve, reject }) => {
    if (token) resolve(token);
    else reject(error);
  });
  queue = [];
}

const REFRESH_URL = "/auth/refresh";

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const original = error.config as
      | (InternalAxiosRequestConfig & { _retry?: boolean })
      | undefined;

    const status = error.response?.status;
    const isRefreshCall = original?.url?.includes(REFRESH_URL);

    // Only handle a genuine, first-time 401 on a non-refresh request.
    if (!original || status !== 401 || original._retry || isRefreshCall) {
      return Promise.reject(error);
    }

    // A refresh is already running — queue this request behind it.
    if (isRefreshing) {
      return new Promise<string>((resolve, reject) => {
        queue.push({ resolve, reject });
      }).then((token) => {
        original.headers.set("Authorization", `Bearer ${token}`);
        return api(original);
      });
    }

    original._retry = true;
    isRefreshing = true;

    try {
      const { data } = await api.post(REFRESH_URL);
      const newToken: string | undefined = data?.accessToken ?? data?.token;
      if (!newToken) throw new Error("No access token in refresh response");

      setAuthToken(newToken);
      flushQueue(null, newToken);
      original.headers.set("Authorization", `Bearer ${newToken}`);
      return api(original);
    } catch (refreshError) {
      flushQueue(refreshError, null);
      clearAuthToken();
      if (typeof window !== "undefined") {
        window.location.assign("/login");
      }
      return Promise.reject(refreshError);
    } finally {
      isRefreshing = false;
    }
  }
);

export default api;
