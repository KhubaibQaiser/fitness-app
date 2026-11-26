import { readFileSync } from 'node:fs';
import path from 'node:path';
import { PGlite } from '@electric-sql/pglite';
import { and, eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/pglite';
import { migrate } from 'drizzle-orm/pglite/migrator';
import { beforeAll, describe, expect, it } from 'vitest';
import { schema as s, seed, type Db, type SeedResult } from '@gymos/db';
import { hashPassword } from '@gymos/modules/identity';
import {
  resetManifestCache,
  resetRegistryCache,
  tenantManifestSchema,
} from '@gymos/modules/tenancy';
import { buildApp, type App } from '../src/app';

const JWT_SECRET = 'a-test-jwt-access-secret-that-is-long-enough';
const PASSWORD = 'roster-test-password';
const BULK = 120;
const PAGE = 50;
const TARGETS = { kcal: 2000, proteinG: 150, fatG: 65, carbsG: 180, fiberG: 28 };
const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;

type Row = {
  id: string;
  name: string;
  goalPreset: string | null;
  lastCheckInOn: string | null;
  lastAdherence: number | null;
  nextDueOn: string | null;
  weightKg: number | null;
  weightChangeKg: number | null;
  plan: { status: string; version: number } | null;
};
type Page = { items: Row[]; nextCursor: string | null };

const manifest = tenantManifestSchema.parse(
  JSON.parse(
    readFileSync(path.resolve(import.meta.dirname, '../../../infra/tenants/pilot.json'), 'utf8'),
  ),
);

let app: App;
let db: Db;
let seeded: SeedResult;
let queryCount = 0;
const token = { pilot: '', joined: '', otherOrg: '', member: '' };
const ids = { field: '', joinedClient: '', otherOrgClient: '' };

const pad = (n: number) => String(n).padStart(2, '0');

const addUser = async (
  email: string,
  roles: { role: 'COACH' | 'ORG_ADMIN' | 'CLIENT'; orgId: string; outletId?: string }[],
): Promise<{ userId: string; coachId: string | null }> => {
  const [user] = await db
    .insert(s.users)
    .values({ email, name: email, passwordHash: await hashPassword(PASSWORD) })
    .returning();
  if (!user) throw new Error('user insert failed');
  await db.insert(s.memberships).values(roles.map((r) => ({ userId: user.id, ...r })));
  if (!roles.some((r) => r.role === 'COACH')) return { userId: user.id, coachId: null };
  const [coach] = await db.insert(s.coaches).values({ userId: user.id }).returning();
  if (!coach) throw new Error('coach insert failed');
  return { userId: user.id, coachId: coach.id };
};

const addClient = async (
  name: string,
  outletId: string,
  coachId: string,
  status: 'active' | 'archived' = 'active',
): Promise<string> => {
  const [client] = await db
    .insert(s.clients)
    .values({ outletId, name, sex: 'F', status })
    .returning();
  if (!client) throw new Error('client insert failed');
  await db.insert(s.coachAssignments).values({ coachId, clientId: client.id, outletId });
  return client.id;
};

const login = async (email: string): Promise<string> => {
  const res = await app.request('/v1/auth/login', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email, password: PASSWORD }),
  });
  expect(res.status).toBe(200);
  return ((await res.json()) as { accessToken: string }).accessToken;
};

const roster = (bearer: string, params: Record<string, string> = {}) =>
  app.request(`/v1/roster?${new URLSearchParams(params).toString()}`, {
    headers: { authorization: `Bearer ${bearer}` },
  });

const getPage = async (bearer: string, params: Record<string, string> = {}): Promise<Page> => {
  const res = await roster(bearer, params);
  expect(res.status).toBe(200);
  return (await res.json()) as Page;
};

