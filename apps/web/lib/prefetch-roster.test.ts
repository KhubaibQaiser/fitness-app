import { hydrate, QueryClient } from '@tanstack/react-query';
import { describe, expect, it } from 'vitest';
import { rosterQueryOptions } from '@gymos/app/api';
import { type RosterPage } from '@gymos/contracts';
import { type FetchLike } from './prefetch-coach';
import { dehydrateRosterFirstPage } from './prefetch-roster';

const page: RosterPage = {
  items: [
    {
      id: '01a215cf-0000-7000-8000-000000000001',
      name: 'Ayesha',
      goalPreset: 'LOSE',
      lastCheckInOn: '2026-11-17',
      lastAdherence: 4,
      nextDueOn: '2026-11-24',
      weightKg: 78.3,
      weightChangeKg: -1.7,
      plan: { status: 'PUBLISHED', version: 2 },
    },
  ],
  nextCursor: 'next-page',
};

const jsonResponse = (status: number, body: unknown): Response =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });

describe('dehydrateRosterFirstPage', () => {
  it('returns an empty cache without fetching when the cookie header is missing', async () => {
    const state = await dehydrateRosterFirstPage({
      cookieHeader: ' ',
      fetchImpl: () => {
        throw new Error('must not fetch');
      },
    });
    expect(state.queries).toEqual([]);
  });

  it('returns an empty cache when the API refuses the session', async () => {
    const state = await dehydrateRosterFirstPage({
      cookieHeader: 'gymos_access=expired',
      fetchImpl: () => Promise.resolve(jsonResponse(401, { code: 'AUTH_REQUIRED' })),
    });
    expect(state.queries).toEqual([]);
  });

  it('hydrates page one where useRoster reads it, with the cursor for page two', async () => {
    const calls: { input: string; cookie: string | undefined }[] = [];
    const fetchImpl: FetchLike = (input, init) => {
      calls.push({ input, cookie: init?.headers?.cookie });
      return Promise.resolve(jsonResponse(200, page));
    };
    const query = { q: 'ay', sort: 'nextDue' } as const;

    const state = await dehydrateRosterFirstPage({
      cookieHeader: 'gymos_access=ok',
      query,
      fetchImpl,
      apiOrigin: 'http://api.test',
    });

    expect(calls).toEqual([
      { input: 'http://api.test/v1/roster?q=ay&sort=nextDue', cookie: 'gymos_access=ok' },
    ]);
    const client = new QueryClient();
    hydrate(client, state);
    const options = rosterQueryOptions(query);
    expect(client.getQueryData(options.queryKey)).toEqual({ pages: [page], pageParams: [null] });
    expect(options.getNextPageParam(page, [page], null, [null])).toBe('next-page');
  });
});
