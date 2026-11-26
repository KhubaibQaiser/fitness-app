import { and, asc, desc, eq, ilike, inArray, isNotNull, isNull, or } from 'drizzle-orm';
import { z } from 'zod';
import { err, ok, type Result } from '@gymos/core';
import { can, type Actor } from '@gymos/core/rbac';
import { schema as s, type Db } from '@gymos/db';

export const ROSTER_PAGE_SIZE = 50;
export const ROSTER_SORTS = [
  'name',
  'lastCheckIn',
  'nextDue',
  'weight',
  'weightChange',
  'adherence',
] as const;
export type RosterSort = (typeof ROSTER_SORTS)[number];
export type RosterSortDir = 'asc' | 'desc';
/** Plan statuses the roster shows; superseded and archived versions are never the current plan. */
export const ROSTER_PLAN_STATUSES = ['DRAFT', 'PUBLISHED', 'NEEDS_REVIEW'] as const;
export type RosterPlanStatus = (typeof ROSTER_PLAN_STATUSES)[number];

export type RosterRow = {
  id: string;
  name: string;
  goalPreset: (typeof s.clientGoals.$inferSelect)['preset'] | null;
  /** Scheduled date (YYYY-MM-DD) of the latest completed check-in. */
  lastCheckInOn: string | null;
  /** That check-in's adherence rating, 1–5. */
  lastAdherence: number | null;
  /** Scheduled date (YYYY-MM-DD) of the earliest due check-in. */
  nextDueOn: string | null;
  weightKg: number | null;
  /** Latest weight minus the active goal's start weight, in kg. */
  weightChangeKg: number | null;
  /** Latest plan version that is not superseded or archived. */
  plan: { status: RosterPlanStatus; version: number } | null;
};

export type RosterPage = { items: RosterRow[]; nextCursor: string | null };

export type RosterQuery = {
  q?: string | undefined;
  sort: RosterSort;
  dir: RosterSortDir;
  /** Opaque cursor from the previous page's `nextCursor`. */
  cursor?: string | undefined;
};

type SortKey = { value: string | number | null; id: string };

const sortValue: Record<RosterSort, (row: RosterRow) => string | number | null> = {
  name: (row) => row.name,
  lastCheckIn: (row) => row.lastCheckInOn,
  nextDue: (row) => row.nextDueOn,
  weight: (row) => row.weightKg,
  weightChange: (row) => row.weightChangeKg,
  adherence: (row) => row.lastAdherence,
};

const nameCollator = new Intl.Collator('en', { sensitivity: 'base' });

/** Total order: the sort value (nulls last in both directions), then id ascending. */
const compareKeys =
  (sort: RosterSort, dir: RosterSortDir) =>
  (a: SortKey, b: SortKey): number => {
    if (a.value !== null && b.value !== null) {
      const byValue =
        sort === 'name'
          ? nameCollator.compare(String(a.value), String(b.value))
          : a.value < b.value
            ? -1
            : a.value > b.value
              ? 1
              : 0;
      if (byValue !== 0) return dir === 'asc' ? byValue : -byValue;
    } else if (a.value !== b.value) {
      return a.value === null ? 1 : -1;
    }
    return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
  };

const STRING_SORTS: ReadonlySet<RosterSort> = new Set(['name', 'lastCheckIn', 'nextDue']);

const cursorSchema = z.tuple([
  z.enum(ROSTER_SORTS),
  z.enum(['asc', 'desc']),
  z.union([z.string(), z.number(), z.null()]),
  z.uuid(),
]);

const encodeCursor = (sort: RosterSort, dir: RosterSortDir, key: SortKey): string =>
  Buffer.from(JSON.stringify([sort, dir, key.value, key.id])).toString('base64url');

const parseJson = (text: string): unknown => {
  try {
    return JSON.parse(text);
  } catch {
    // Not JSON: the schema check below rejects it as an invalid cursor.
    return undefined;
  }
};

