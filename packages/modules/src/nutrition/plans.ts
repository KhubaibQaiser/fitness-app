import { and, asc, desc, eq, sql } from 'drizzle-orm';
import { DateTime } from 'luxon';
import { narrate, type AiConfig } from '@gymos/ai';
import { err, ok, type Result } from '@gymos/core';
import {
  assertNoRestrictedFoods,
  computeTargets,
  solveWeek,
  type MacroTargets,
  type NutritionRefusal,
  type SolvedDay,
  type SolverError,
} from '@gymos/core/nutrition';
import { nowIso, schema as s, type Db } from '@gymos/db';
import { notify } from '../notifications';
import { writeAudit } from '../shared/audit';
import { type TenantManifest } from '../tenancy';
import { getActiveProfile, restrictedAllergenCodes } from './dietary';
import { candidatesForRestrictions, foodsById } from './foods';

export type GenerateError =
  | { code: 'CLIENT_NOT_FOUND' }
  | { code: 'NO_ACTIVE_GOAL' }
  | { code: 'CLIENT_PROFILE_INCOMPLETE'; missing: string[] }
  | { code: 'BLOCKED_REQUIRES_OVERRIDE'; reasons: string[] }
  | { code: 'NUTRITION_REFUSAL'; refusal: NutritionRefusal }
  | { code: 'SOLVER_FAILED'; error: SolverError }
  | { code: 'ALLERGEN_POSTCHECK_FAILED'; foodId: string; allergen: string };

export type GeneratedPlan = {
  plan: typeof s.mealPlans.$inferSelect;
  items: (typeof s.mealPlanItems.$inferSelect)[];
  generationId: string;
};

export type GenerateOptions = {
  kind: 'INITIAL' | 'ADJUSTMENT';
  targetsOverride?: MacroTargets;
  override?: { reason: string };
  ai: AiConfig;
};

/** Safety gates run in code, before anything else (spec §11). */
const safetyGateReasons = (
  client: typeof s.clients.$inferSelect,
  restrictions: readonly { type: string }[],
): string[] => {
  const reasons: string[] = [];
  if (client.dob !== null) {
    const age = Math.abs(DateTime.fromISO(client.dob).diffNow('years').years);
    if (age < 16) reasons.push('UNDER_16');
  }
  if (client.medicalFlags?.pregnant === true) reasons.push('PREGNANCY');
  if (restrictions.some((r) => r.type === 'MEDICAL')) reasons.push('MEDICAL_RESTRICTION');
  return reasons;
};

