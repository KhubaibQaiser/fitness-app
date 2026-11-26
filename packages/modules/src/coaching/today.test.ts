import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { PGlite } from '@electric-sql/pglite';
import { eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/pglite';
import { migrate } from 'drizzle-orm/pglite/migrator';
import { DateTime } from 'luxon';
import { beforeAll, describe, expect, it } from 'vitest';
import { schema as s, seed, type Db, type SeedResult } from '@gymos/db';
import { resolvePrincipal } from '../identity';
import { resolveClientScope, type ClientScopeChoice } from './client-scope';
import { getTodayQueue, orderTodayGroups, type TodayItem, type TodayQueue } from './today';

const migrationsFolder = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../../../db/migrations',
);

// 20:30 UTC on the 26th is 01:30 on the 27th in the seeded outlet's zone (Asia/Karachi, +05:00).
const NOW = DateTime.fromISO('2026-11-26T20:30:00Z');
const TARGETS = { kcal: 2000, proteinG: 150, fatG: 65, carbsG: 180, fiberG: 28 };

let db: Db;
let seeded: SeedResult;
let queue: TodayQueue;
const ids: Record<string, string> = {};

type Fixture = {
  name: string;
  coachId?: string;
  outletId?: string;
  status?: 'active' | 'archived';
  unassigned?: boolean;
  dueOn?: string;
  reasons?: { code: string; weight: number; since: string }[];
  weights?: { kg: number; at: string }[];
  plans?: { version: number; status: 'DRAFT' | 'PUBLISHED' | 'NEEDS_REVIEW' | 'SUPERSEDED' }[];
};

const addClient = async (f: Fixture): Promise<string> => {
  const outletId = f.outletId ?? seeded.outletId;
  const coachId = f.coachId ?? seeded.coachId;
  const [client] = await db
    .insert(s.clients)
    .values({ outletId, name: f.name, sex: 'F', status: f.status ?? 'active' })
    .returning();
  if (!client) throw new Error('client insert failed');
  await db.insert(s.coachAssignments).values({
    coachId,
    clientId: client.id,
    outletId,
    ...(f.unassigned === true ? { unassignedAt: '2026-11-01T00:00:00Z' } : {}),
  });
  if (f.dueOn !== undefined) {
    const [goal] = await db
      .insert(s.clientGoals)
      .values({
        clientId: client.id,
        outletId,
        preset: 'LOSE',
        rate: 'STANDARD',
        startDate: '2026-09-01',
        startWeightKg: 80,
        expectedWeeklyDeltaKg: -0.5,
      })
      .returning();
    if (!goal) throw new Error('goal insert failed');
    await db.insert(s.checkIns).values({
      clientId: client.id,
      outletId,
      goalId: goal.id,
      scheduledFor: f.dueOn,
      status: 'DUE',
    });
  }
  if (f.reasons !== undefined) {
    await db.insert(s.clientAttention).values({
      clientId: client.id,
      score: f.reasons[0]?.weight ?? 0,
      reasons: f.reasons,
      computedAt: '2026-11-26T00:00:00Z',
    });
  }
  for (const w of f.weights ?? []) {
    await db.insert(s.vitals).values({
      clientId: client.id,
      outletId,
      recordedAt: w.at,
      recordedBy: seeded.coachUserId,
      weightKg: w.kg,
    });
  }
  for (const p of f.plans ?? []) {
    await db.insert(s.mealPlans).values({
      clientId: client.id,
      coachId,
      outletId,
      version: p.version,
      status: p.status,
      targets: TARGETS,
    });
  }
  ids[f.name] = client.id;
  return client.id;
};

const names = (items: { clientName: string }[]) => items.map((i) => i.clientName);

/** The queue as the API builds it: the user's principal, its resolved scope, a fixed clock. */
const queueFor = async (userId: string, choice?: ClientScopeChoice, orgId?: string) => {
  const principal = await resolvePrincipal(db, userId);
  const scope = resolveClientScope({ ...principal, ...(orgId ? { orgId } : {}) }, choice);
  if (!scope.ok) throw new Error(scope.error.code);
  return getTodayQueue(db, { scope: scope.value, now: NOW });
};

