import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { server } from '@/test/mocks/server';
import { createWrapper } from '@/test/test-utils';
import { setAccessToken } from '@/lib/api-client';

// We need to mock the auth provider since useUser depends on it
vi.mock('@/providers/auth-provider', () => ({
  useAuth: vi.fn(),
}));

import { useAuth } from '@/providers/auth-provider';
import { useUser } from './use-user';

const API_BASE = 'http://localhost:3001';
const mockedUseAuth = vi.mocked(useAuth);

describe('useUser', () => {
  beforeEach(() => {
    setAccessToken(null);
    mockedUseAuth.mockReturnValue({
      token: null,
      setToken: vi.fn(),
      clearToken: vi.fn(),
      isInitialized: true,
    });
  });

  it('should return loading=true initially when token is present', async () => {
    setAccessToken('test-token');
    mockedUseAuth.mockReturnValue({
      token: 'test-token',
      setToken: vi.fn(),
      clearToken: vi.fn(),
      isInitialized: true,
    });

    server.use(
      http.get(`${API_BASE}/users/me`, async () => {
        // Delay to observe loading state
        await new Promise((r) => setTimeout(r, 50));
        return HttpResponse.json({
          id: 'user-1',
          email: 'a@b.com',
          isGuest: false,
        });
      }),
    );

    const { result } = renderHook(() => useUser(), {
      wrapper: createWrapper(),
    });

    expect(result.current.isLoading).toBe(true);
    await waitFor(() => expect(result.current.isLoading).toBe(false));
  });

  it('should return user data after successful fetch', async () => {
    setAccessToken('test-token');
    mockedUseAuth.mockReturnValue({
      token: 'test-token',
      setToken: vi.fn(),
      clearToken: vi.fn(),
      isInitialized: true,
    });

    const userData = {
      id: 'user-1',
      email: 'a@b.com',
      displayName: 'Test',
      isGuest: false,
      createdAt: '2026-01-01',
      updatedAt: '2026-01-01',
    };

    server.use(
      http.get(`${API_BASE}/users/me`, () => {
        return HttpResponse.json(userData);
      }),
    );

    const { result } = renderHook(() => useUser(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.data).toBeDefined());
    expect(result.current.data).toEqual(userData);
  });

  it('should not fetch when not authenticated (no token)', () => {
    mockedUseAuth.mockReturnValue({
      token: null,
      setToken: vi.fn(),
      clearToken: vi.fn(),
      isInitialized: true,
    });

    const { result } = renderHook(() => useUser(), {
      wrapper: createWrapper(),
    });

    // Query should not be enabled
    expect(result.current.fetchStatus).toBe('idle');
  });

  it('should return isGuest from user data', async () => {
    setAccessToken('guest-token');
    mockedUseAuth.mockReturnValue({
      token: 'guest-token',
      setToken: vi.fn(),
      clearToken: vi.fn(),
      isInitialized: true,
    });

    server.use(
      http.get(`${API_BASE}/users/me`, () => {
        return HttpResponse.json({
          id: 'guest-1',
          email: null,
          displayName: null,
          isGuest: true,
          createdAt: '2026-01-01',
          updatedAt: '2026-01-01',
        });
      }),
    );

    const { result } = renderHook(() => useUser(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.data).toBeDefined());
    expect(result.current.data?.isGuest).toBe(true);
  });
});