export const generatePlan = async (
  db: Db,
  principal: { userId: string; coachId: string; outletId: string },
  manifest: TenantManifest,
  clientId: string,
  options: GenerateOptions,
): Promise<Result<GeneratedPlan, GenerateError>> => {
  const [client] = await db.select().from(s.clients).where(eq(s.clients.id, clientId)).limit(1);
  if (!client) return err({ code: 'CLIENT_NOT_FOUND' });

  const profile = await getActiveProfile(db, clientId);
  const restrictions = profile?.restrictions ?? [];

  // 1. Safety gates — blocked unless an explicit, logged coach override exists.
  const gateReasons = safetyGateReasons(client, restrictions);
  if (gateReasons.length > 0 && options.override === undefined) {
    await db.insert(s.planGenerations).values({
      clientId,
      coachId: principal.coachId,
      kind: options.kind,
      status: 'BLOCKED_REQUIRES_OVERRIDE',
      inputs: { gateReasons },
      config: { mealCount: manifest.aiConfig.mealCount },
    });
    return err({ code: 'BLOCKED_REQUIRES_OVERRIDE', reasons: gateReasons });
  }

  // 2. Targets: explicit override (adaptive apply) or fresh Layer 1 from
  //    the active goal + latest recorded weight.
  const [goal] = await db
    .select()
    .from(s.clientGoals)
    .where(and(eq(s.clientGoals.clientId, clientId), eq(s.clientGoals.status, 'ACTIVE')))
    .limit(1);
  if (!goal) return err({ code: 'NO_ACTIVE_GOAL' });

  let targets: MacroTargets;
  if (options.targetsOverride) {
    targets = options.targetsOverride;
  } else {
    const missing: string[] = [];
    if (client.heightCm === null) missing.push('heightCm');
    if (client.activityLevel === null) missing.push('activityLevel');
    if (missing.length > 0) return err({ code: 'CLIENT_PROFILE_INCOMPLETE', missing });

    const weightRows = await db
      .select({ weightKg: s.vitals.weightKg })
      .from(s.vitals)
      .where(and(eq(s.vitals.clientId, clientId), sql`${s.vitals.weightKg} is not null`))
      .orderBy(desc(s.vitals.recordedAt))
      .limit(1);
    const weightKg = weightRows[0]?.weightKg ?? goal.startWeightKg;

    const age =
      client.dob !== null && client.dob !== ''
        ? Math.floor(Math.abs(DateTime.fromISO(client.dob).diffNow('years').years))
        : 30;
    const computation = computeTargets(
      {
        sex: client.sex,
        ageYears: age > 0 ? age : 30,
        heightCm: client.heightCm ?? 0,
        weightKg,
        activity: (client.activityLevel ?? 1.55) as 1.2 | 1.375 | 1.55 | 1.725 | 1.9,
      },
      goal.preset,
      goal.rate,
    );
    if (!computation.ok) return err({ code: 'NUTRITION_REFUSAL', refusal: computation.error });
    targets = computation.value.targets;
  }

  // 3. Layer 2 — hard-filtered candidates, then the deterministic solver.
  const started = Date.now();
  const [generation] = await db
    .insert(s.planGenerations)
    .values({
      clientId,
      coachId: principal.coachId,
      kind: options.kind,
      status: 'RUNNING',
      inputs: {
        sex: client.sex,
        preset: goal.preset,
        rate: goal.rate,
        targets,
        restrictionCodes: restrictions.map((r) => r.code),
      },
      config: {
        mealCount: manifest.aiConfig.mealCount,
        kcalTolerancePct: manifest.aiConfig.kcalTolerancePct,
        macroTolerancePct: manifest.aiConfig.macroTolerancePct,
        budgetTier: manifest.aiConfig.budgetTier,
        prepTimeCeilingMin: manifest.aiConfig.prepTimeCeilingMin,
        aiMode: options.ai.mode,
      },
      ...(options.override
        ? {
            override: { byUserId: principal.userId, reason: options.override.reason, at: nowIso() },
          }
        : {}),
    })
    .returning();
  if (!generation) throw new Error('generation insert failed');

  const fail = async (status: 'FAILED' | 'REJECTED', error: GenerateError) => {
    await db
      .update(s.planGenerations)
      .set({ status, validation: { error } })
      .where(eq(s.planGenerations.id, generation.id));
    return err(error);
  };

  const candidates = await candidatesForRestrictions(db, restrictions, manifest);
  const solved = solveWeek(targets, candidates, {
    mealCount: manifest.aiConfig.mealCount,
    kcalTolerancePct: manifest.aiConfig.kcalTolerancePct,
    macroTolerancePct: manifest.aiConfig.macroTolerancePct,
    seed: generation.id,
  });
  if (!solved.ok) {
    return fail('FAILED', { code: 'SOLVER_FAILED', error: solved.error });
  }

  // 4. Independent second allergen check on the final composition.
  const allItems = solved.value.flatMap((d) => d.meals.flatMap((m) => m.items));
  const foodMap = await foodsById(db, [...new Set(allItems.map((i) => i.foodId))]);
  const postCheck = assertNoRestrictedFoods(
    allItems,
    foodMap,
    restrictedAllergenCodes(restrictions),
  );
  if (!postCheck.ok) {
    return fail('REJECTED', {
      code: 'ALLERGEN_POSTCHECK_FAILED',
      foodId: postCheck.error.foodId,
      allergen: postCheck.error.allergen,
    });
  }

  // 5. Layer 3 — language only. Numbers are already fixed by Layers 1–2.
  const narrative = await narrate(
    {
      locale: manifest.locales.default,
      cuisineContext: manifest.aiConfig.cuisineContext,
      verbosity: manifest.aiConfig.verbosity,
      days: solved.value.map((d) => ({
        day: d.day,
        meals: d.meals.map((m) => ({
          slot: m.slot,
          items: m.items.map((i) => ({ foodName: i.foodName, grams: i.portionGrams })),
        })),
      })),
    },
    options.ai,
  );

  // 6. Persist plan + items + audit trail atomically.
  const result = await db.transaction(async (tx) => {
    const [versionRow] = await tx
      .select({ max: sql<number>`coalesce(max(${s.mealPlans.version}), 0)::int` })
      .from(s.mealPlans)
      .where(eq(s.mealPlans.clientId, clientId));
    const version = (versionRow?.max ?? 0) + 1;

    const [plan] = await tx
      .insert(s.mealPlans)
      .values({
        clientId,
        coachId: principal.coachId,
        outletId: principal.outletId,
        version,
        status: 'DRAFT',
        targets,
        generationId: generation.id,
      })
      .returning();
    if (!plan) throw new Error('plan insert failed');

    const itemRows = solved.value.flatMap((day: SolvedDay) =>
      day.meals.flatMap((meal, mealIdx) =>
        meal.items.map((item, position) => ({
          planId: plan.id,
          day: day.day,
          mealIndex: meal.mealIndex,
          mealSlot: meal.slot,
          mealName:
            narrative.output.days[day.day - 1]?.meals[mealIdx]?.name ??
            `${meal.slot} — day ${day.day}`,
          foodId: item.foodId,
          portionGrams: item.portionGrams,
          macros: item.macros,
          prepNotes: narrative.output.days[day.day - 1]?.meals[mealIdx]?.prepNotes ?? null,
          position,
        })),
      ),
    );
    const items = await tx.insert(s.mealPlanItems).values(itemRows).returning();

    await tx
      .update(s.planGenerations)
      .set({
        status: 'SUCCEEDED',
        planId: plan.id,
        modelId: narrative.modelId,
        latencyMs: Date.now() - started,
        validation: {
          allergenPostCheck: 'passed',
          fellBack: narrative.fellBack,
          dayTotals: solved.value.map((d) => d.totals),
        },
      })
      .where(eq(s.planGenerations.id, generation.id));

    await writeAudit(tx, {
      actorUserId: principal.userId,
      actorRole: 'COACH',
      action: `plan.generate.${options.kind.toLowerCase()}`,
      resourceType: 'meal_plan',
      resourceId: plan.id,
      after: { version, targets, generationId: generation.id },
    });

    return { plan, items, generationId: generation.id };
  });

  return ok(result);
};

