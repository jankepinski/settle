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
import { useLogout } from './use-logout';

const API_BASE = 'http://localhost:3001';
const mockedUseAuth = vi.mocked(useAuth);

describe('useLogout', () => {
  const mockClearToken = vi.fn();

  beforeEach(() => {
    setAccessToken('existing-token');
    mockClearToken.mockClear();
    mockedUseAuth.mockReturnValue({
      token: 'existing-token',
      setToken: vi.fn(),
      clearToken: mockClearToken,
      isInitialized: true,
    });
  });

  it('should call POST /auth/logout', async () => {
    let logoutCalled = false;
    server.use(
      http.post(`${API_BASE}/auth/logout`, () => {
        logoutCalled = true;
        return HttpResponse.json({ message: 'Logged out' });
      }),
    );

    const { result } = renderHook(() => useLogout(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      result.current.mutate();
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(logoutCalled).toBe(true);
  });

  it('should clear token and clear all queries on success', async () => {
    server.use(
      http.post(`${API_BASE}/auth/logout`, () => {
        return HttpResponse.json({ message: 'Logged out' });
      }),
    );

    const queryClient = createTestQueryClient();
    const clearSpy = vi.spyOn(queryClient, 'clear');

    const { result } = renderHook(() => useLogout(), {
      wrapper: createWrapper(queryClient),
    });

    await act(async () => {
      result.current.mutate();
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockClearToken).toHaveBeenCalled();
    expect(clearSpy).toHaveBeenCalled();
  });
});
