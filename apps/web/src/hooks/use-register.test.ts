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
import { useRegister } from './use-register';

const API_BASE = 'http://localhost:3001';
const mockedUseAuth = vi.mocked(useAuth);

describe('useRegister', () => {
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

  it('should call POST /auth/register with form data', async () => {
    let capturedBody: any = null;
    server.use(
      http.post(`${API_BASE}/auth/register`, async ({ request }) => {
        capturedBody = await request.json();
        return HttpResponse.json({ accessToken: 'reg-token' });
      }),
    );

    const { result } = renderHook(() => useRegister(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      result.current.mutate({
        email: 'new@test.com',
        password: 'password123',
        displayName: 'New User',
      });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(capturedBody).toEqual({
      email: 'new@test.com',
      password: 'password123',
      displayName: 'New User',
    });
  });

  it('should set token and invalidate user query on success', async () => {
    server.use(
      http.post(`${API_BASE}/auth/register`, () => {
        return HttpResponse.json({ accessToken: 'reg-token' });
      }),
    );

    const queryClient = createTestQueryClient();
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

    const { result } = renderHook(() => useRegister(), {
      wrapper: createWrapper(queryClient),
    });

    await act(async () => {
      result.current.mutate({
        email: 'new@test.com',
        password: 'password123',
      });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockSetToken).toHaveBeenCalledWith('reg-token');
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['user', 'me'] });
  });

  it('should return error on duplicate email (409)', async () => {
    server.use(
      http.post(`${API_BASE}/auth/register`, () => {
        return HttpResponse.json(
          { message: 'Email already in use' },
          { status: 409 },
        );
      }),
    );

    const { result } = renderHook(() => useRegister(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      result.current.mutate({
        email: 'taken@test.com',
        password: 'password123',
      });
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error?.message).toContain('Email already in use');
  });
});
