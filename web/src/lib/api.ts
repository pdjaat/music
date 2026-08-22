// REST client with token handling and friendly error mapping.

import type { User } from './types';

/**
 * Base URL for the Sangeet API.
 * - Empty (default): same-origin `/api` — used by the dev server proxy and by
 *   the Express server's built-in static hosting.
 * - Set `VITE_API_BASE` at build time (e.g. https://api.example.com) when the
 *   frontend is deployed statically (Vercel) and the API lives elsewhere.
 */
export const API_BASE: string = (import.meta.env.VITE_API_BASE as string | undefined)?.replace(/\/+$/, '') ?? '';

const TOKEN_KEY = 'sangeet_token';

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}
export function setToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}
export function clearToken(): void {
  localStorage.removeItem(TOKEN_KEY);
}

export class ApiError extends Error {
  status: number;
  code: string;
  constructor(status: number, code: string, message: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

interface ApiOptions {
  method?: string;
  body?: unknown;
  auth?: boolean;
}

export async function api<T>(path: string, opts: ApiOptions = {}): Promise<T> {
  const { method = 'GET', body, auth = true } = opts;
  const headers: Record<string, string> = { Accept: 'application/json' };
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  const token = getToken();
  if (auth && token) headers.Authorization = `Bearer ${token}`;

  let res: Response;
  try {
    res = await fetch(`${API_BASE}${path}`, { method, headers, body: body !== undefined ? JSON.stringify(body) : undefined });
  } catch {
    throw new ApiError(0, 'network', 'Could not reach the server. Check your connection.');
  }

  let data: Record<string, unknown> = {};
  try {
    data = (await res.json()) as Record<string, unknown>;
  } catch {
    data = {};
  }

  if (!res.ok) {
    const message = typeof data.message === 'string' ? data.message : `Request failed (${res.status}).`;
    const code = typeof data.error === 'string' ? data.error : 'error';
    if (res.status === 401 && code === 'authentication_required') {
      clearToken();
    }
    throw new ApiError(res.status, code, message);
  }
  return data as T;
}

export function authHeaders(): Record<string, string> {
  const token = getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

// ---- auth helpers ----
export interface AuthResponse {
  token: string;
  user: User;
}

export async function apiLogin(email: string, password: string): Promise<AuthResponse> {
  return api<AuthResponse>('/api/auth/login', { method: 'POST', body: { email, password }, auth: false });
}
export async function apiRegister(email: string, password: string, displayName: string): Promise<AuthResponse> {
  return api<AuthResponse>('/api/auth/register', { method: 'POST', body: { email, password, displayName }, auth: false });
}
export async function apiMe(): Promise<{ user: User }> {
  return api<{ user: User }>('/api/auth/me');
}