/** Every page for one query, in order, following nextCursor to the end. */
const walk = async (bearer: string, params: Record<string, string> = {}): Promise<Page[]> => {
  const pages = [await getPage(bearer, params)];
  for (let cursor = pages[0]?.nextCursor; cursor; cursor = pages.at(-1)?.nextCursor) {
    pages.push(await getPage(bearer, { ...params, cursor }));
    if (pages.length > 20) throw new Error('pagination did not end');
  }
  return pages;
};

const activeOrgClientIds = async (orgId: string): Promise<string[]> => {
  const rows = await db
    .select({ id: s.clients.id })
    .from(s.clients)
    .innerJoin(s.outlets, eq(s.outlets.id, s.clients.outletId))
    .where(and(eq(s.outlets.orgId, orgId), eq(s.clients.status, 'active')));
  return rows.map((r) => r.id).sort();
};

const SORT_VALUE = {
  name: (r: Row) => r.name,
  lastCheckIn: (r: Row) => r.lastCheckInOn,
  nextDue: (r: Row) => r.nextDueOn,
  weight: (r: Row) => r.weightKg,
  weightChange: (r: Row) => r.weightChangeKg,
  adherence: (r: Row) => r.lastAdherence,
} as const;

/** a sorts at or before b: by value in `dir` with nulls last, then by id ascending. */
const inOrder = (sort: keyof typeof SORT_VALUE, dir: 'asc' | 'desc', a: Row, b: Row): boolean => {
  const va = SORT_VALUE[sort](a);
  const vb = SORT_VALUE[sort](b);
  if (va === null || vb === null) return vb === null && (va !== null || a.id < b.id);
  const byValue =
    typeof va === 'string' && typeof vb === 'string' && sort === 'name'
      ? va.localeCompare(vb, 'en', { sensitivity: 'base' })
      : va < vb
        ? -1
        : va > vb
          ? 1
          : 0;
  if (byValue !== 0) return dir === 'asc' ? byValue < 0 : byValue > 0;
  return a.id < b.id;
};

