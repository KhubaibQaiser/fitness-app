import { describe, expect, it } from 'vitest';
import { dehydrateCoachQueries, isAuthBlockedStatus, type FetchLike } from './prefetch-coach';

const jsonResponse = (status: number, body: unknown): Response =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });

describe('dehydrateCoachQueries', () => {
  it('treats 401 and 403 as auth blocks', () => {
    expect(isAuthBlockedStatus(401)).toBe(true);
    expect(isAuthBlockedStatus(403)).toBe(true);
    expect(isAuthBlockedStatus(500)).toBe(false);
  });

  it('returns an empty cache when the cookie header is missing', async () => {
    const state = await dehydrateCoachQueries({
      cookieHeader: '',
      include: ['me'],
      fetchImpl: () => {
        throw new Error('must not fetch');
      },
    });
    expect(state.queries).toEqual([]);
  });

  it('returns an empty cache on 401 so GateGuard can CSR', async () => {
    const fetchImpl: FetchLike = () =>
      Promise.resolve(jsonResponse(401, { code: 'AUTH_REQUIRED' }));
    const state = await dehydrateCoachQueries({
      cookieHeader: 'gymos_access=expired',
      include: ['me', 'unread'],
      fetchImpl,
    });
    expect(state.queries).toEqual([]);
  });

  it('dehydrates successful payloads onto the shared query keys', async () => {
    const me = { userId: 'u1', name: 'Khubaib Qaiser' };
    const fetchImpl: FetchLike = (input) => {
      if (input.endsWith('/v1/me')) return Promise.resolve(jsonResponse(200, me));
      if (input.endsWith('/v1/notifications/unread-count')) {
        return Promise.resolve(jsonResponse(200, { count: 2 }));
      }
      return Promise.resolve(jsonResponse(404, {}));
    };
    const state = await dehydrateCoachQueries({
      cookieHeader: 'gymos_access=ok',
      include: ['me', 'unread'],
      fetchImpl,
      apiOrigin: 'http://api.test',
    });
    const names = state.queries.map((query) => query.queryKey);
    expect(names).toContainEqual(['me']);
    expect(names).toContainEqual(['notifications', 'unread']);
    const meQuery = state.queries.find(
      (query) => JSON.stringify(query.queryKey) === JSON.stringify(['me']),
    );
    expect(meQuery?.state.data).toEqual(me);
  });
});
