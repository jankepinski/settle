/**
 * MSW request handlers for tests.
 *
 * Add handlers here to mock API responses in component/integration tests.
 *
 * Example:
 *   import { http, HttpResponse } from 'msw';
 *
 *   export const handlers = [
 *     http.get('/api/groups', () => {
 *       return HttpResponse.json([
 *         { id: '1', name: 'Apartment' },
 *       ]);
 *     }),
 *   ];
 */

import type { RequestHandler } from 'msw';

export const handlers: RequestHandler[] = [];
