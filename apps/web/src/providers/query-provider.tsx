'use client';

/**
 * QueryProvider — wraps the app with React Query's QueryClientProvider.
 *
 * This is a "use client" component because React Query manages client-side
 * state (cache, subscriptions). In Next.js App Router, layout.tsx is a
 * Server Component by default, so we need this wrapper to opt into client
 * rendering for the QueryClientProvider subtree.
 *
 * We use useState to create the QueryClient once per component lifecycle
 * (not on every render), matching React Query's recommended pattern for
 * Next.js App Router.
 */

import { useState } from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { makeQueryClient } from '@/lib/query-client';

export function QueryProvider({ children }: { children: React.ReactNode }) {
  // Create the client once — useState initializer runs only on first render
  const [queryClient] = useState(() => makeQueryClient());

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  );
}
