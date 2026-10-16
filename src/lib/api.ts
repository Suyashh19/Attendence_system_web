import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import { create } from 'zustand';
import { storage } from './storage';

export const SERVER_URL = (
  import.meta.env.VITE_SERVER_URL || 'https://attendance-system-backend-uqgy.onrender.com'
).replace(/\/+$/, '');

export const TOKEN_KEY = 'auth_token';

const api = axios.create({
  baseURL: `${SERVER_URL}/api`,
  timeout: 60000,
  headers: { 'Content-Type': 'application/json' },
});

// ─── Slow-request tracking ────────────────────────────────────────────────────
// The free Render server sleeps when idle and takes up to a minute to wake.
// A request still pending after this long shows the "waking up" banner.
const SLOW_REQUEST_MS = 3000;

export const useServerStatus = create<{ slowRequests: number }>(() => ({ slowRequests: 0 }));

const slowTimers = new WeakMap<object, { timer: ReturnType<typeof setTimeout>; fired: boolean }>();

function trackRequest(config: object) {
  const entry = {
    fired: false,
    timer: setTimeout(() => {
      entry.fired = true;
      useServerStatus.setState((s) => ({ slowRequests: s.slowRequests + 1 }));
    }, SLOW_REQUEST_MS),
  };
  slowTimers.set(config, entry);
}

function untrackRequest(config: object | undefined) {
  const entry = config && slowTimers.get(config);
  if (!entry) return;
  clearTimeout(entry.timer);
  slowTimers.delete(config);
  if (entry.fired) {
    useServerStatus.setState((s) => ({ slowRequests: Math.max(0, s.slowRequests - 1) }));
  }
}

api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  trackRequest(config);
  const token = storage.get(TOKEN_KEY);
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (response) => {
    untrackRequest(response.config);
    return response;
  },
  (error: AxiosError) => {
    untrackRequest(error.config);

    // A 401 (or the backend refusing this account on the web) on a request that carried
    // a token means the session can no longer be used. Login and password checks answer
    // 401 for a wrong password, which is not a dead session.
    const url = error.config?.url ?? '';
    const sentToken = !!error.config?.headers?.Authorization;
    const isCredentialCheck = url.includes('/auth/login') || url.includes('/auth/update-password');
    const status = error.response?.status;

    if ((status === 401 || (status === 403 && isAccountBlock(error))) && sentToken && !isCredentialCheck) {
      storage.remove(TOKEN_KEY);
      unauthorizedHandler?.();
    }
    return Promise.reject(error);
  }
);

// The backend refuses web tokens for anything but faculty with this message
function isAccountBlock(error: AxiosError): boolean {
  const message = (error.response?.data as { error?: string } | undefined)?.error ?? '';
  return /mobile app/i.test(message);
}

// The auth store registers its logout here (importing the store directly would be a circular import)
let unauthorizedHandler: (() => void) | null = null;

export function setUnauthorizedHandler(handler: () => void): void {
  unauthorizedHandler = handler;
}

/** Start waking the server (and its database) as soon as the page opens. Fire and forget. */
export function warmUpServer(): void {
  api.get('/health', { baseURL: SERVER_URL, params: { db: 1 } }).catch(() => null);
}

/** Best message to show the user for a failed request. */
export function getErrorMessage(err: unknown, fallback: string): string {
  const e = err as { response?: { data?: { error?: string; message?: string } }; code?: string; message?: string };
  const data = e?.response?.data;
  if (data?.error) return data.error;
  if (data?.message) return data.message;
  if (e?.code === 'ECONNABORTED' || e?.message === 'Network Error') {
    return 'Could not reach the server. Check your internet connection and try again.';
  }
  return fallback;
}

export default api;
