import { and, desc, eq, inArray, isNotNull, isNull, sql } from 'drizzle-orm';
import { DateTime } from 'luxon';
import { type Action } from '@gymos/core/rbac';
import { isoDate, schema as s, toStrictIso, type Db } from '@gymos/db';
import { attentionStatus } from './attention';
import { type ClientScope } from './client-scope';

/** Why a client is in the queue, as data: the UI phrases it ("Check-in 10 days overdue"). */
export type TodayReason =
  | { kind: 'RED_FLAG'; since: string }
  | { kind: 'PLAN_NEEDS_REVIEW'; planId: string; planVersion: number }
  | { kind: 'CHECKIN_OVERDUE'; checkInId: string; scheduledFor: string; daysOverdue: number }
  | { kind: 'CHECKIN_DUE'; checkInId: string; scheduledFor: string }
  | { kind: 'DRAFT_AWAITING_PUBLISH'; planId: string; planVersion: number };

export type TodayItem = {
  clientId: string;
  clientName: string;
  /** Latest weigh-in; `at` is ISO 8601 with an offset. Null when none or no vitals.read. */
  lastWeight: { kg: number; at: string } | null;
  reason: TodayReason;
};

/**
 * The queue in urgency order (S02). F7.9 adds `intakeDrafts` after `drafts` (rulings O7);
 * `TodayCounts` then asks for its count.
 */
export type TodayGroups = {
  redFlags: TodayItem[];
  plansBlocked: TodayItem[];
  overdue: TodayItem[];
  dueToday: TodayItem[];
  drafts: TodayItem[];
};

export type TodayCounts = Record<keyof TodayGroups, number>;

export type TodayQueue = {
  groups: TodayGroups;
  counts: TodayCounts;
  /** The soonest check-in due after today (YYYY-MM-DD), for the all-clear state; null when none. */
  nextDueOn: string | null;
};

/** The row behind the reason: a client can have several DUE check-ins (one per goal) or plans. */
const refOf = (i: TodayItem): string => {
  switch (i.reason.kind) {
    case 'RED_FLAG':
      return '';
    case 'CHECKIN_OVERDUE':
    case 'CHECKIN_DUE':
      return i.reason.checkInId;
    case 'PLAN_NEEDS_REVIEW':
    case 'DRAFT_AWAITING_PUBLISH':
      return i.reason.planId;
  }
};

/** The grant a reason's data needs, on top of `client.list` (packages/core/src/rbac/matrix.ts). */
const grantFor = (kind: TodayReason['kind']): Action => {
  switch (kind) {
    case 'RED_FLAG':
    case 'CHECKIN_OVERDUE':
    case 'CHECKIN_DUE':
      return 'checkin.read';
    case 'PLAN_NEEDS_REVIEW':
    case 'DRAFT_AWAITING_PUBLISH':
      return 'plan.read';
  }
};

const byName = (a: TodayItem, b: TodayItem) =>
  a.clientName.localeCompare(b.clientName) ||
  a.clientId.localeCompare(b.clientId) ||
  refOf(a).localeCompare(refOf(b));

const sinceOf = (i: TodayItem) => (i.reason.kind === 'RED_FLAG' ? i.reason.since : '');
const daysOf = (i: TodayItem) => (i.reason.kind === 'CHECKIN_OVERDUE' ? i.reason.daysOverdue : 0);

/** Each group in display order, whatever order the rows came in (the pulse ETag hashes it). */
export const orderTodayGroups = (groups: TodayGroups): TodayGroups => ({
  redFlags: [...groups.redFlags].sort(
    (a, b) => sinceOf(a).localeCompare(sinceOf(b)) || byName(a, b),
  ),
  plansBlocked: [...groups.plansBlocked].sort(byName),
  overdue: [...groups.overdue].sort((a, b) => daysOf(b) - daysOf(a) || byName(a, b)),
  dueToday: [...groups.dueToday].sort(byName),
  drafts: [...groups.drafts].sort(byName),
});

/** Whole days from `from` to `to`, both YYYY-MM-DD. */
const daysBetween = (from: string, to: string): number => {
  const days = DateTime.fromISO(to, { zone: 'utc' }).diff(
    DateTime.fromISO(from, { zone: 'utc' }),
    'days',
  ).days;
  if (!Number.isInteger(days)) throw new Error(`not a calendar date: ${from}`);
  return days;
};

/**
 * The work queue: red flags, plans blocked for review, overdue check-ins (most days first),
 * check-ins due today, and drafts awaiting publish, for the active clients in `scope`
 * (`resolveClientScope`). "Today" is each client's outlet calendar day.
 */
