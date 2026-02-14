import { describe, it, expect, beforeEach, vi } from 'vitest';
import { http, HttpResponse } from 'msw';
import { server } from '@/test/mocks/server';
import { apiClient, setAccessToken, getAccessToken, ApiError } from './api-client';

const API_BASE = 'http://localhost:3001';

describe('apiClient', () => {
  beforeEach(() => {
    setAccessToken(null);
  });

  it('should add Authorization header when token available', async () => {
    setAccessToken('test-token');

    let capturedAuthHeader: string | null = null;
    server.use(
      http.get(`${API_BASE}/test`, ({ request }) => {
        capturedAuthHeader = request.headers.get('Authorization');
        return HttpResponse.json({ ok: true });
      }),
    );

    await apiClient('/test', { skipGuest: true });

    expect(capturedAuthHeader).toBe('Bearer test-token');
  });

  it('should auto-refresh token on 401 and retry request', async () => {
    setAccessToken('expired-token');

    let callCount = 0;
    server.use(
      http.get(`${API_BASE}/protected`, ({ request }) => {
        callCount++;
        const auth = request.headers.get('Authorization');
        if (auth === 'Bearer expired-token') {
          return new HttpResponse(null, { status: 401 });
        }
        if (auth === 'Bearer new-token') {
          return HttpResponse.json({ data: 'success' });
        }
        return new HttpResponse(null, { status: 401 });
      }),
      http.post(`${API_BASE}/auth/refresh`, () => {
        return HttpResponse.json({ accessToken: 'new-token' });
      }),
    );

    const result = await apiClient<{ data: string }>('/protected', {
      skipGuest: true,
    });

    expect(result.data).toBe('success');
    expect(callCount).toBe(2); // first call (401) + retry
    expect(getAccessToken()).toBe('new-token');
  });

  it('should auto-create guest on first action when no token', async () => {
    server.use(
      http.post(`${API_BASE}/auth/guest`, () => {
        return HttpResponse.json({ accessToken: 'guest-token' });
      }),
      http.post(`${API_BASE}/expenses`, ({ request }) => {
        const auth = request.headers.get('Authorization');
        expect(auth).toBe('Bearer guest-token');
        return HttpResponse.json({ id: 'expense-1' });
      }),
    );

    const result = await apiClient<{ id: string }>('/expenses', {
      method: 'POST',
      body: { amount: 100 },
    });

    expect(result.id).toBe('expense-1');
    expect(getAccessToken()).toBe('guest-token');
  });

  it('should not create guest for auth endpoints (login, register)', async () => {
    let guestCalled = false;
    server.use(
      http.post(`${API_BASE}/auth/guest`, () => {
        guestCalled = true;
        return HttpResponse.json({ accessToken: 'guest-token' });
      }),
      http.post(`${API_BASE}/auth/login`, () => {
        return HttpResponse.json({ accessToken: 'login-token' });
      }),
    );

    await apiClient('/auth/login', {
      method: 'POST',
      body: { email: 'a@b.com', password: 'pass' },
      skipGuest: true,
    });

    expect(guestCalled).toBe(false);
  });

  it('should throw on 401 after refresh also fails', async () => {
    setAccessToken('expired-token');

    server.use(
      http.get(`${API_BASE}/protected`, () => {
        return new HttpResponse(
          JSON.stringify({ message: 'Unauthorized' }),
          { status: 401 },
        );
      }),
      http.post(`${API_BASE}/auth/refresh`, () => {
        return new HttpResponse(null, { status: 401 });
      }),
    );

    await expect(
      apiClient('/protected', { skipGuest: true }),
    ).rejects.toThrow(ApiError);
  });
});