beforeAll(async () => {
  resetManifestCache();
  resetRegistryCache();
  const pglite = drizzle(new PGlite(), {
    schema: s,
    logger: {
      logQuery: () => {
        queryCount += 1;
      },
    },
  });
  await migrate(pglite, {
    migrationsFolder: path.resolve(import.meta.dirname, '../../../packages/db/migrations'),
  });
  db = pglite as unknown as Db;
  seeded = await seed(db, {
    coachPasswordHash: await hashPassword(PASSWORD),
    tenantManifest: manifest as unknown as Record<string, unknown>,
    tenantSlug: manifest.slug,
  });
  const { outletId, coachId, coachUserId, orgId } = seeded;

  // Bulk clients with repeated names and sort values, so ties and nulls cross page boundaries.
  const bulk = await db
    .insert(s.clients)
    .values(
      Array.from({ length: BULK }, (_, i) => ({
        outletId,
        name: i % 10 === 0 ? 'Same Name' : `Bulk ${String(i).padStart(3, '0')}`,
        sex: 'M' as const,
      })),
    )
    .returning({ id: s.clients.id });
  await db
    .insert(s.coachAssignments)
    .values(bulk.map((c) => ({ coachId, clientId: c.id, outletId })));
  const withGoal = bulk.flatMap((c, i) => (i % 4 === 0 ? [] : [{ ...c, i }]));
  const goals = await db
    .insert(s.clientGoals)
    .values(
      withGoal.map(({ id, i }) => ({
        clientId: id,
        outletId,
        preset: (['LOSE', 'GAIN', 'MAINTAIN'] as const)[i % 3] ?? 'LOSE',
        rate: 'STANDARD' as const,
        startDate: '2026-01-01',
        startWeightKg: 70 + (i % 5),
        expectedWeeklyDeltaKg: -0.5,
      })),
    )
    .returning({ id: s.clientGoals.id, clientId: s.clientGoals.clientId });
  const indexOf = new Map(withGoal.map(({ id, i }) => [id, i]));
  await db.insert(s.checkIns).values(
    goals.flatMap((g) => {
      const i = indexOf.get(g.clientId) ?? 0;
      const due = {
        clientId: g.clientId,
        outletId,
        goalId: g.id,
        scheduledFor: `2026-12-${pad(1 + (i % 28))}`,
        status: 'DUE' as const,
      };
      if (i % 2 !== 0) return [due];
      return [
        due,
        {
          clientId: g.clientId,
          outletId,
          goalId: g.id,
          scheduledFor: `2026-${pad(1 + (i % 10))}-${pad(1 + (i % 27))}`,
          status: 'COMPLETED' as const,
          completedAt: '2026-11-01T10:00:00Z',
          adherenceRating: i % 6 === 0 ? null : 1 + (i % 5),
        },
      ];
    }),
  );
  await db.insert(s.vitals).values(
    bulk.flatMap((c, i) =>
      i % 3 === 0
        ? []
        : [
            {
              clientId: c.id,
              outletId,
              recordedAt: '2026-11-15T08:00:00Z',
              recordedBy: coachUserId,
              weightKg: 60 + (i % 17) + 0.25,
            },
          ],
    ),
  );
  await db.insert(s.mealPlans).values(
    bulk.flatMap((c, i) =>
      i % 5 === 0
        ? [
            {
              clientId: c.id,
              coachId,
              outletId,
              version: 1,
              status: i % 10 === 0 ? ('PUBLISHED' as const) : ('DRAFT' as const),
              targets: TARGETS,
            },
          ]
        : [],
    ),
  );

  // One client with known values for every row field.
  ids.field = await addClient('Field Check', outletId, coachId);
  const [fieldGoal] = await db
    .insert(s.clientGoals)
    .values({
      clientId: ids.field,
      outletId,
      preset: 'LOSE',
      rate: 'STANDARD',
      startDate: '2026-09-01',
      startWeightKg: 80,
      expectedWeeklyDeltaKg: -0.5,
    })
    .returning();
  if (!fieldGoal) throw new Error('goal insert failed');
  await db.insert(s.vitals).values(
    [
      { recordedAt: '2026-10-01T08:00:00Z', weightKg: 81.2 },
      { recordedAt: '2026-11-20T08:00:00Z', weightKg: 78.3 },
      { recordedAt: '2026-11-25T08:00:00Z', weightKg: null, restingHr: 60 },
    ].map((v) => ({ ...v, clientId: ids.field, outletId, recordedBy: coachUserId })),
  );
  await db.insert(s.checkIns).values(
    [
      { scheduledFor: '2026-11-10', status: 'COMPLETED' as const, adherenceRating: 3 },
      { scheduledFor: '2026-11-17', status: 'COMPLETED' as const, adherenceRating: 4 },
      { scheduledFor: '2026-11-24', status: 'DUE' as const, adherenceRating: null },
    ].map((c) => ({ ...c, clientId: ids.field, outletId, goalId: fieldGoal.id })),
  );
  await db.insert(s.mealPlans).values(
    (['SUPERSEDED', 'PUBLISHED', 'DRAFT', 'ARCHIVED'] as const).map((status, k) => ({
      clientId: ids.field,
      coachId,
      outletId,
      version: k + 1,
      status,
      targets: TARGETS,
    })),
  );

  await addClient('100% Effort', outletId, coachId);
  await addClient('under_score', outletId, coachId);
  await addClient('Archived Person', outletId, coachId, 'archived');

  // A second coach who joined the pilot outlet (COACH only), and a coach in another organization.
  const joined = await addUser('joined@pilot.local', [{ role: 'COACH', orgId, outletId }]);
  ids.joinedClient = await addClient('Joined Coach Client', outletId, joined.coachId ?? '');
  const [otherOrg] = await db.insert(s.organizations).values({ name: 'Other Gym' }).returning();
  if (!otherOrg) throw new Error('org insert failed');
  const [otherOutlet] = await db
    .insert(s.outlets)
    .values({ orgId: otherOrg.id, name: 'Other Branch', timezone: 'Asia/Karachi' })
    .returning();
  if (!otherOutlet) throw new Error('outlet insert failed');
  const other = await addUser('other@other.local', [
    { role: 'COACH', orgId: otherOrg.id, outletId: otherOutlet.id },
    { role: 'ORG_ADMIN', orgId: otherOrg.id },
  ]);
  ids.otherOrgClient = await addClient('Other Org Client', otherOutlet.id, other.coachId ?? '');
  await addUser('member@pilot.local', [{ role: 'CLIENT', orgId, outletId }]);

  app = buildApp({ db, manifest, env: { JWT_ACCESS_SECRET: JWT_SECRET, AI_MODE: 'fallback' } });
  token.pilot = await login('coach@pilot.local');
  token.joined = await login('joined@pilot.local');
  token.otherOrg = await login('other@other.local');
  token.member = await login('member@pilot.local');
});

