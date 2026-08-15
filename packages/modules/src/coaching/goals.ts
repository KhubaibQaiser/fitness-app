import { and, desc, eq, inArray, sql } from 'drizzle-orm';
import { DateTime } from 'luxon';
import { err, ok, type Result } from '@gymos/core';
import {
  computeTargets,
  type GoalPreset,
  type GoalRate,
  type NutritionRefusal,
} from '@gymos/core/nutrition';
import { type ScopeSet } from '@gymos/core/rbac';
import { isoDate, schema as s, type Db, type DbOrTx } from '@gymos/db';
import { writeAudit } from '../shared/audit';
import { weeklyDeltaKgFromManifest, type TenantManifest } from '../tenancy';

/** Used when DOB is omitted during onboarding — Mifflin still needs an age. */
export const DEFAULT_AGE_YEARS = 30;

export const ageYearsFromDob = (dob: string | null): number => {
  if (dob === null || dob === '') return DEFAULT_AGE_YEARS;
  const years = Math.floor(Math.abs(DateTime.fromISO(dob).diffNow('years').years));
  return Number.isFinite(years) && years > 0 ? years : DEFAULT_AGE_YEARS;
};

export type CreateGoalInput = {
  preset: GoalPreset;
  rate: GoalRate;
  startWeightKg: number;
  targetWeightKg?: number | undefined;
  targetDate?: string | undefined;
  checkinWeekday?: number | undefined;
  bodyFatPct?: number | undefined;
};

export type SaveActiveGoalInput = {
  activityLevel: 1.2 | 1.375 | 1.55 | 1.725 | 1.9;
  preset: GoalPreset;
  rate: GoalRate;
  startWeightKg: number;
  targetWeightKg: number;
};

export type GoalError =
  | { code: 'CLIENT_NOT_FOUND' }
  | { code: 'CLIENT_PROFILE_INCOMPLETE'; missing: string[] }
  | { code: 'NUTRITION_REFUSAL'; refusal: NutritionRefusal };

const profileMissing = (client: typeof s.clients.$inferSelect): string[] => {
  const missing: string[] = [];
  if (client.heightCm === null) missing.push('heightCm');
  if (client.activityLevel === null) missing.push('activityLevel');
  return missing;
};

const computeGoalTargets = (
  client: typeof s.clients.$inferSelect,
  input: {
    preset: GoalPreset;
    rate: GoalRate;
    startWeightKg: number;
    activityLevel: 1.2 | 1.375 | 1.55 | 1.725 | 1.9;
    bodyFatPct?: number | undefined;
  },
  manifest: TenantManifest | undefined,
) => {
  const weeklyDeltaKg = weeklyDeltaKgFromManifest(manifest, input.preset, input.rate);
  return computeTargets(
    {
      sex: client.sex,
      ageYears: ageYearsFromDob(client.dob),
      heightCm: client.heightCm ?? 0,
      weightKg: input.startWeightKg,
      ...(input.bodyFatPct !== undefined ? { bodyFatPct: input.bodyFatPct } : {}),
      activity: input.activityLevel,
    },
    input.preset,
    input.rate,
    weeklyDeltaKg !== undefined ? { weeklyDeltaKg } : undefined,
  );
};

