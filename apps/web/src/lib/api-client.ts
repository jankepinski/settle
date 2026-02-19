/**
 * API Client — low-level fetch wrapper with auth interceptors.
 *
 * Responsibilities:
 * 1. Adds Authorization header when an access token is available
 * 2. Auto-refreshes the token on 401 and retries the original request
 * 3. Auto-creates a guest account on first action when no token exists
 *
 * The client does NOT manage React state — that's React Query's job.
 */

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

// ---- Token storage (in-memory only — never localStorage) -------------------

let accessToken: string | null = null;

export function getAccessToken() {
  return accessToken;
}

export function setAccessToken(token: string | null) {
  accessToken = token;
}

// ---- Core fetch wrapper ----------------------------------------------------

/** Endpoints that should never trigger auto-guest creation. */
const AUTH_ENDPOINTS = ['/auth/login', '/auth/register', '/auth/guest', '/auth/refresh'];

/** Flag to avoid multiple concurrent refresh attempts. */
let isRefreshing = false;
let refreshPromise: Promise<string | null> | null = null;

interface ApiClientOptions extends Omit<RequestInit, 'body'> {
  body?: unknown;
  /** If true, skip the auto-guest interceptor for this request. */
  skipGuest?: boolean;
}

export async function apiClient<T = unknown>(
  endpoint: string,
  options: ApiClientOptions = {},
): Promise<T> {
  const { body, skipGuest, ...fetchOptions } = options;

  // --- Auto-guest: create guest account if no token and not an auth endpoint
  if (
    !accessToken &&
    !skipGuest &&
    !AUTH_ENDPOINTS.some((e) => endpoint.startsWith(e))
  ) {
    await ensureGuest();
  }

  const res = await doFetch(endpoint, body, fetchOptions);

  // --- Auto-refresh on 401
  if (res.status === 401 && accessToken) {
    const newToken = await refreshAccessToken();
    if (newToken) {
      // Retry the original request with the new token
      const retryRes = await doFetch(endpoint, body, fetchOptions);
      if (!retryRes.ok) {
        throw await buildError(retryRes);
      }
      return retryRes.json() as Promise<T>;
    }
    // Refresh failed — clear token, throw
    setAccessToken(null);
    throw await buildError(res);
  }

  if (!res.ok) {
    throw await buildError(res);
  }

  // Handle 204 No Content or empty responses
  const text = await res.text();
  return text ? (JSON.parse(text) as T) : (undefined as unknown as T);
}

// ---- Internal helpers -------------------------------------------------------

async function doFetch(
  endpoint: string,
  body: unknown,
  options: RequestInit,
): Promise<Response> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (accessToken) {
    headers['Authorization'] = `Bearer ${accessToken}`;
  }

  return fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
    body: body ? JSON.stringify(body) : undefined,
    credentials: 'include', // send cookies (refresh token)
  });
}

async function ensureGuest(): Promise<void> {
  try {
    const res = await fetch(`${API_BASE}/auth/guest`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
    });
    if (res.ok) {
      const data = (await res.json()) as { accessToken: string };
      setAccessToken(data.accessToken);
    }
  } catch {
    // Guest creation failed — continue without auth
  }
}

async function refreshAccessToken(): Promise<string | null> {
  // De-duplicate concurrent refresh attempts
  if (isRefreshing && refreshPromise) {
    return refreshPromise;
  }

  isRefreshing = true;
  refreshPromise = (async () => {
    try {
      const res = await fetch(`${API_BASE}/auth/refresh`, {
        method: 'POST',
        credentials: 'include',
      });
      if (res.ok) {
        const data = (await res.json()) as { accessToken: string };
        setAccessToken(data.accessToken);
        return data.accessToken;
      }
      return null;
    } catch {
      return null;
    } finally {
      isRefreshing = false;
      refreshPromise = null;
    }
  })();

  return refreshPromise;
}

export class ApiError extends Error {
  constructor(
    public statusCode: number,
    message: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

async function buildError(res: Response): Promise<ApiError> {
  let message = res.statusText;
  try {
    const body = await res.json();
    message = body.message ?? message;
  } catch {
    // ignore parse errors
  }
  return new ApiError(res.status, message);
}