describe('GET /v1/roster pagination', () => {
  const cases = Object.keys(SORT_VALUE).flatMap((sort) =>
    (['asc', 'desc'] as const).map((dir) => [sort as keyof typeof SORT_VALUE, dir] as const),
  );

  it.each(cases)('sort=%s dir=%s pages through every client once, in order', async (sort, dir) => {
    const pages = await walk(token.pilot, { sort, dir });
    const rows = pages.flatMap((p) => p.items);
    const expected = await activeOrgClientIds(seeded.orgId);

    expect(expected.length).toBeGreaterThan(2 * PAGE);
    expect(pages.map((p) => p.items.length)).toEqual([PAGE, PAGE, expected.length - 2 * PAGE]);
    expect(pages.at(-1)?.nextCursor).toBeNull();
    expect(new Set(rows.map((r) => r.id)).size).toBe(rows.length);
    expect(rows.map((r) => r.id).sort()).toEqual(expected);
    rows.slice(1).forEach((row, k) => {
      const previous = rows[k];
      if (previous === undefined) throw new Error('missing row');
      expect(inOrder(sort, dir, previous, row), `${previous.name} before ${row.name}`).toBe(true);
    });
  });

  it('defaults to name ascending', async () => {
    const byDefault = await getPage(token.pilot);
    const explicit = await getPage(token.pilot, { sort: 'name', dir: 'asc' });
    expect(byDefault).toEqual(explicit);
  });

  it('rejects a malformed cursor or one issued for another sort or direction', async () => {
    const first = await getPage(token.pilot, { sort: 'name' });
    const cursor = first.nextCursor ?? '';
    for (const params of [
      { sort: 'name', cursor: 'not-a-cursor' },
      { sort: 'weight', cursor },
      { sort: 'name', dir: 'desc', cursor },
    ]) {
      const res = await roster(token.pilot, params);
      expect(res.status).toBe(422);
      expect(((await res.json()) as { code: string }).code).toBe('INVALID_CURSOR');
    }
    expect((await roster(token.pilot, { sort: 'plan' })).status).toBe(422);
  });

  it('runs the same number of queries for one row as for a full page (no N+1)', async () => {
    queryCount = 0;
    expect((await getPage(token.pilot, { q: 'Field Check' })).items).toHaveLength(1);
    const forOne = queryCount;
    queryCount = 0;
    expect((await getPage(token.pilot)).items).toHaveLength(PAGE);
    expect(queryCount).toBe(forOne);
  });
});