/** The cursor's key, or null when it is malformed or was issued for another sort. */
const decodeCursor = (raw: string, sort: RosterSort, dir: RosterSortDir): SortKey | null => {
  const parsed = cursorSchema.safeParse(parseJson(Buffer.from(raw, 'base64url').toString('utf8')));
  if (!parsed.success) return null;
  const [cursorSort, cursorDir, value, id] = parsed.data;
  if (cursorSort !== sort || cursorDir !== dir) return null;
  const expected = STRING_SORTS.has(sort) ? 'string' : 'number';
  if (value !== null && typeof value !== expected) return null;
  if (value === null && sort === 'name') return null;
  return { value, id };
};

const isRosterPlanStatus = (status: string): status is RosterPlanStatus =>
  (ROSTER_PLAN_STATUSES as readonly string[]).includes(status);

const toPlan = (status: string | null, version: number | null): RosterRow['plan'] => {
  if (status === null || version === null) return null;
  // The query filters other statuses out, so reaching this is a bug.
  if (!isRosterPlanStatus(status)) throw new Error(`roster query returned a ${status} plan`);
  return { status, version };
};

const escapeLike = (text: string): string => text.replace(/[\\%_]/g, '\\$&');

/**
 * One page of the coach's roster. One query reads every client in the actor's scope set that
 * matches the search; `can()` then keeps the clients the actor's roles may list, and the page is
 * cut after the cursor's key in the sort's total order, so pages never repeat or skip a row.
 *
 * ponytail: sorting and cutting in memory reads the whole caseload on every page, so the status
 * rule shared with F7.1 can sort and filter in TypeScript. Fine for caseloads in the hundreds or
 * low thousands; move the sort and cut into SQL if that rule gains a SQL form or caseloads grow.
 */
