import { dehydrate, QueryClient, type DehydratedState } from '@tanstack/react-query';
import { qk } from '@gymos/app/api';
import { defaultOrigin, serverApiGet, type FetchLike } from './prefetch-coach';

/**
 * Prefetch GET /v1/today onto `qk.today` for S02's route file (HydrationBoundary). Any failure,
 * 401/403 included, leaves the cache empty: `useToday` then fetches and shows its own state.
 */
export const dehydrateToday = async ({
  cookieHeader,
  fetchImpl = fetch,
  apiOrigin = defaultOrigin(),
}: {
  cookieHeader: string;
  fetchImpl?: FetchLike;
  apiOrigin?: string;
}): Promise<DehydratedState> => {
  const queryClient = new QueryClient();
  if (cookieHeader.trim() === '') return dehydrate(queryClient);
  const result = await serverApiGet('/v1/today', cookieHeader, fetchImpl, apiOrigin);
  if (result.ok) queryClient.setQueryData(qk.today, result.data);
  return dehydrate(queryClient);
};
