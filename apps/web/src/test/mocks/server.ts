import { setupServer } from 'msw/node';
import { handlers } from './handlers';

/**
 * MSW server instance for intercepting HTTP requests in tests.
 *
 * Started/stopped automatically via src/test/setup.ts.
 * Override handlers per-test with:
 *   server.use(http.get('/api/...', () => HttpResponse.json(...)));
 */
export const server = setupServer(...handlers);