beforeAll(async () => {
  const pglite = drizzle(new PGlite(), { schema: s });
  await migrate(pglite, { migrationsFolder });
  db = pglite as unknown as Db;
  seeded = await seed(db);

  // The seed's demo check-in falls on "today" in UTC; pin it to the outlet's today.
  await db
    .update(s.checkIns)
    .set({ scheduledFor: '2026-11-27' })
    .where(eq(s.checkIns.clientId, seeded.demoClientId));

  await addClient({ name: 'Zara', dueOn: '2026-11-17', weights: [] });
  await addClient({
    name: 'Rana',
    dueOn: '2026-11-24',
    reasons: [{ code: 'RED_FLAG', weight: 100, since: '2026-11-20 09:00:00+00' }],
    weights: [
      { kg: 84.5, at: '2026-08-06T07:00:00Z' },
      { kg: 86, at: '2026-07-30T07:00:00Z' },
    ],
  });
  // The 26th is today in UTC but yesterday in Karachi.
  await addClient({ name: 'Ahmed', dueOn: '2026-11-26' });
  await addClient({ name: 'Later', dueOn: '2026-11-30' });
  await addClient({
    name: 'Bilal',
    plans: [
      { version: 1, status: 'NEEDS_REVIEW' },
      { version: 2, status: 'DRAFT' },
    ],
  });
  // A draft left behind by a newer published version is not waiting on anything.
  await addClient({
    name: 'Stale Draft',
    plans: [
      { version: 1, status: 'DRAFT' },
      { version: 2, status: 'PUBLISHED' },
    ],
  });
  await addClient({
    name: 'Off Track',
    reasons: [{ code: 'OFF_TRACK', weight: 60, since: '2026-11-20T09:00:00Z' }],
  });
  await addClient({ name: 'Archived', status: 'archived', dueOn: '2026-11-01' });
  await addClient({ name: 'Unassigned', unassigned: true, dueOn: '2026-11-01' });

  // Another coach in the same org, and a coach in another org, each with an overdue client.
  const coachB = await addCoach(seeded.orgId);
  coachBUserId = coachB.userId;
  await addClient({ name: 'Coach B client', coachId: coachB.coachId, dueOn: '2026-11-10' });
  const [otherOrg] = await db.insert(s.organizations).values({ name: 'Other Gym' }).returning();
  if (!otherOrg) throw new Error('org insert failed');
  const coachC = await addCoach(otherOrg.id);
  await addClient({
    name: 'Other org client',
    coachId: coachC.coachId,
    outletId: coachC.outletId,
    dueOn: '2026-11-10',
    reasons: [{ code: 'RED_FLAG', weight: 100, since: '2026-11-20T09:00:00Z' }],
  });

  queue = await queueFor(seeded.coachUserId);
}, 60_000);

let coachBUserId = '';

let coachSeq = 0;
const addCoach = async (orgId: string) => {
  coachSeq += 1;
  const [outlet] = await db
    .insert(s.outlets)
    .values({ orgId, name: `Branch ${coachSeq}`, timezone: 'Asia/Karachi' })
    .returning();
  const [user] = await db
    .insert(s.users)
    .values({ email: `coach${coachSeq}@other.local`, name: `Coach ${coachSeq}`, locale: 'en' })
    .returning();
  if (!outlet || !user) throw new Error('coach insert failed');
  await db
    .insert(s.memberships)
    .values({ userId: user.id, role: 'COACH', orgId, outletId: outlet.id });
  const [coach] = await db.insert(s.coaches).values({ userId: user.id }).returning();
  if (!coach) throw new Error('coach insert failed');
  return { coachId: coach.id, outletId: outlet.id, userId: user.id };
};