/** Insert an ACTIVE goal (+ first DUE check-in). Works inside or outside a transaction. */
export const createGoalTx = async (
  db: DbOrTx,
  principal: { userId: string },
  client: typeof s.clients.$inferSelect,
  input: CreateGoalInput,
  manifest?: TenantManifest,
): Promise<Result<typeof s.clientGoals.$inferSelect, GoalError>> => {
  const missing = profileMissing(client);
  if (missing.length > 0) return err({ code: 'CLIENT_PROFILE_INCOMPLETE', missing });

  const activity = (client.activityLevel ?? 1.55) as 1.2 | 1.375 | 1.55 | 1.725 | 1.9;
  const computation = computeGoalTargets(
    client,
    {
      preset: input.preset,
      rate: input.rate,
      startWeightKg: input.startWeightKg,
      activityLevel: activity,
      ...(input.bodyFatPct !== undefined ? { bodyFatPct: input.bodyFatPct } : {}),
    },
    manifest,
  );
  if (!computation.ok) return err({ code: 'NUTRITION_REFUSAL', refusal: computation.error });

  await db
    .update(s.clientGoals)
    .set({ status: 'SUPERSEDED' })
    .where(and(eq(s.clientGoals.clientId, client.id), eq(s.clientGoals.status, 'ACTIVE')));
  await db
    .update(s.checkIns)
    .set({ status: 'SKIPPED' })
    .where(and(eq(s.checkIns.clientId, client.id), eq(s.checkIns.status, 'DUE')));

  const weekday = input.checkinWeekday ?? 1;
  const [created] = await db
    .insert(s.clientGoals)
    .values({
      clientId: client.id,
      outletId: client.outletId,
      preset: input.preset,
      rate: input.rate,
      startDate: isoDate(DateTime.utc()),
      startWeightKg: input.startWeightKg,
      targetWeightKg: input.targetWeightKg ?? null,
      targetDate: input.targetDate ?? null,
      expectedWeeklyDeltaKg: computation.value.expectedWeeklyDeltaKg,
      initialTargets: computation.value.targets,
      tdeeEstimate: computation.value.tdee,
      checkinWeekday: weekday,
      status: 'ACTIVE',
    })
    .returning();
  if (!created) throw new Error('goal insert failed');

  const now = DateTime.utc();
  let next = now.plus({ days: 1 });
  while (next.weekday % 7 !== weekday) {
    next = next.plus({ days: 1 });
  }
  await db.insert(s.checkIns).values({
    clientId: client.id,
    outletId: client.outletId,
    goalId: created.id,
    scheduledFor: isoDate(next),
    status: 'DUE',
  });

  await writeAudit(db, {
    actorUserId: principal.userId,
    actorRole: 'COACH',
    action: 'goal.create',
    resourceType: 'client_goal',
    resourceId: created.id,
    after: {
      activityLevel: activity,
      preset: input.preset,
      rate: input.rate,
      targets: computation.value.targets,
    },
  });

  return ok(created);
};

export const createGoal = async (
  db: Db,
  principal: { userId: string },
  clientId: string,
  input: CreateGoalInput,
  manifest?: TenantManifest,
): Promise<Result<typeof s.clientGoals.$inferSelect, GoalError>> => {
  const [client] = await db.select().from(s.clients).where(eq(s.clients.id, clientId)).limit(1);
  if (!client) return err({ code: 'CLIENT_NOT_FOUND' });

  return db.transaction(async (tx) => createGoalTx(tx, principal, client, input, manifest));
};

/**
 * Saves the client's activity and ACTIVE goal as one unit. Existing goals are
 * updated in place so goal history and scheduled check-ins remain intact.
 */
export const saveActiveGoal = async (
  db: Db,
  principal: { userId: string },
  clientId: string,
  input: SaveActiveGoalInput,
  manifest?: TenantManifest,
): Promise<Result<typeof s.clientGoals.$inferSelect, GoalError>> => {
  const [client] = await db.select().from(s.clients).where(eq(s.clients.id, clientId)).limit(1);
  if (!client) return err({ code: 'CLIENT_NOT_FOUND' });

  const nextClient = { ...client, activityLevel: input.activityLevel };
  const missing = profileMissing(nextClient);
  if (missing.length > 0) return err({ code: 'CLIENT_PROFILE_INCOMPLETE', missing });

  const computation = computeGoalTargets(
    nextClient,
    {
      preset: input.preset,
      rate: input.rate,
      startWeightKg: input.startWeightKg,
      activityLevel: input.activityLevel,
    },
    manifest,
  );
  if (!computation.ok) return err({ code: 'NUTRITION_REFUSAL', refusal: computation.error });

  return db.transaction(async (tx) => {
    const activeGoal = await getActiveGoal(tx, clientId);

    await tx
      .update(s.clients)
      .set({ activityLevel: input.activityLevel })
      .where(eq(s.clients.id, clientId));

    if (activeGoal === null) {
      return createGoalTx(tx, principal, nextClient, input, manifest);
    }

    const [updated] = await tx
      .update(s.clientGoals)
      .set({
        preset: input.preset,
        rate: input.rate,
        startWeightKg: input.startWeightKg,
        targetWeightKg: input.targetWeightKg,
        expectedWeeklyDeltaKg: computation.value.expectedWeeklyDeltaKg,
        initialTargets: computation.value.targets,
        tdeeEstimate: computation.value.tdee,
      })
      .where(and(eq(s.clientGoals.id, activeGoal.id), eq(s.clientGoals.status, 'ACTIVE')))
      .returning();
    if (!updated) throw new Error('active goal update failed');

    await writeAudit(tx, {
      actorUserId: principal.userId,
      actorRole: 'COACH',
      action: 'goal.update',
      resourceType: 'client_goal',
      resourceId: updated.id,
      before: {
        activityLevel: client.activityLevel,
        preset: activeGoal.preset,
        rate: activeGoal.rate,
        startWeightKg: activeGoal.startWeightKg,
        targetWeightKg: activeGoal.targetWeightKg,
        targets: activeGoal.initialTargets,
      },
      after: {
        activityLevel: input.activityLevel,
        preset: updated.preset,
        rate: updated.rate,
        startWeightKg: updated.startWeightKg,
        targetWeightKg: updated.targetWeightKg,
        targets: updated.initialTargets,
      },
    });

    return ok(updated);
  });
};

