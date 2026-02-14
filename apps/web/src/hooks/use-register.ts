'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { useAuth } from '@/providers/auth-provider';

interface RegisterInput {
  email: string;
  password: string;
  displayName?: string;
}

interface RegisterResponse {
  accessToken: string;
}

/**
 * useRegister — React Query mutation for POST /auth/register.
 *
 * On success: stores the new access token and invalidates the user query.
 * If the user was previously a guest, the guest account is upgraded
 * (this is handled by the backend via the access token in the header).
 */
export function useRegister() {
  const { setToken } = useAuth();
  const queryClient = useQueryClient();

  return useMutation<RegisterResponse, Error, RegisterInput>({
    mutationFn: (input) =>
      apiClient<RegisterResponse>('/auth/register', {
        method: 'POST',
        body: input,
        skipGuest: true,
      }),
    onSuccess: (data) => {
      setToken(data.accessToken);
      queryClient.invalidateQueries({ queryKey: ['user', 'me'] });
    },
  });
}