describe('getTodayQueue', () => {
  it('groups the queue in urgency order with counts from the same lists', () => {
    expect(Object.keys(queue.groups)).toEqual([
      'redFlags',
      'plansBlocked',
      'overdue',
      'dueToday',
      'drafts',
    ]);
    expect(names(queue.groups.redFlags)).toEqual(['Rana']);
    expect(names(queue.groups.plansBlocked)).toEqual(['Bilal']);
    expect(names(queue.groups.overdue)).toEqual(['Zara', 'Rana', 'Ahmed']);
    expect(names(queue.groups.dueToday)).toEqual(['Adnan (Demo)']);
    expect(names(queue.groups.drafts)).toEqual(['Bilal']);
    expect(queue.counts).toEqual({
      redFlags: 1,
      plansBlocked: 1,
      overdue: 3,
      dueToday: 1,
      drafts: 1,
    });
  });

  it('carries each reason as data for the UI to phrase', async () => {
    const [due] = await db
      .select({ id: s.checkIns.id })
      .from(s.checkIns)
      .where(eq(s.checkIns.clientId, ids.Zara ?? ''));
    expect(queue.groups.overdue[0]).toEqual({
      clientId: ids.Zara,
      clientName: 'Zara',
      lastWeight: null,
      reason: {
        kind: 'CHECKIN_OVERDUE',
        checkInId: due?.id,
        scheduledFor: '2026-11-17',
        daysOverdue: 10,
      },
    });
    expect(queue.groups.overdue.map((i) => i.reason)).toMatchObject([
      { daysOverdue: 10 },
      { daysOverdue: 3 },
      { daysOverdue: 1, scheduledFor: '2026-11-26' },
    ]);
    expect(queue.groups.dueToday[0]?.reason).toMatchObject({
      kind: 'CHECKIN_DUE',
      scheduledFor: '2026-11-27',
    });
    expect(queue.groups.redFlags[0]).toMatchObject({
      reason: { kind: 'RED_FLAG', since: '2026-11-20T09:00:00.000Z' },
      lastWeight: { kg: 84.5, at: '2026-08-06T07:00:00.000Z' },
    });
    expect(queue.groups.plansBlocked[0]?.reason).toMatchObject({
      kind: 'PLAN_NEEDS_REVIEW',
      planVersion: 1,
    });
    expect(queue.groups.drafts[0]?.reason).toMatchObject({
      kind: 'DRAFT_AWAITING_PUBLISH',
      planVersion: 2,
    });
  });

  it('gives the soonest upcoming check-in for the all-clear state, or null when none', () => {
    // 'Later' is due on the 30th; archived and unassigned clients' check-ins don't count.
    expect(queue.nextDueOn).toBe('2026-11-30');
  });

  it('leaves out future, archived and unassigned check-ins, stale drafts and off-track clients', () => {
    const everyone = Object.values(queue.groups).flatMap(names);
    for (const name of ['Later', 'Archived', 'Unassigned', 'Stale Draft', 'Off Track']) {
      expect(everyone).not.toContain(name);
    }
  });

  it("never shows another coach's clients, in this org or another", async () => {
    const everyone = Object.values(queue.groups).flatMap(names);
    expect(everyone).not.toContain('Coach B client');
    expect(everyone).not.toContain('Other org client');

    const coachB = await queueFor(coachBUserId);
    expect(names(coachB.groups.overdue)).toEqual(['Coach B client']);
    expect(coachB.nextDueOn).toBeNull();
    expect(coachB.counts).toEqual({
      redFlags: 0,
      plansBlocked: 0,
      overdue: 1,
      dueToday: 0,
      drafts: 0,
    });
  });

  it("drops a coach's own client when the org does not match the principal's", async () => {
    const [otherOrg] = await db
      .select({ id: s.organizations.id })
      .from(s.organizations)
      .where(eq(s.organizations.name, 'Other Gym'));
    const crossTenant = await queueFor(seeded.coachUserId, 'mine', otherOrg?.id ?? '');
    expect(Object.values(crossTenant.groups).flat()).toEqual([]);
  });

  it('with all, the admin who coaches sees the whole org, and only that org', async () => {
    const all = Object.values((await queueFor(seeded.coachUserId, 'all')).groups).flatMap(names);
    expect(all).toContain('Coach B client');
    expect(all).toContain('Zara');
    expect(all).not.toContain('Other org client');
    expect(all).not.toContain('Archived');
  });
});

describe('orderTodayGroups', () => {
  // Rows that tie on everything a coach sees: one client with two DUE check-ins (one per goal)
  // and two blocked plans. Only the ids order them, so the pulse ETag can't flap with row order.
  const item = (reason: TodayItem['reason']): TodayItem => ({
    clientId: 'client-1',
    clientName: 'Twin Tariq',
    lastWeight: null,
    reason,
  });
  const due = (checkInId: string) =>
    item({ kind: 'CHECKIN_OVERDUE', checkInId, scheduledFor: '2026-11-22', daysOverdue: 4 });
  const today = (checkInId: string) =>
    item({ kind: 'CHECKIN_DUE', checkInId, scheduledFor: '2026-11-26' });
  const blocked = (planId: string) => item({ kind: 'PLAN_NEEDS_REVIEW', planId, planVersion: 1 });
  const draft = (planId: string) =>
    item({ kind: 'DRAFT_AWAITING_PUBLISH', planId, planVersion: 2 });
  const groups = (flip: boolean) => {
    const pair = <T>(a: T, b: T) => (flip ? [b, a] : [a, b]);
    return {
      redFlags: [],
      plansBlocked: pair(blocked('plan-a'), blocked('plan-b')),
      overdue: pair(due('check-a'), due('check-b')),
      dueToday: pair(today('check-c'), today('check-d')),
      drafts: pair(draft('plan-c'), draft('plan-d')),
    };
  };

  it('gives one order for tied rows, whichever order the database returned them in', () => {
    const ordered = orderTodayGroups(groups(false));
    expect(orderTodayGroups(groups(true))).toEqual(ordered);
    expect(ordered.overdue.map((i) => i.reason)).toMatchObject([
      { checkInId: 'check-a' },
      { checkInId: 'check-b' },
    ]);
    expect(ordered.plansBlocked.map((i) => i.reason)).toMatchObject([
      { planId: 'plan-a' },
      { planId: 'plan-b' },
    ]);
  });
});
