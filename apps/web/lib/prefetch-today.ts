import { dehydrate, QueryClient, type DehydratedState } from '@tanstack/react-query';
import { qk, type ClientScope } from '@gymos/app/api';
import { defaultOrigin, serverApiGet, type FetchLike } from './prefetch-coach';

/**
 * Prefetch GET /v1/today onto `qk.today` for S02's route file (HydrationBoundary). Any failure,
 * 401/403 included, leaves the cache empty: `useToday` then fetches and shows its own state.
 */
export const dehydrateToday = async ({
  cookieHeader,
  scope,
  fetchImpl = fetch,
  apiOrigin = defaultOrigin(),
}: {
  cookieHeader: string;
  /** The same scope the screen passes to `useToday`; absent means the server's default. */
  scope?: ClientScope;
  fetchImpl?: FetchLike;
  apiOrigin?: string;
}): Promise<DehydratedState> => {
  const queryClient = new QueryClient();
  if (cookieHeader.trim() === '') return dehydrate(queryClient);
  const path = `/v1/today${scope === undefined ? '' : `?scope=${scope}`}`;
  const result = await serverApiGet(path, cookieHeader, fetchImpl, apiOrigin);
  if (result.ok) queryClient.setQueryData(qk.today(scope), result.data);
  return dehydrate(queryClient);
};
