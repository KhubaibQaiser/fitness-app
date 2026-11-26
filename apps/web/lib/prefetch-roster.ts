import { dehydrate, QueryClient, type DehydratedState } from '@tanstack/react-query';
import { qk } from '@gymos/app/api';
import { type RosterQuery } from '@gymos/contracts';
import { defaultOrigin, serverApiGet, type FetchLike } from './prefetch-coach';

/**
 * Prefetch the first roster page (`GET /v1/roster`) for HydrationBoundary, in the infinite-query
 * shape `useRoster(query)` reads. Any failure (no session, 401/403, 5xx) leaves the cache empty,
 * so the screen fetches on the client and shows its own error state.
 */
export const dehydrateRosterFirstPage = async ({
  cookieHeader,
  query = {},
  fetchImpl = fetch,
  apiOrigin = defaultOrigin(),
}: {
  cookieHeader: string;
  query?: Omit<RosterQuery, 'cursor'>;
  fetchImpl?: FetchLike;
  apiOrigin?: string;
}): Promise<DehydratedState> => {
  const queryClient = new QueryClient();
  if (cookieHeader.trim() === '') return dehydrate(queryClient);

  const search = new URLSearchParams(query).toString();
  const result = await serverApiGet(
    `/v1/roster${search ? `?${search}` : ''}`,
    cookieHeader,
    fetchImpl,
    apiOrigin,
  );
  if (result.ok) {
    queryClient.setQueryData(qk.roster(query), { pages: [result.data], pageParams: [null] });
  }
  return dehydrate(queryClient);
};
