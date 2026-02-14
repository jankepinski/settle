import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render } from '@testing-library/react';

/**
 * Create a fresh QueryClient for testing.
 * Disables retries and caching to make tests deterministic.
 */
export function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
      },
      mutations: {
        retry: false,
      },
    },
  });
}

/**
 * Wrapper component for testing hooks and components that use React Query.
 */
export function createWrapper(queryClient?: QueryClient) {
  const client = queryClient ?? createTestQueryClient();
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    );
  };
}

/**
 * Render with all providers needed for testing (QueryClient, etc.).
 */
export function renderWithProviders(
  ui: React.ReactElement,
  queryClient?: QueryClient,
) {
  const client = queryClient ?? createTestQueryClient();
  return render(ui, {
    wrapper: createWrapper(client),
  });
}