export const getTodayQueue = async (
  db: Db,
  opts: { scope: ClientScope; now?: DateTime },
): Promise<TodayQueue> => {
  const now = opts.now ?? DateTime.utc();
  const { scope } = opts;
  const scopedIds = db.select({ id: s.clients.id }).from(s.clients).where(scope.where);

  // One lateral lookup per client: half the cost of two correlated subqueries at 170 clients.
  const lastWeight = db
    .select({
      // Null when the client has no weigh-in (left join).
      kg: sql<number | null>`${s.vitals.weightKg}::float`.as('kg'),
      at: sql<string | null>`${s.vitals.recordedAt}`.as('at'),
    })
    .from(s.vitals)
    .where(and(eq(s.vitals.clientId, s.clients.id), isNotNull(s.vitals.weightKg)))
    .orderBy(desc(s.vitals.recordedAt))
    .limit(1)
    .as('last_weight');

  const [clients, dueCheckIns, plans] = await Promise.all([
    db
      .select({
        id: s.clients.id,
        name: s.clients.name,
        outletId: s.clients.outletId,
        userId: s.clients.userId,
        timezone: s.outlets.timezone,
        reasons: s.clientAttention.reasons,
        lastWeightKg: lastWeight.kg,
        lastWeightAt: lastWeight.at,
      })
      .from(s.clients)
      .innerJoin(s.outlets, eq(s.outlets.id, s.clients.outletId))
      .leftJoin(s.clientAttention, eq(s.clientAttention.clientId, s.clients.id))
      .leftJoinLateral(lastWeight, sql`true`)
      .where(and(scope.where, eq(s.clients.status, 'active'), isNull(s.clients.deletedAt))),
    db
      .select({
        id: s.checkIns.id,
        clientId: s.checkIns.clientId,
        scheduledFor: s.checkIns.scheduledFor,
      })
      .from(s.checkIns)
      .where(and(inArray(s.checkIns.clientId, scopedIds), eq(s.checkIns.status, 'DUE'))),
    db
      .select({
        id: s.mealPlans.id,
        clientId: s.mealPlans.clientId,
        version: s.mealPlans.version,
        status: s.mealPlans.status,
        isLatest: sql<boolean>`${s.mealPlans.version} = (
          select max(m.version) from meal_plans m where m.client_id = ${s.mealPlans.clientId}
        )`,
      })
      .from(s.mealPlans)
      .where(
        and(
          inArray(s.mealPlans.clientId, scopedIds),
          inArray(s.mealPlans.status, ['DRAFT', 'NEEDS_REVIEW']),
        ),
      ),
  ]);

  // Only active clients that pass the scope's per-row rule reach the queue.
  const byId = new Map(clients.filter(scope.includes).map((c) => [c.id, c]));
  // Each item needs its reason's grant, and the weight needs vitals.read; what a role may not read
  // is left out, so the counts (group lengths) match what it sees.
  const item = (clientId: string, reason: TodayReason): TodayItem[] => {
    const client = byId.get(clientId);
    if (client === undefined || !scope.allows(grantFor(reason.kind), client)) return [];
    return [
      {
        clientId,
        clientName: client.name,
        lastWeight:
          client.lastWeightKg === null ||
          client.lastWeightAt === null ||
          !scope.allows('vitals.read', client)
            ? null
            : { kg: client.lastWeightKg, at: toStrictIso(client.lastWeightAt) },
        reason,
      },
    ];
  };

  const todayByZone = new Map<string, string>();
  const todayIn = (zone: string): string => {
    let today = todayByZone.get(zone);
    if (today === undefined) {
      const local = now.setZone(zone);
      if (!local.isValid) throw new Error(`invalid outlet timezone: ${zone}`);
      today = isoDate(local);
      todayByZone.set(zone, today);
    }
    return today;
  };

  const overdue: TodayItem[] = [];
  const dueToday: TodayItem[] = [];
  let nextDueOn: string | null = null;
  for (const due of dueCheckIns) {
    const client = byId.get(due.clientId);
    // nextDueOn comes from check-ins too, so it needs the same grant as their items.
    if (client === undefined || !scope.allows('checkin.read', client)) continue;
    const days = daysBetween(due.scheduledFor, todayIn(client.timezone));
    if (days > 0) {
      overdue.push(
        ...item(due.clientId, {
          kind: 'CHECKIN_OVERDUE',
          checkInId: due.id,
          scheduledFor: due.scheduledFor,
          daysOverdue: days,
        }),
      );
    } else if (days === 0) {
      dueToday.push(
        ...item(due.clientId, {
          kind: 'CHECKIN_DUE',
          checkInId: due.id,
          scheduledFor: due.scheduledFor,
        }),
      );
    } else if (nextDueOn === null || due.scheduledFor < nextDueOn) {
      nextDueOn = due.scheduledFor;
    }
  }

  const redFlags = clients.flatMap((c) => {
    const { reason } = attentionStatus(c.reasons ?? []);
    return reason?.code === 'RED_FLAG'
      ? item(c.id, { kind: 'RED_FLAG', since: toStrictIso(reason.since) })
      : [];
  });

  const plansBlocked = plans.flatMap((p) =>
    p.status === 'NEEDS_REVIEW'
      ? item(p.clientId, { kind: 'PLAN_NEEDS_REVIEW', planId: p.id, planVersion: p.version })
      : [],
  );
  const drafts = plans.flatMap((p) =>
    p.status === 'DRAFT' && p.isLatest
      ? item(p.clientId, { kind: 'DRAFT_AWAITING_PUBLISH', planId: p.id, planVersion: p.version })
      : [],
  );

  const groups = orderTodayGroups({ redFlags, plansBlocked, overdue, dueToday, drafts });
  return {
    groups,
    counts: {
      redFlags: groups.redFlags.length,
      plansBlocked: groups.plansBlocked.length,
      overdue: groups.overdue.length,
      dueToday: groups.dueToday.length,
      drafts: groups.drafts.length,
    },
    nextDueOn,
  };
};
