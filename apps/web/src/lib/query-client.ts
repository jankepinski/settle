import { QueryClient } from '@tanstack/react-query';

/**
 * Create a QueryClient with sensible defaults for the Splitwise app.
 *
 * staleTime: 5 minutes — data fetched within the last 5 min won't trigger
 *   a background refetch. Keeps the app snappy while still showing fresh data.
 *
 * retry: 1 — retry failed requests once. Auth errors (401) are handled by
 *   the API client's auto-refresh logic, so we don't need many retries.
 *
 * refetchOnWindowFocus: true — when the user switches back to the tab,
 *   React Query checks if data is stale and refetches. Great for collaborative
 *   apps like Splitwise where data can change while the tab is inactive.
 */
export function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 5 * 60 * 1000, // 5 minutes
        retry: 1,
        refetchOnWindowFocus: true,
      },
    },
  });
}
