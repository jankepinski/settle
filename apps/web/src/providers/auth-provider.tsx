'use client';

/**
 * AuthProvider — thin React Context that holds the access token in memory.
 *
 * This is intentionally minimal. It does NOT fetch user data or manage
 * loading/error states — that's React Query's job (see useUser hook).
 *
 * Why a Context at all? Because the API client (a plain module) needs to
 * read/write the token, and React Query hooks need to know when the token
 * changes. The Context is the glue between them.
 */

import {
  createContext,
  useContext,
  useCallback,
  useMemo,
  useEffect,
  useState,
} from 'react';
import {
  getAccessToken,
  setAccessToken as setApiClientToken,
} from '@/lib/api-client';

interface AuthContextValue {
  /** Get the current access token (may be null). */
  token: string | null;
  /** Set a new access token (also updates the API client). */
  setToken: (token: string | null) => void;
  /** Clear the token (convenience for logout). */
  clearToken: () => void;
  /** Whether we've tried to restore the session on mount. */
  isInitialized: boolean;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  // Keep a React state in sync with the API client's in-memory token
  // so that components re-render when auth state changes.
  const [token, setTokenState] = useState<string | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);

  const setToken = useCallback((newToken: string | null) => {
    setApiClientToken(newToken);
    setTokenState(newToken);
  }, []);

  const clearToken = useCallback(() => {
    setApiClientToken(null);
    setTokenState(null);
  }, []);

  // On mount, try to restore the session by calling /auth/refresh.
  // If the refresh cookie is valid, we get a new access token.
  useEffect(() => {
    const tryRestore = async () => {
      try {
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001'}/auth/refresh`,
          { method: 'POST', credentials: 'include' },
        );
        if (res.ok) {
          const data = (await res.json()) as { accessToken: string };
          setToken(data.accessToken);
        }
      } catch {
        // No session to restore — that's fine
      } finally {
        setIsInitialized(true);
      }
    };
    tryRestore();
  }, [setToken]);

  const value = useMemo(
    () => ({ token, setToken, clearToken, isInitialized }),
    [token, setToken, clearToken, isInitialized],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return ctx;
}