export const listPlans = async (db: Db, clientId: string) =>
  db
    .select()
    .from(s.mealPlans)
    .where(eq(s.mealPlans.clientId, clientId))
    .orderBy(desc(s.mealPlans.version));

export const getPlanWithItems = async (db: Db, planId: string) => {
  const [plan] = await db.select().from(s.mealPlans).where(eq(s.mealPlans.id, planId)).limit(1);
  if (!plan) return null;
  const rows = await db
    .select({ item: s.mealPlanItems, foodName: s.foods.name })
    .from(s.mealPlanItems)
    .innerJoin(s.foods, eq(s.foods.id, s.mealPlanItems.foodId))
    .where(eq(s.mealPlanItems.planId, planId))
    .orderBy(
      asc(s.mealPlanItems.day),
      asc(s.mealPlanItems.mealIndex),
      asc(s.mealPlanItems.position),
    );
  return { plan, items: rows.map(({ item, foodName }) => ({ ...item, foodName })) };
};

export type PlanOp =
  | { op: 'set-portion'; itemId: string; portionGrams: number }
  | { op: 'swap'; itemId: string; foodId: string }
  | { op: 'remove'; itemId: string }
  | {
      op: 'add';
      day: number;
      mealIndex: number;
      mealSlot: 'breakfast' | 'lunch' | 'dinner' | 'snack';
      foodId: string;
      portionGrams: number;
    };

export type PatchError =
  | { code: 'PLAN_NOT_FOUND' }
  | { code: 'PLAN_NOT_EDITABLE'; status: string }
  | { code: 'ITEM_NOT_FOUND'; itemId: string }
  | { code: 'FOOD_NOT_FOUND'; foodId: string };

