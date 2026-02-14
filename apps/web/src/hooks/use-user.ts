'use client';

import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { useAuth } from '@/providers/auth-provider';

export interface User {
  id: string;
  email: string | null;
  displayName: string | null;
  isGuest: boolean;
  createdAt: string;
  updatedAt: string;
}

/**
 * useUser — React Query hook for the current user.
 *
 * Fetches GET /users/me and caches the result. This is the "source of truth"
 * for who the current user is. The query is only enabled when we have an
 * access token (otherwise there's no user to fetch).
 */
export function useUser() {
  const { token, isInitialized } = useAuth();

  return useQuery<User | null>({
    queryKey: ['user', 'me'],
    queryFn: async () => {
      try {
        return await apiClient<User>('/users/me', { skipGuest: true });
      } catch {
        return null;
      }
    },
    // Only fetch when we have a token AND initialization is complete
    enabled: isInitialized && !!token,
  });
}
