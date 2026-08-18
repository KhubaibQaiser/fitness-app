import { dehydrate, QueryClient, type DehydratedState } from '@tanstack/react-query';
import { qk } from '@gymos/app/api';

export type CoachQuery = 'me' | 'unread' | 'due' | 'clients' | 'notifications';

export const isAuthBlockedStatus = (status: number): boolean => status === 401 || status === 403;

const PATH: Record<CoachQuery, string> = {
  me: '/v1/me',
  unread: '/v1/notifications/unread-count',
  due: '/v1/check-ins',
  clients: '/v1/clients',
  notifications: '/v1/notifications',
};

const queryKey = (key: CoachQuery) => {
  switch (key) {
    case 'me':
      return qk.me;
    case 'unread':
      return qk.unread;
    case 'due':
      return qk.dueCheckIns;
    case 'clients':
      return qk.clients();
    case 'notifications':
      return qk.notifications;
  }
};

export type FetchLike = (
  input: string,
  init?: { headers?: Record<string, string>; cache?: RequestCache },
) => Promise<Response>;

const defaultOrigin = (): string => process.env.API_ORIGIN ?? 'http://localhost:8080';

export const serverApiGet = async (
  path: string,
  cookieHeader: string,
  fetchImpl: FetchLike,
  apiOrigin: string,
): Promise<{ ok: true; data: unknown } | { ok: false; status: number }> => {
  const response = await fetchImpl(`${apiOrigin}${path}`, {
    headers: {
      cookie: cookieHeader,
      'x-client-version': 'pilot-web',
      'x-client-platform': 'web',
    },
    cache: 'no-store',
  });
  if (!response.ok) return { ok: false, status: response.status };
  return { ok: true, data: (await response.json()) as unknown };
};

/** Prefetch coach queries for HydrationBoundary. 401/403 yields an empty cache. */
export const dehydrateCoachQueries = async ({
  cookieHeader,
  include,
  fetchImpl = fetch,
  apiOrigin = defaultOrigin(),
}: {
  cookieHeader: string;
  include: readonly CoachQuery[];
  fetchImpl?: FetchLike;
  apiOrigin?: string;
}): Promise<DehydratedState> => {
  const queryClient = new QueryClient();
  if (cookieHeader.trim() === '' || include.length === 0) return dehydrate(queryClient);

  const results = await Promise.all(
    include.map(async (key) => {
      const result = await serverApiGet(PATH[key], cookieHeader, fetchImpl, apiOrigin);
      return { key, result };
    }),
  );

  if (results.some(({ result }) => !result.ok && isAuthBlockedStatus(result.status))) {
    return dehydrate(new QueryClient());
  }

  for (const { key, result } of results) {
    if (result.ok) queryClient.setQueryData(queryKey(key), result.data);
  }
  return dehydrate(queryClient);
};
