import { and, desc, eq, inArray, isNotNull, isNull, sql } from 'drizzle-orm';
import { DateTime } from 'luxon';
import { isoDate, schema as s, toStrictIso, type Db } from '@gymos/db';
import { attentionStatus } from './attention';

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
  /** Latest weigh-in; `at` is ISO 8601 with an offset. */
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

export type TodayQueue = { groups: TodayGroups; counts: TodayCounts };

const byName = (a: TodayItem, b: TodayItem) =>
  a.clientName.localeCompare(b.clientName) || a.clientId.localeCompare(b.clientId);

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
 * The coach's work queue: red flags, plans blocked for review, overdue check-ins (most days
 * first), check-ins due today, and drafts awaiting publish. Scoped to the coach's current
 * assignments inside the principal's organization. "Today" is each client's outlet calendar day.
 */
export const getTodayQueue = async (
  db: Db,
  opts: { coachId: string; orgId: string; now?: DateTime },
): Promise<TodayQueue> => {
  const now = opts.now ?? DateTime.utc();
  const assigned = and(
    eq(s.coachAssignments.coachId, opts.coachId),
    isNull(s.coachAssignments.unassignedAt),
  );

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
        timezone: s.outlets.timezone,
        reasons: s.clientAttention.reasons,
        lastWeightKg: lastWeight.kg,
        lastWeightAt: lastWeight.at,
      })
      .from(s.coachAssignments)
      .innerJoin(s.clients, eq(s.clients.id, s.coachAssignments.clientId))
      .innerJoin(s.outlets, eq(s.outlets.id, s.clients.outletId))
      .leftJoin(s.clientAttention, eq(s.clientAttention.clientId, s.clients.id))
      .leftJoinLateral(lastWeight, sql`true`)
      .where(
        and(
          assigned,
          eq(s.outlets.orgId, opts.orgId),
          eq(s.clients.status, 'active'),
          isNull(s.clients.deletedAt),
        ),
      ),
    db
      .select({
        id: s.checkIns.id,
        clientId: s.checkIns.clientId,
        scheduledFor: s.checkIns.scheduledFor,
      })
      .from(s.checkIns)
      .innerJoin(s.coachAssignments, eq(s.coachAssignments.clientId, s.checkIns.clientId))
      .where(and(assigned, eq(s.checkIns.status, 'DUE'))),
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
      .innerJoin(s.coachAssignments, eq(s.coachAssignments.clientId, s.mealPlans.clientId))
      .where(and(assigned, inArray(s.mealPlans.status, ['DRAFT', 'NEEDS_REVIEW']))),
  ]);

  // Only clients that pass the org, status and assignment checks reach the queue.
  const byId = new Map(clients.map((c) => [c.id, c]));
  const item = (clientId: string, reason: TodayReason): TodayItem[] => {
    const client = byId.get(clientId);
    if (client === undefined) return [];
    return [
      {
        clientId,
        clientName: client.name,
        lastWeight:
          client.lastWeightKg === null || client.lastWeightAt === null
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
  for (const due of dueCheckIns) {
    const client = byId.get(due.clientId);
    if (client === undefined) continue;
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

  const sinceOf = (i: TodayItem) => (i.reason.kind === 'RED_FLAG' ? i.reason.since : '');
  const daysOf = (i: TodayItem) => (i.reason.kind === 'CHECKIN_OVERDUE' ? i.reason.daysOverdue : 0);

  const groups: TodayGroups = {
    redFlags: redFlags.sort((a, b) => sinceOf(a).localeCompare(sinceOf(b)) || byName(a, b)),
    plansBlocked: plansBlocked.sort(byName),
    overdue: overdue.sort((a, b) => daysOf(b) - daysOf(a) || byName(a, b)),
    dueToday: dueToday.sort(byName),
    drafts: drafts.sort(byName),
  };
  return {
    groups,
    counts: {
      redFlags: groups.redFlags.length,
      plansBlocked: groups.plansBlocked.length,
      overdue: groups.overdue.length,
      dueToday: groups.dueToday.length,
      drafts: groups.drafts.length,
    },
  };
};
