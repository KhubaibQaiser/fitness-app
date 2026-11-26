import { readFileSync } from 'node:fs';
import path from 'node:path';
import { PGlite } from '@electric-sql/pglite';
import { eq, sql } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/pglite';
import { migrate } from 'drizzle-orm/pglite/migrator';
import { beforeAll, describe, expect, it } from 'vitest';
import { schema, seed, type Db, type SeedResult } from '@gymos/db';
import { hashPassword, resetPrincipalCache } from '@gymos/modules/identity';
import { notify } from '@gymos/modules/notifications';
import {
  resetManifestCache,
  resetRegistryCache,
  tenantManifestSchema,
} from '@gymos/modules/tenancy';
import { buildApp, type App } from '../src/app';
import { etagMatches } from '../src/routes/today';
import { pulseResponse, todayResponse } from '../src/schemas';

const JWT_SECRET = 'a-test-jwt-access-secret-that-is-long-enough';
const COACH_PASSWORD = 'pilot-coach-test-password';

const manifest = tenantManifestSchema.parse(
  JSON.parse(
    readFileSync(path.resolve(import.meta.dirname, '../../../infra/tenants/pilot.json'), 'utf8'),
  ),
);

let app: App;
let db: Db;
let seeded: SeedResult;
let tokenA = '';
let tokenB = '';
let tokenDesk = '';
let tokenOther = '';

/** The seeded outlet's calendar day (YYYY-MM-DD), offset by `days`. Karachi has no DST. */
const outletDay = (days: number) =>
  new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Karachi' }).format(
    Date.now() + days * 86_400_000,
  );

const addDueCheckIn = async (
  clientId: string,
  outletId: string,
  dueOn: string,
  goalStatus: 'ACTIVE' | 'ACHIEVED' = 'ACTIVE',
) => {
  const [goal] = await db
    .insert(schema.clientGoals)
    .values({
      clientId,
      outletId,
      preset: 'LOSE',
      rate: 'STANDARD',
      startDate: '2026-09-01',
      startWeightKg: 90,
      expectedWeeklyDeltaKg: -0.5,
      status: goalStatus,
    })
    .returning();
  if (!goal) throw new Error('goal insert failed');
  await db
    .insert(schema.checkIns)
    .values({ clientId, outletId, goalId: goal.id, scheduledFor: dueOn, status: 'DUE' });
};

const addDueClient = async (
  name: string,
  coachId: string,
  dueOn: string,
  outletId = seeded.outletId,
) => {
  const [client] = await db
    .insert(schema.clients)
    .values({ outletId, name, sex: 'M', status: 'active' })
    .returning();
  if (!client) throw new Error('client insert failed');
  await db.insert(schema.coachAssignments).values({ coachId, clientId: client.id, outletId });
  await addDueCheckIn(client.id, outletId, dueOn);
  return client.id;
};

const newUser = async (email: string) => {
  const [user] = await db
    .insert(schema.users)
    .values({ email, name: email, locale: 'en', passwordHash: await hashPassword(COACH_PASSWORD) })
    .returning();
  if (!user) throw new Error('user insert failed');
  return user;
};

/** A second user in the pilot org who joined with the join code: COACH, or FRONT_DESK without a coach row. */
const addMember = async (email: string, role: 'COACH' | 'FRONT_DESK') => {
  const user = await newUser(email);
  await db
    .insert(schema.memberships)
    .values({ userId: user.id, role, orgId: seeded.orgId, outletId: seeded.outletId });
  if (role === 'FRONT_DESK') return null;
  const [coach] = await db.insert(schema.coaches).values({ userId: user.id }).returning();
  if (!coach) throw new Error('coach insert failed');
  return coach.id;
};

/** A coach who signed up alone: their own org, outlet, and COACH + ORG_ADMIN, as signup-coach does. */
const addOtherOrgCoach = async (email: string) => {
  const [org] = await db.insert(schema.organizations).values({ name: 'Other Gym' }).returning();
  if (!org) throw new Error('org insert failed');
  const [outlet] = await db
    .insert(schema.outlets)
    .values({ orgId: org.id, name: 'Other Branch', timezone: 'Asia/Karachi' })
    .returning();
  if (!outlet) throw new Error('outlet insert failed');
  const user = await newUser(email);
  await db.insert(schema.memberships).values([
    { userId: user.id, role: 'COACH', orgId: org.id, outletId: outlet.id },
    { userId: user.id, role: 'ORG_ADMIN', orgId: org.id },
  ]);
  const [coach] = await db.insert(schema.coaches).values({ userId: user.id }).returning();
  if (!coach) throw new Error('coach insert failed');
  return { coachId: coach.id, outletId: outlet.id };
};

const login = async (email: string) => {
  const res = await app.request('/v1/auth/login', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email, password: COACH_PASSWORD }),
  });
  expect(res.status).toBe(200);
  return ((await res.json()) as { accessToken: string }).accessToken;
};

const get = (url: string, token: string, headers: Record<string, string> = {}) =>
  app.request(url, { headers: { authorization: `Bearer ${token}`, ...headers } });