export const listGoals = async (db: Db, clientId: string) =>
  db
    .select()
    .from(s.clientGoals)
    .where(eq(s.clientGoals.clientId, clientId))
    .orderBy(desc(s.clientGoals.createdAt));

export const getActiveGoal = async (db: DbOrTx, clientId: string) => {
  const [goal] = await db
    .select()
    .from(s.clientGoals)
    .where(and(eq(s.clientGoals.clientId, clientId), eq(s.clientGoals.status, 'ACTIVE')))
    .limit(1);
  return goal ?? null;
};

export const setGoalStatus = async (
  db: Db,
  principal: { userId: string },
  goalId: string,
  status: 'ACHIEVED' | 'ABANDONED',
) => {
  const [updated] = await db
    .update(s.clientGoals)
    .set({ status })
    .where(eq(s.clientGoals.id, goalId))
    .returning();
  if (updated) {
    await db
      .update(s.checkIns)
      .set({ status: 'SKIPPED' })
      .where(and(eq(s.checkIns.goalId, goalId), eq(s.checkIns.status, 'DUE')));
    await writeAudit(db, {
      actorUserId: principal.userId,
      actorRole: 'COACH',
      action: 'goal.status',
      resourceType: 'client_goal',
      resourceId: goalId,
      after: { status },
    });
  }
  return updated ?? null;
};

/** Percent progress toward target weight, when a target exists. */
export const goalProgressPct = (
  startWeightKg: number,
  targetWeightKg: number | null,
  currentWeightKg: number | null,
): number | null => {
  if (targetWeightKg === null || currentWeightKg === null) return null;
  const total = startWeightKg - targetWeightKg;
  if (Math.abs(total) < 0.001) return 100;
  const done = startWeightKg - currentWeightKg;
  return Math.max(0, Math.min(100, Math.round((done / total) * 1000) / 10));
};

export const nextDueCheckIns = async (
  db: Db,
  opts: { limit?: number; scope: ScopeSet; orgId: string },
) => {
  const conditions = [eq(s.checkIns.status, 'DUE')];
  if (opts.scope.orgWide) {
    conditions.push(eq(s.outlets.orgId, opts.orgId));
  } else if (opts.scope.outletIds.length > 0) {
    conditions.push(inArray(s.checkIns.outletId, [...opts.scope.outletIds]));
  } else if (opts.scope.assignedClientIds.length > 0) {
    conditions.push(inArray(s.checkIns.clientId, [...opts.scope.assignedClientIds]));
  } else {
    conditions.push(sql`false`);
  }

  return db
    .select({
      id: s.checkIns.id,
      clientId: s.checkIns.clientId,
      clientName: s.clients.name,
      goalId: s.checkIns.goalId,
      scheduledFor: s.checkIns.scheduledFor,
      status: s.checkIns.status,
      overdueDays: sql<number>`greatest(0, (current_date - ${s.checkIns.scheduledFor}::date))::int`,
    })
    .from(s.checkIns)
    .innerJoin(s.clients, eq(s.clients.id, s.checkIns.clientId))
    .innerJoin(s.outlets, eq(s.outlets.id, s.checkIns.outletId))
    .where(and(...conditions))
    .orderBy(s.checkIns.scheduledFor)
    .limit(opts.limit ?? 50);
};