const gramsMacros = (per100g: s.Per100g, grams: number) => ({
  kcal: Math.round((per100g.kcal * grams) / 100),
  proteinG: Math.round(((per100g.proteinG * grams) / 100) * 10) / 10,
  fatG: Math.round(((per100g.fatG * grams) / 100) * 10) / 10,
  carbsG: Math.round(((per100g.carbsG * grams) / 100) * 10) / 10,
});

/** Coach edits — macros are ALWAYS recomputed server-side from the food DB. */
export const patchPlan = async (
  db: Db,
  principal: { userId: string; coachId: string },
  planId: string,
  ops: PlanOp[],
): Promise<Result<NonNullable<Awaited<ReturnType<typeof getPlanWithItems>>>, PatchError>> => {
  const existing = await getPlanWithItems(db, planId);
  if (!existing) return err({ code: 'PLAN_NOT_FOUND' });
  if (existing.plan.status !== 'DRAFT' && existing.plan.status !== 'NEEDS_REVIEW') {
    return err({ code: 'PLAN_NOT_EDITABLE', status: existing.plan.status });
  }

  for (const op of ops) {
    if (op.op === 'set-portion' || op.op === 'swap' || op.op === 'remove') {
      const item = existing.items.find((i) => i.id === op.itemId);
      if (!item) return err({ code: 'ITEM_NOT_FOUND', itemId: op.itemId });
    }
  }

  try {
    await applyOps(db, principal, planId, existing.items, ops);
  } catch (error) {
    if (error instanceof PatchFoodMissing) {
      return err({ code: 'FOOD_NOT_FOUND', foodId: error.foodId });
    }
    throw error;
  }

  const updated = await getPlanWithItems(db, planId);
  if (!updated) return err({ code: 'PLAN_NOT_FOUND' });
  return ok(updated);
};

const applyOps = async (
  db: Db,
  principal: { userId: string; coachId: string },
  planId: string,
  existingItems: readonly (typeof s.mealPlanItems.$inferSelect)[],
  ops: PlanOp[],
): Promise<void> => {
  const existing = { items: existingItems };
  await db.transaction(async (tx) => {
    for (const op of ops) {
      if (op.op === 'remove') {
        await tx.delete(s.mealPlanItems).where(eq(s.mealPlanItems.id, op.itemId));
      } else if (op.op === 'set-portion') {
        const item = existing.items.find((i) => i.id === op.itemId);
        if (!item) continue;
        const food = await foodsById(tx, [item.foodId]);
        const per100g = food.get(item.foodId)?.per100g;
        if (!per100g) continue;
        await tx
          .update(s.mealPlanItems)
          .set({ portionGrams: op.portionGrams, macros: gramsMacros(per100g, op.portionGrams) })
          .where(eq(s.mealPlanItems.id, op.itemId));
      } else if (op.op === 'swap') {
        const item = existing.items.find((i) => i.id === op.itemId);
        if (!item) continue;
        const food = await foodsById(tx, [op.foodId]);
        const per100g = food.get(op.foodId)?.per100g;
        if (!per100g) throw new PatchFoodMissing(op.foodId);
        await tx
          .update(s.mealPlanItems)
          .set({ foodId: op.foodId, macros: gramsMacros(per100g, item.portionGrams) })
          .where(eq(s.mealPlanItems.id, op.itemId));
        await tx.insert(s.aiFeedbackEvents).values({
          planId,
          coachId: principal.coachId,
          kind: 'SWAP',
          payload: { from: item.foodId, to: op.foodId, slot: item.mealSlot },
        });
      } else {
        const food = await foodsById(tx, [op.foodId]);
        const per100g = food.get(op.foodId)?.per100g;
        if (!per100g) throw new PatchFoodMissing(op.foodId);
        await tx.insert(s.mealPlanItems).values({
          planId,
          day: op.day,
          mealIndex: op.mealIndex,
          mealSlot: op.mealSlot,
          mealName: `${op.mealSlot} — day ${op.day}`,
          foodId: op.foodId,
          portionGrams: op.portionGrams,
          macros: gramsMacros(per100g, op.portionGrams),
          position: 99,
        });
      }
    }
    await tx.insert(s.aiFeedbackEvents).values({
      planId,
      coachId: principal.coachId,
      kind: 'EDIT',
      payload: { ops: ops.map((o) => o.op) },
    });
  });
};

