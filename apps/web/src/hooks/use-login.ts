'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { useAuth } from '@/providers/auth-provider';

interface LoginInput {
  email: string;
  password: string;
}

interface LoginResponse {
  accessToken: string;
}

/**
 * useLogin — React Query mutation for POST /auth/login.
 *
 * On success: stores the new access token and invalidates the user query
 * so useUser() automatically refetches the user profile.
 */
export function useLogin() {
  const { setToken } = useAuth();
  const queryClient = useQueryClient();

  return useMutation<LoginResponse, Error, LoginInput>({
    mutationFn: (input) =>
      apiClient<LoginResponse>('/auth/login', {
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
