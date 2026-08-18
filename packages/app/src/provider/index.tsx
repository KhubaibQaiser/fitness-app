'use client';

import {
  HydrationBoundary,
  QueryClient,
  QueryClientProvider,
  type DehydratedState,
} from '@tanstack/react-query';
import { useEffect, useState, type ReactNode } from 'react';
import { getSessionPresence, subscribeSessionPresence } from '../features/shell/session-presence';

/**
 * App-level providers (Tamagui's provider lives in the platform shell —
 * apps/web wraps it with the Next SSR insertion hook).
 */
export const AppProviders = ({
  children,
  dehydratedState,
}: {
  children: ReactNode;
  dehydratedState?: DehydratedState;
}) => {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 15_000,
            retry: (failureCount, error) => {
              // Never retry gate/authz failures — redirect handles those.
              const status = (error as { status?: number }).status;
              if (status === 401 || status === 403 || status === 404) return false;
              return failureCount < 2;
            },
          },
        },
      }),
  );

  useEffect(
    () =>
      subscribeSessionPresence(() => {
        if (!getSessionPresence()) queryClient.clear();
      }),
    [queryClient],
  );

  return (
    <QueryClientProvider client={queryClient}>
      <HydrationBoundary state={dehydratedState}>{children}</HydrationBoundary>
    </QueryClientProvider>
  );
};