const names = (body: ReturnType<typeof todayResponse.parse>) =>
  Object.values(body.groups).flatMap((items) => items.map((i) => i.clientName));

beforeAll(async () => {
  resetManifestCache();
  resetRegistryCache();
  resetPrincipalCache();
  const pglite = drizzle(new PGlite(), { schema });
  await migrate(pglite, {
    migrationsFolder: path.resolve(import.meta.dirname, '../../../packages/db/migrations'),
  });
  db = pglite as unknown as Db;
  seeded = await seed(db, {
    coachPasswordHash: await hashPassword(COACH_PASSWORD),
    tenantManifest: manifest as unknown as Record<string, unknown>,
    tenantSlug: manifest.slug,
  });
  // The seed dates its check-in in UTC; pin it to the outlet's today so the groups are stable.
  await db
    .update(schema.checkIns)
    .set({ scheduledFor: outletDay(0) })
    .where(eq(schema.checkIns.clientId, seeded.demoClientId));
  await addDueClient('Overdue Omar', seeded.coachId, outletDay(-9));
  await addDueClient('Later Lina', seeded.coachId, outletDay(4));
  await addDueClient('Later Leila', seeded.coachId, outletDay(11));

  const coachB = await addMember('coach-b@pilot.local', 'COACH');
  if (coachB === null) throw new Error('coach B missing');
  await addDueClient('Coach B Client', coachB, outletDay(-30));
  await addMember('desk@pilot.local', 'FRONT_DESK');
  const other = await addOtherOrgCoach('coach@other.local');
  await addDueClient('Other Org Client', other.coachId, outletDay(-5), other.outletId);

  app = buildApp({ db, manifest, env: { JWT_ACCESS_SECRET: JWT_SECRET, AI_MODE: 'fallback' } });
  tokenA = await login('coach@pilot.local');
  tokenB = await login('coach-b@pilot.local');
  tokenDesk = await login('desk@pilot.local');
  tokenOther = await login('coach@other.local');
});

describe('GET /v1/today', () => {
  it('returns the grouped queue in the contract shape, with counts from the same lists', async () => {
    const res = await get('/v1/today', tokenA);
    expect(res.status).toBe(200);
    const body = todayResponse.parse(await res.json());
    expect(body.groups.overdue.map((i) => i.clientName)).toEqual(['Overdue Omar']);
    expect(body.groups.overdue[0]?.reason).toMatchObject({
      kind: 'CHECKIN_OVERDUE',
      scheduledFor: outletDay(-9),
      daysOverdue: 9,
    });
    expect(body.groups.dueToday[0]).toMatchObject({
      clientName: 'Adnan (Demo)',
      reason: { kind: 'CHECKIN_DUE', scheduledFor: outletDay(0) },
    });
    // The demo client's weigh-ins cross as ISO 8601 with T and an offset (B6).
    expect(body.groups.dueToday[0]?.lastWeight?.at).toMatch(/T.*(Z|[+-]\d{2}:\d{2})$/);
    // The soonest upcoming check-in, date-only, for S02's all-clear line.
    expect(body.nextDueOn).toBe(outletDay(4));
    expect(names(body)).not.toContain('Later Lina');
    for (const [group, items] of Object.entries(body.groups)) {
      expect(body.counts[group as keyof typeof body.counts]).toBe(items.length);
    }
  });

  it("never shows another coach's clients, and scopes the counts to the coach", async () => {
    const a = todayResponse.parse(await (await get('/v1/today', tokenA)).json());
    expect(names(a)).not.toContain('Coach B Client');

    const b = todayResponse.parse(await (await get('/v1/today', tokenB)).json());
    expect(names(b)).toEqual(['Coach B Client']);
    expect(b.counts).toEqual({ redFlags: 0, plansBlocked: 0, overdue: 1, dueToday: 0, drafts: 0 });
    expect(b.nextDueOn).toBeNull();

    const pulseB = pulseResponse.parse(await (await get('/v1/pulse', tokenB)).json());
    expect(pulseB.counts).toEqual(b.counts);
  });

  it('never crosses orgs: a coach in another org sees only their own clients and counts', async () => {
    const a = todayResponse.parse(await (await get('/v1/today', tokenA)).json());
    expect(names(a)).not.toContain('Other Org Client');

    const other = todayResponse.parse(await (await get('/v1/today', tokenOther)).json());
    expect(names(other)).toEqual(['Other Org Client']);
    for (const pilotClient of ['Adnan (Demo)', 'Overdue Omar', 'Coach B Client']) {
      expect(names(other)).not.toContain(pilotClient);
    }
    expect(other.counts).toEqual({
      redFlags: 0,
      plansBlocked: 0,
      overdue: 1,
      dueToday: 0,
      drafts: 0,
    });
    expect(other.nextDueOn).toBeNull();

    const pulse = pulseResponse.parse(await (await get('/v1/pulse', tokenOther)).json());
    expect(pulse.counts).toEqual(other.counts);
    expect(pulse.unreadCount).toBe(0);
  });

  it('refuses a member without a coach profile and an anonymous caller', async () => {
    expect((await get('/v1/today', tokenDesk)).status).toBe(403);
    expect((await get('/v1/pulse', tokenDesk)).status).toBe(403);
    expect((await app.request('/v1/today')).status).toBe(401);
    expect((await app.request('/v1/pulse')).status).toBe(401);
  });
});