class PatchFoodMissing extends Error {
  constructor(readonly foodId: string) {
    super(`food not found: ${foodId}`);
  }
}

export type PublishError =
  { code: 'PLAN_NOT_FOUND' } | { code: 'PLAN_NOT_PUBLISHABLE'; status: string };

export const publishPlan = async (
  db: Db,
  principal: { userId: string },
  planId: string,
): Promise<Result<typeof s.mealPlans.$inferSelect, PublishError>> => {
  const [plan] = await db.select().from(s.mealPlans).where(eq(s.mealPlans.id, planId)).limit(1);
  if (!plan) return err({ code: 'PLAN_NOT_FOUND' });
  if (plan.status !== 'DRAFT' && plan.status !== 'NEEDS_REVIEW') {
    return err({ code: 'PLAN_NOT_PUBLISHABLE', status: plan.status });
  }

  const published = await db.transaction(async (tx) => {
    await tx
      .update(s.mealPlans)
      .set({ status: 'SUPERSEDED' })
      .where(and(eq(s.mealPlans.clientId, plan.clientId), eq(s.mealPlans.status, 'PUBLISHED')));
    const [row] = await tx
      .update(s.mealPlans)
      .set({ status: 'PUBLISHED', publishedAt: nowIso() })
      .where(eq(s.mealPlans.id, planId))
      .returning();
    if (!row) throw new Error('publish failed');
    await writeAudit(tx, {
      actorUserId: principal.userId,
      actorRole: 'COACH',
      action: 'plan.publish',
      resourceType: 'meal_plan',
      resourceId: planId,
      after: { version: row.version },
    });
    return row;
  });

  await notify(db, {
    recipientUserId: principal.userId,
    type: 'PLAN_PUBLISHED',
    payload: { clientId: plan.clientId, planId, version: plan.version },
    deepLink: `/clients/${plan.clientId}/plan`,
  });

  return ok(published);
};

export type PlanDiffEntry = {
  day: number;
  slot: string;
  foodId: string;
  foodName: string;
  kind: 'portion' | 'added' | 'removed';
  fromGrams?: number;
  toGrams?: number;
  kcalDelta: number;
};

/** Structured diff between two plans' items — the adjustment-review payload. */
export const diffPlanItems = (
  before: readonly (typeof s.mealPlanItems.$inferSelect)[],
  after: readonly (typeof s.mealPlanItems.$inferSelect)[],
  foodNames: ReadonlyMap<string, string>,
): PlanDiffEntry[] => {
  const key = (i: typeof s.mealPlanItems.$inferSelect) => `${i.day}:${i.mealSlot}:${i.foodId}`;
  const beforeMap = new Map(before.map((i) => [key(i), i]));
  const afterMap = new Map(after.map((i) => [key(i), i]));
  const entries: PlanDiffEntry[] = [];

  for (const [k, b] of beforeMap) {
    const a = afterMap.get(k);
    if (a === undefined) {
      entries.push({
        day: b.day,
        slot: b.mealSlot,
        foodId: b.foodId,
        foodName: foodNames.get(b.foodId) ?? 'unknown',
        kind: 'removed',
        fromGrams: b.portionGrams,
        kcalDelta: -b.macros.kcal,
      });
    } else if (Math.abs(a.portionGrams - b.portionGrams) > 0.01) {
      entries.push({
        day: b.day,
        slot: b.mealSlot,
        foodId: b.foodId,
        foodName: foodNames.get(b.foodId) ?? 'unknown',
        kind: 'portion',
        fromGrams: b.portionGrams,
        toGrams: a.portionGrams,
        kcalDelta: a.macros.kcal - b.macros.kcal,
      });
    }
  }
  for (const [k, a] of afterMap) {
    if (!beforeMap.has(k)) {
      entries.push({
        day: a.day,
        slot: a.mealSlot,
        foodId: a.foodId,
        foodName: foodNames.get(a.foodId) ?? 'unknown',
        kind: 'added',
        toGrams: a.portionGrams,
        kcalDelta: a.macros.kcal,
      });
    }
  }
  return entries.sort((x, y) => x.day - y.day || x.slot.localeCompare(y.slot));
};