export const listRoster = async (
  db: Db,
  actor: Actor,
  orgId: string,
  query: RosterQuery,
): Promise<Result<RosterPage, { code: 'INVALID_CURSOR' }>> => {
  const after =
    query.cursor === undefined ? null : decodeCursor(query.cursor, query.sort, query.dir);
  if (query.cursor !== undefined && after === null) return err({ code: 'INVALID_CURSOR' });

  const { scope } = actor;
  // Set-based, one pass per table over the clients in scope: faster than a lateral per client.
  const inScope = db.$with('in_scope').as(
    db
      .select({
        id: s.clients.id,
        name: s.clients.name,
        outletId: s.clients.outletId,
        userId: s.clients.userId,
      })
      .from(s.clients)
      .innerJoin(s.outlets, eq(s.outlets.id, s.clients.outletId))
      .where(
        and(
          eq(s.outlets.orgId, orgId),
          eq(s.clients.status, 'active'),
          isNull(s.clients.deletedAt),
          // The scope set bounds the read; can() below applies each role's level.
          scope.orgWide
            ? undefined
            : or(
                inArray(s.clients.outletId, [...scope.outletIds]),
                inArray(s.clients.id, [...scope.assignedClientIds]),
                eq(s.clients.userId, scope.userId),
              ),
          query.q ? ilike(s.clients.name, `%${escapeLike(query.q)}%`) : undefined,
        ),
      ),
  );
  const scopedIds = db.select({ id: inScope.id }).from(inScope);
  const lastCheckIn = db.$with('last_check_in').as(
    db
      .selectDistinctOn([s.checkIns.clientId], {
        clientId: s.checkIns.clientId,
        scheduledFor: s.checkIns.scheduledFor,
        adherenceRating: s.checkIns.adherenceRating,
      })
      .from(s.checkIns)
      .where(and(eq(s.checkIns.status, 'COMPLETED'), inArray(s.checkIns.clientId, scopedIds)))
      .orderBy(s.checkIns.clientId, desc(s.checkIns.scheduledFor), desc(s.checkIns.completedAt)),
  );
  const nextDue = db.$with('next_due').as(
    db
      .selectDistinctOn([s.checkIns.clientId], {
        clientId: s.checkIns.clientId,
        scheduledFor: s.checkIns.scheduledFor,
      })
      .from(s.checkIns)
      .where(and(eq(s.checkIns.status, 'DUE'), inArray(s.checkIns.clientId, scopedIds)))
      .orderBy(s.checkIns.clientId, asc(s.checkIns.scheduledFor)),
  );
  const latestWeight = db.$with('latest_weight').as(
    db
      .selectDistinctOn([s.vitals.clientId], {
        clientId: s.vitals.clientId,
        weightKg: s.vitals.weightKg,
      })
      .from(s.vitals)
      .where(and(isNotNull(s.vitals.weightKg), inArray(s.vitals.clientId, scopedIds)))
      .orderBy(s.vitals.clientId, desc(s.vitals.recordedAt)),
  );
  const latestPlan = db.$with('latest_plan').as(
    db
      .selectDistinctOn([s.mealPlans.clientId], {
        clientId: s.mealPlans.clientId,
        status: s.mealPlans.status,
        version: s.mealPlans.version,
      })
      .from(s.mealPlans)
      .where(
        and(
          inArray(s.mealPlans.status, [...ROSTER_PLAN_STATUSES]),
          inArray(s.mealPlans.clientId, scopedIds),
        ),
      )
      .orderBy(s.mealPlans.clientId, desc(s.mealPlans.version)),
  );

  const rows = await db
    .with(inScope, lastCheckIn, nextDue, latestWeight, latestPlan)
    .select({
      id: inScope.id,
      name: inScope.name,
      outletId: inScope.outletId,
      userId: inScope.userId,
      goalPreset: s.clientGoals.preset,
      startWeightKg: s.clientGoals.startWeightKg,
      lastCheckInOn: lastCheckIn.scheduledFor,
      lastAdherence: lastCheckIn.adherenceRating,
      nextDueOn: nextDue.scheduledFor,
      weightKg: latestWeight.weightKg,
      planStatus: latestPlan.status,
      planVersion: latestPlan.version,
    })
    .from(inScope)
    .leftJoin(
      s.clientGoals,
      and(eq(s.clientGoals.clientId, inScope.id), eq(s.clientGoals.status, 'ACTIVE')),
    )
    .leftJoin(lastCheckIn, eq(lastCheckIn.clientId, inScope.id))
    .leftJoin(nextDue, eq(nextDue.clientId, inScope.id))
    .leftJoin(latestWeight, eq(latestWeight.clientId, inScope.id))
    .leftJoin(latestPlan, eq(latestPlan.clientId, inScope.id));

  const keyOf = (row: RosterRow): SortKey => ({ value: sortValue[query.sort](row), id: row.id });
  const compare = compareKeys(query.sort, query.dir);
  const listed = rows
    .filter((row) =>
      can(actor, 'client.list', {
        clientId: row.id,
        outletId: row.outletId,
        ...(row.userId === null ? {} : { ownerUserId: row.userId }),
      }),
    )
    .map((row): RosterRow => ({
      id: row.id,
      name: row.name,
      goalPreset: row.goalPreset,
      lastCheckInOn: row.lastCheckInOn,
      lastAdherence: row.lastAdherence,
      nextDueOn: row.nextDueOn,
      weightKg: row.weightKg,
      weightChangeKg:
        row.weightKg === null || row.startWeightKg === null
          ? null
          : Math.round((row.weightKg - row.startWeightKg) * 100) / 100,
      plan: toPlan(row.planStatus, row.planVersion),
    }))
    .sort((a, b) => compare(keyOf(a), keyOf(b)));

  const start = after === null ? 0 : listed.findIndex((row) => compare(keyOf(row), after) > 0);
  const rest = start === -1 ? [] : listed.slice(start);
  const items = rest.slice(0, ROSTER_PAGE_SIZE);
  const last = items.at(-1);
  return ok({
    items,
    nextCursor:
      rest.length > ROSTER_PAGE_SIZE && last !== undefined
        ? encodeCursor(query.sort, query.dir, keyOf(last))
        : null,
  });
};
