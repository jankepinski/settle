'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { useAuth } from '@/providers/auth-provider';

/**
 * useLogout — React Query mutation for POST /auth/logout.
 *
 * On success: clears the access token and removes ALL cached queries.
 * This ensures no stale user-specific data is shown after logout.
 */
export function useLogout() {
  const { clearToken } = useAuth();
  const queryClient = useQueryClient();

  return useMutation<void, Error, void>({
    mutationFn: () =>
      apiClient<void>('/auth/logout', {
        method: 'POST',
        skipGuest: true,
      }),
    onSuccess: () => {
      clearToken();
      queryClient.clear();
    },
  });
}