describe('GET /v1/roster rows', () => {
  it('returns every row field, metric and date-only', async () => {
    const { items } = await getPage(token.pilot, { q: 'field check' });
    expect(items).toEqual([
      {
        id: ids.field,
        name: 'Field Check',
        goalPreset: 'LOSE',
        lastCheckInOn: '2026-11-17',
        lastAdherence: 4,
        nextDueOn: '2026-11-24',
        weightKg: 78.3,
        weightChangeKg: -1.7,
        plan: { status: 'DRAFT', version: 3 },
      },
    ]);
  });

  it('sends dates as YYYY-MM-DD and never lists archived clients', async () => {
    const rows = (await walk(token.pilot)).flatMap((p) => p.items);
    for (const row of rows) {
      for (const date of [row.lastCheckInOn, row.nextDueOn]) {
        if (date !== null) expect(date).toMatch(DATE_ONLY);
      }
    }
    expect(rows.some((r) => r.name === 'Archived Person')).toBe(false);
  });
});

describe('GET /v1/roster search', () => {
  it('matches part of a name, ignoring case', async () => {
    const { items } = await getPage(token.pilot, { q: 'bulk 01' });
    // Bulk 010 is one of the 'Same Name' rows.
    expect(items.map((r) => r.name)).toEqual(
      Array.from({ length: 9 }, (_, k) => `Bulk 01${k + 1}`),
    );
  });

  it('treats % and _ as literal characters', async () => {
    expect((await getPage(token.pilot, { q: '%' })).items.map((r) => r.name)).toEqual([
      '100% Effort',
    ]);
    expect((await getPage(token.pilot, { q: '_' })).items.map((r) => r.name)).toEqual([
      'under_score',
    ]);
  });

  it('pages search results with the same cursor rules', async () => {
    const rows = (await walk(token.pilot, { q: 'bulk', sort: 'weight' })).flatMap((p) => p.items);
    expect(rows).toHaveLength(BULK - BULK / 10);
    expect(new Set(rows.map((r) => r.id)).size).toBe(rows.length);
  });
});

describe('GET /v1/roster authorization', () => {
  it("never lists another organization's clients", async () => {
    const pilotRows = (await walk(token.pilot)).flatMap((p) => p.items);
    expect(pilotRows.some((r) => r.id === ids.otherOrgClient)).toBe(false);
    const otherRows = (await walk(token.otherOrg)).flatMap((p) => p.items);
    expect(otherRows.map((r) => r.id)).toEqual([ids.otherOrgClient]);
  });

  it("lists only a coach's own clients, never another coach's in the same outlet", async () => {
    const rows = (await walk(token.joined)).flatMap((p) => p.items);
    expect(rows.map((r) => r.id)).toEqual([ids.joinedClient]);
    expect((await getPage(token.joined, { q: 'Field Check' })).items).toEqual([]);
  });

  it('returns 404 to a user with no roster grant', async () => {
    expect((await roster(token.member)).status).toBe(404);
  });

  it('returns 401 without a session', async () => {
    expect((await app.request('/v1/roster')).status).toBe(401);
  });
});

describe('GET /v1/roster keyset', () => {
  it('neither repeats nor skips a row when the list changes between pages', async () => {
    const before = (await walk(token.pilot)).flatMap((p) => p.items);
    const first = await getPage(token.pilot);
    const [archivedFirst] = first.items;
    if (archivedFirst === undefined || first.nextCursor === null) throw new Error('no first page');

    // Remove a row from page 1 and add one that sorts before the cursor: an offset would now
    // skip one row; the keyset continues right after the last row the client saw.
    await db
      .update(s.clients)
      .set({ status: 'archived' })
      .where(eq(s.clients.id, archivedFirst.id));
    const added = await addClient('AAA Added Later', seeded.outletId, seeded.coachId);
    try {
      const second = await getPage(token.pilot, { cursor: first.nextCursor });
      expect(second.items.map((r) => r.id)).toEqual(before.slice(PAGE, 2 * PAGE).map((r) => r.id));
    } finally {
      await db
        .update(s.clients)
        .set({ status: 'active' })
        .where(eq(s.clients.id, archivedFirst.id));
      await db.delete(s.coachAssignments).where(eq(s.coachAssignments.clientId, added));
      await db.delete(s.clients).where(eq(s.clients.id, added));
    }
  });
});
