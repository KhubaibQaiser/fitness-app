import { describe, expect, it } from 'vitest';
import { type FetchLike } from './prefetch-coach';
import { dehydrateToday } from './prefetch-today';

const jsonResponse = (status: number, body: unknown): Response =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });

const today = {
  scope: 'mine',
  groups: { redFlags: [], plansBlocked: [], overdue: [], dueToday: [], drafts: [] },
  counts: { redFlags: 0, plansBlocked: 0, overdue: 0, dueToday: 0, drafts: 0 },
  nextDueOn: '2026-11-30',
};

describe('dehydrateToday', () => {
  it('returns an empty cache without a cookie, and does not fetch', async () => {
    const state = await dehydrateToday({
      cookieHeader: ' ',
      fetchImpl: () => {
        throw new Error('must not fetch');
      },
    });
    expect(state.queries).toEqual([]);
  });

  it('dehydrates GET /v1/today onto the key useToday reads, forwarding the cookie', async () => {
    const calls: { url: string; cookie: string | undefined }[] = [];
    const fetchImpl: FetchLike = (input, init) => {
      calls.push({ url: input, cookie: init?.headers?.cookie });
      return Promise.resolve(jsonResponse(200, today));
    };
    const state = await dehydrateToday({
      cookieHeader: 'gymos_access=ok',
      fetchImpl,
      apiOrigin: 'http://api.test',
    });
    expect(calls).toEqual([{ url: 'http://api.test/v1/today', cookie: 'gymos_access=ok' }]);
    expect(state.queries).toHaveLength(1);
    expect(state.queries[0]?.queryKey).toEqual(['today']);
    expect(state.queries[0]?.state.data).toEqual(today);
  });

  it('asks for the given scope and caches it under that scope', async () => {
    const urls: string[] = [];
    const state = await dehydrateToday({
      cookieHeader: 'gymos_access=ok',
      scope: 'all',
      fetchImpl: (input) => {
        urls.push(input);
        return Promise.resolve(jsonResponse(200, { ...today, scope: 'all' }));
      },
      apiOrigin: 'http://api.test',
    });
    expect(urls).toEqual(['http://api.test/v1/today?scope=all']);
    expect(state.queries[0]?.queryKey).toEqual(['today', 'all']);
  });

  it.each([401, 403, 500])(
    'leaves the cache empty on %i so the screen fetches and shows its own state',
    async (status) => {
      const state = await dehydrateToday({
        cookieHeader: 'gymos_access=ok',
        fetchImpl: () => Promise.resolve(jsonResponse(status, { code: 'X' })),
      });
      expect(state.queries).toEqual([]);
    },
  );
});
