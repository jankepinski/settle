import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { server } from '@/test/mocks/server';
import { createWrapper, createTestQueryClient } from '@/test/test-utils';
import { setAccessToken } from '@/lib/api-client';

vi.mock('@/providers/auth-provider', () => ({
  useAuth: vi.fn(),
}));

import { useAuth } from '@/providers/auth-provider';
import { useLogin } from './use-login';

const API_BASE = 'http://localhost:3001';
const mockedUseAuth = vi.mocked(useAuth);

describe('useLogin', () => {
  const mockSetToken = vi.fn();

  beforeEach(() => {
    setAccessToken(null);
    mockSetToken.mockClear();
    mockedUseAuth.mockReturnValue({
      token: null,
      setToken: mockSetToken,
      clearToken: vi.fn(),
      isInitialized: true,
    });
  });

  it('should call POST /auth/login with email and password', async () => {
    let capturedBody: any = null;
    server.use(
      http.post(`${API_BASE}/auth/login`, async ({ request }) => {
        capturedBody = await request.json();
        return HttpResponse.json({ accessToken: 'login-token' });
      }),
    );

    const queryClient = createTestQueryClient();
    const { result } = renderHook(() => useLogin(), {
      wrapper: createWrapper(queryClient),
    });

    await act(async () => {
      result.current.mutate({ email: 'a@b.com', password: 'pass123' });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(capturedBody).toEqual({ email: 'a@b.com', password: 'pass123' });
  });

  it('should set token and invalidate user query on success', async () => {
    server.use(
      http.post(`${API_BASE}/auth/login`, () => {
        return HttpResponse.json({ accessToken: 'new-login-token' });
      }),
    );

    const queryClient = createTestQueryClient();
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

    const { result } = renderHook(() => useLogin(), {
      wrapper: createWrapper(queryClient),
    });

    await act(async () => {
      result.current.mutate({ email: 'a@b.com', password: 'pass123' });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockSetToken).toHaveBeenCalledWith('new-login-token');
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['user', 'me'] });
  });

  it('should return error on invalid credentials', async () => {
    server.use(
      http.post(`${API_BASE}/auth/login`, () => {
        return HttpResponse.json(
          { message: 'Invalid email or password' },
          { status: 401 },
        );
      }),
    );

    const { result } = renderHook(() => useLogin(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      result.current.mutate({ email: 'a@b.com', password: 'wrong' });
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error).toBeDefined();
  });

  it('should expose isPending while request in flight', async () => {
    let resolveRequest: (() => void) | undefined;
    const requestPromise = new Promise<void>((resolve) => {
      resolveRequest = resolve;
    });

    server.use(
      http.post(`${API_BASE}/auth/login`, async () => {
        await requestPromise;
        return HttpResponse.json({ accessToken: 'token' });
      }),
    );

    const { result } = renderHook(() => useLogin(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      result.current.mutate({ email: 'a@b.com', password: 'pass' });
    });

    // The request is blocked, so mutation should be pending
    await waitFor(() => expect(result.current.isPending).toBe(true));

    // Unblock the request
    await act(async () => {
      resolveRequest!();
    });

    await waitFor(() => expect(result.current.isPending).toBe(false));
  });
});
