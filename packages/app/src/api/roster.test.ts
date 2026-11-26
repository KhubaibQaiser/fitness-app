import { QueryClient } from '@tanstack/react-query';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { configureApiClient, type RosterPage } from '@gymos/contracts';
import { qk, rosterQueryOptions } from './index';

const page = (names: string[], nextCursor: string | null): RosterPage => ({
  items: names.map((name) => ({
    id: name,
    name,
    goalPreset: null,
    lastCheckInOn: null,
    lastAdherence: null,
    nextDueOn: null,
    weightKg: null,
    weightChangeKg: null,
    plan: null,
  })),
  nextCursor,
});

describe('rosterQueryOptions', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('follows nextCursor page by page and stops at the last page', async () => {
    const pages: Record<string, RosterPage> = {
      first: page(['Ali', 'Bina'], 'c1'),
      c1: page(['Dua'], null),
    };
    const urls: string[] = [];
    vi.stubGlobal(
      'fetch',
      vi.fn((url: string) => {
        urls.push(url);
        const cursor = new URL(url, 'http://local').searchParams.get('cursor') ?? 'first';
        return Promise.resolve(new Response(JSON.stringify(pages[cursor]), { status: 200 }));
      }),
    );
    configureApiClient({ baseUrl: '', getAccessToken: () => null });

    const query = { q: 'a b', sort: 'weight', dir: 'desc' } as const;
    const data = await new QueryClient().infiniteQuery({
      ...rosterQueryOptions(query),
      pages: 5,
    });

    expect(urls).toEqual([
      '/v1/roster?q=a+b&sort=weight&dir=desc',
      '/v1/roster?q=a+b&sort=weight&dir=desc&cursor=c1',
    ]);
    expect(data.pageParams).toEqual([null, 'c1']);
    expect(data.pages.flatMap((p) => p.items.map((r) => r.name))).toEqual(['Ali', 'Bina', 'Dua']);
    expect(rosterQueryOptions(query).queryKey).toEqual(qk.roster(query));
  });

  it('asks for /v1/roster with no query string by default', async () => {
    const fetchMock = vi.fn(() => Promise.resolve(new Response(JSON.stringify(page([], null)))));
    vi.stubGlobal('fetch', fetchMock);
    configureApiClient({ baseUrl: '', getAccessToken: () => null });

    await new QueryClient().infiniteQuery(rosterQueryOptions());

    expect(fetchMock).toHaveBeenCalledWith('/v1/roster', expect.anything());
  });
});