describe('GET /v1/pulse', () => {
  it('returns the unread count, the Today counts and an ETag', async () => {
    const res = await get('/v1/pulse', tokenA);
    expect(res.status).toBe(200);
    const body = pulseResponse.parse(await res.json());
    const today = todayResponse.parse(await (await get('/v1/today', tokenA)).json());
    expect(body.counts).toEqual(today.counts);
    expect(body.unreadCount).toBe(0);
    expect(res.headers.get('etag')).toBe(body.etag);
    expect(body.etag).toMatch(/^"[\w-]+"$/);
    expect(res.headers.get('cache-control')).toBe('private, no-cache');
  });

  it('answers 304 with no body to a matching If-None-Match', async () => {
    const { etag } = pulseResponse.parse(await (await get('/v1/pulse', tokenA)).json());
    for (const ifNoneMatch of [etag, `W/${etag}`, `"stale", ${etag}`, '*']) {
      const res = await get('/v1/pulse', tokenA, { 'if-none-match': ifNoneMatch });
      expect(res.status).toBe(304);
      expect(res.headers.get('etag')).toBe(etag);
      expect(await res.text()).toBe('');
    }
    expect((await get('/v1/pulse', tokenA, { 'if-none-match': '"stale"' })).status).toBe(200);
  });

  it('changes the ETag when the Today counts change', async () => {
    const before = pulseResponse.parse(await (await get('/v1/pulse', tokenA)).json());
    await addDueClient('Overdue Nadia', seeded.coachId, outletDay(-2));

    const res = await get('/v1/pulse', tokenA, { 'if-none-match': before.etag });
    expect(res.status).toBe(200);
    const after = pulseResponse.parse(await res.json());
    expect(after.counts.overdue).toBe(before.counts.overdue + 1);
    expect(after.etag).not.toBe(before.etag);
  });

  it('changes the ETag when the unread count changes', async () => {
    const before = pulseResponse.parse(await (await get('/v1/pulse', tokenA)).json());
    await notify(db, { recipientUserId: seeded.coachUserId, type: 'SYSTEM', payload: {} });

    const res = await get('/v1/pulse', tokenA, { 'if-none-match': before.etag });
    expect(res.status).toBe(200);
    const after = pulseResponse.parse(await res.json());
    expect(after.unreadCount).toBe(before.unreadCount + 1);
    expect(after.etag).not.toBe(before.etag);
  });
});

describe('ETag stability', () => {
  it('stays the same across repeated calls on unchanged data with tied rows', async () => {
    // One client with two DUE check-ins (one per goal; only one goal can be ACTIVE) and two
    // blocked plans: equal names and days, so only the ids order them. PGlite happens to return
    // these rows in one order; orderTodayGroups' test in packages/modules proves the tie-break.
    const clientId = await addDueClient('Twin Tariq', seeded.coachId, outletDay(-4));
    await addDueCheckIn(clientId, seeded.outletId, outletDay(-4), 'ACHIEVED');
    for (const version of [1, 2]) {
      await db.insert(schema.mealPlans).values({
        clientId,
        coachId: seeded.coachId,
        outletId: seeded.outletId,
        version,
        status: 'NEEDS_REVIEW',
        targets: { kcal: 2000, proteinG: 150, fatG: 65, carbsG: 180, fiberG: 28 },
      });
    }
    const today = todayResponse.parse(await (await get('/v1/today', tokenA)).json());
    expect(today.groups.overdue.filter((i) => i.clientName === 'Twin Tariq')).toHaveLength(2);
    expect(today.groups.plansBlocked.filter((i) => i.clientName === 'Twin Tariq')).toHaveLength(2);

    const etagNow = async () =>
      pulseResponse.parse(await (await get('/v1/pulse', tokenA)).json()).etag;
    const first = await etagNow();
    expect(await etagNow()).toBe(first);
    // The queries have no ORDER BY; on Postgres another plan can return the rows in another order.
    await db.execute(sql`set enable_hashjoin = off`);
    try {
      expect(await etagNow()).toBe(first);
    } finally {
      await db.execute(sql`reset enable_hashjoin`);
    }
  });
});

describe('etagMatches', () => {
  it('uses the weak comparison and ignores an absent header', () => {
    expect(etagMatches(undefined, '"a"')).toBe(false);
    expect(etagMatches('"a"', '"a"')).toBe(true);
    expect(etagMatches('W/"a"', '"a"')).toBe(true);
    expect(etagMatches('"b" , "a"', '"a"')).toBe(true);
    expect(etagMatches('"b"', '"a"')).toBe(false);
    expect(etagMatches('*', '"a"')).toBe(true);
  });
});
