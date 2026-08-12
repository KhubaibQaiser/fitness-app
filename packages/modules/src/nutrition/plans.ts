import { and, asc, count, desc, eq, gte, inArray, sql } from 'drizzle-orm';
import { DateTime } from 'luxon';
import { narrate, narrativeOutputSchema, type AiConfig, type NarrativeOutput } from '@gymos/ai';
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
import { iso, nowIso, schema as s, type Db } from '@gymos/db';
import { notify } from '../notifications';
import { writeAudit } from '../shared/audit';
import { type TenantManifest } from '../tenancy';
import { getActiveProfile, restrictedAllergenCodes } from './dietary';
import { candidatesForRestrictions, foodsById } from './foods';
import { applyPlanOps, PatchFoodMissing, type PlanOp } from './plan-ops';

export type { PlanOp } from './plan-ops';

export type GenerateError =
  | { code: 'CLIENT_NOT_FOUND' }
  | { code: 'NO_ACTIVE_GOAL' }
  | { code: 'CLIENT_PROFILE_INCOMPLETE'; missing: string[] }
  | { code: 'BLOCKED_REQUIRES_OVERRIDE'; reasons: string[] }
  | { code: 'NUTRITION_REFUSAL'; refusal: NutritionRefusal }
  | { code: 'SOLVER_FAILED'; error: SolverError }
  | { code: 'ALLERGEN_POSTCHECK_FAILED'; foodId: string; allergen: string }
  | { code: 'QUOTA_EXCEEDED'; limit: number; used: number };

export type GeneratedPlan = {
  plan: typeof s.mealPlans.$inferSelect;
  items: (typeof s.mealPlanItems.$inferSelect)[];
  generationId: string;
};

export type GenerateOptions = {
  kind: 'INITIAL' | 'ADJUSTMENT';
  targetsOverride?: MacroTargets;
  override?: { reason: string };
  mealCount?: 3 | 4 | 5;
  ai: AiConfig;
  /** Client-supplied key; same key+client SUCCEEDED within 24h returns that plan. */
  idempotencyKey?: string;
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

  // Idempotent replay: same key + client with SUCCEEDED generation in 24h.
  if (options.idempotencyKey !== undefined && options.idempotencyKey.length > 0) {
    const since = iso(DateTime.utc().minus({ hours: 24 }));
    const [prior] = await db
      .select({
        id: s.planGenerations.id,
        planId: s.planGenerations.planId,
      })
      .from(s.planGenerations)
      .where(
        and(
          eq(s.planGenerations.clientId, clientId),
          eq(s.planGenerations.status, 'SUCCEEDED'),
          gte(s.planGenerations.createdAt, since),
          sql`${s.planGenerations.config}->>'idempotencyKey' = ${options.idempotencyKey}`,
        ),
      )
      .orderBy(desc(s.planGenerations.createdAt))
      .limit(1);
    if (prior?.planId) {
      const withItems = await getPlanWithItems(db, prior.planId);
      if (withItems) {
        return ok({
          plan: withItems.plan,
          items: withItems.items,
          generationId: prior.id,
        });
      }
    }
  }

  // Monthly SUCCEEDED quota (UTC calendar month, tenant-wide).
  const monthStart = iso(DateTime.utc().startOf('month'));
  const [quotaRow] = await db
    .select({ used: count() })
    .from(s.planGenerations)
    .where(
      and(eq(s.planGenerations.status, 'SUCCEEDED'), gte(s.planGenerations.createdAt, monthStart)),
    );
  const used = quotaRow?.used ?? 0;
  const limit = manifest.aiConfig.monthlyGenerationQuota;
  if (used >= limit) {
    return err({ code: 'QUOTA_EXCEEDED', limit, used });
  }

  const profile = await getActiveProfile(db, clientId);
  const restrictions = profile?.restrictions ?? [];
  const mealCount = options.mealCount ?? manifest.aiConfig.mealCount;

  // 1. Safety gates — blocked unless an explicit, logged coach override exists.
  const gateReasons = safetyGateReasons(client, restrictions);
  if (gateReasons.length > 0 && options.override === undefined) {
    await db.insert(s.planGenerations).values({
      clientId,
      outletId: client.outletId,
      coachId: principal.coachId,
      kind: options.kind,
      status: 'BLOCKED_REQUIRES_OVERRIDE',
      inputs: { gateReasons },
      config: { mealCount },
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
      outletId: client.outletId,
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
        mealCount,
        kcalTolerancePct: manifest.aiConfig.kcalTolerancePct,
        macroTolerancePct: manifest.aiConfig.macroTolerancePct,
        budgetTier: manifest.aiConfig.budgetTier,
        prepTimeCeilingMin: manifest.aiConfig.prepTimeCeilingMin,
        aiMode: options.ai.mode,
        weekMode: 'daily_template',
        promptVersion: options.ai.promptVersion ?? null,
        adapterVersion: options.ai.adapterVersion ?? null,
        idempotencyKey: options.idempotencyKey ?? null,
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

  const candidates = await candidatesForRestrictions(db, restrictions, manifest, {
    goalPreset: goal.preset,
    clientId,
    varietyLookback: 3,
  });
  const solved = solveWeek(targets, candidates, {
    mealCount,
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

  // 5. Layer 3 — language only for the template day; clone names onto all days.
  const templateDay = solved.value[0];
  if (!templateDay) {
    return fail('FAILED', {
      code: 'SOLVER_FAILED',
      error: { code: 'SOLVER_INFEASIBLE', detail: 'empty template', bestErrorPct: 1 },
    });
  }

  const llmCache = {
    get: async (inputHash: Buffer): Promise<NarrativeOutput | null> => {
      const [row] = await db
        .select()
        .from(s.llmCache)
        .where(eq(s.llmCache.inputHash, inputHash))
        .limit(1);
      if (!row) return null;
      const parsed = narrativeOutputSchema.safeParse(row.output);
      return parsed.success ? parsed.data : null;
    },
    set: async (inputHash: Buffer, output: NarrativeOutput, modelId: string): Promise<void> => {
      await db.insert(s.llmCache).values({ inputHash, output, modelId }).onConflictDoNothing();
    },
  };

  const narrative = await narrate(
    {
      locale: manifest.locales.default,
      cuisineContext: manifest.aiConfig.cuisineContext,
      verbosity: manifest.aiConfig.verbosity,
      days: [
        {
          day: 1,
          meals: templateDay.meals.map((m) => ({
            slot: m.slot,
            items: m.items.map((i) => ({ foodName: i.foodName, grams: i.portionGrams })),
          })),
        },
      ],
    },
    options.ai,
    { cache: llmCache, expectedMealCount: templateDay.meals.length },
  );
  const templateMealNames = templateDay.meals.map(
    (meal, mealIdx) => narrative.output.days[0]?.meals[mealIdx]?.name ?? `${meal.slot} — day 1`,
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
          mealName: templateMealNames[mealIdx] ?? `${meal.slot} — day ${day.day}`,
          foodId: item.foodId,
          portionGrams: item.portionGrams,
          macros: item.macros,
          macrosSource: 'food_db' as const,
          prepNotes: null,
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
        adapterVersion: narrative.adapterVersion,
        rawLlmOutput: narrative.rawLlmOutput,
        latencyMs: Date.now() - started,
        validation: {
          allergenPostCheck: 'passed',
          fellBack: narrative.fellBack,
          cacheHit: narrative.cacheHit,
          guardrail: narrative.guardrail,
          promptVersion: narrative.promptVersion,
          circuitOpen: narrative.circuitOpen,
          inputHashHex: narrative.inputHash?.toString('hex') ?? null,
          dayTotals: solved.value.map((d) => d.totals),
          /** Day-1 narrative snapshot for online edit_distance vs published names. */
          templateMealNames,
          templatePrepNotes: templateDay.meals.map(() => ''),
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

    if (options.kind === 'ADJUSTMENT') {
      await tx.insert(s.aiFeedbackEvents).values({
        planId: plan.id,
        coachId: principal.coachId,
        kind: 'REGENERATE',
        payload: { previousVersion: version - 1, generationId: generation.id },
      });
    }

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

export type DietPlanPdfError = { code: 'PLAN_NOT_FOUND' };

/** One Breakfast/Lunch option block for the locked PDF template. */
export type DietPlanPdfOption = {
  /** e.g. "Option 1" — omit/blank to skip the title line. */
  title: string;
  /** Item lines without the leading bullet (renderer adds "•  "). */
  items: string[];
};

/**
 * Inputs for the locked diet-plan PDF template.
 * `clientName` and `coachName` are rendered exactly as provided.
 */
export type DietPlanPdfData = {
  clientName: string;
  coachName: string;
  motivation?: string;
  hydration?: string;
  breakfast: DietPlanPdfOption[];
  lunch: DietPlanPdfOption[];
  dinner: string[];
  notes?: string[];
};

type PlanItemRow = NonNullable<Awaited<ReturnType<typeof getPlanWithItems>>>['items'][number];

const formatItemLine = (portionGrams: number, foodName: string): string =>
  `${Math.round(portionGrams)} g ${foodName}`;

const itemsForDaySlot = (
  items: readonly PlanItemRow[],
  day: number,
  slot: PlanItemRow['mealSlot'],
): string[] => {
  const dayItems = items.filter((i) => i.day === day && i.mealSlot === slot);
  if (dayItems.length === 0) return [];
  const mealIndex = dayItems.reduce((a, b) => (a.mealIndex <= b.mealIndex ? a : b)).mealIndex;
  return dayItems
    .filter((i) => i.mealIndex === mealIndex)
    .sort((a, b) => a.position - b.position)
    .map((i) => formatItemLine(i.portionGrams, i.foodName));
};

const optionsForSlot = (
  items: readonly PlanItemRow[],
  slot: 'breakfast' | 'lunch',
): DietPlanPdfOption[] => {
  const options: DietPlanPdfOption[] = [];
  const day1 = itemsForDaySlot(items, 1, slot);
  if (day1.length > 0) options.push({ title: 'Option 1', items: day1 });
  const day2 = itemsForDaySlot(items, 2, slot);
  if (day2.length > 0) options.push({ title: 'Option 2', items: day2 });
  // Single option: drop the title so the section reads like a flat list.
  if (options.length === 1) {
    const only = options[0];
    if (only) return [{ title: '', items: only.items }];
  }
  return options;
};

/** Aggregate locked-template fields for the diet-plan PDF. */
export const getDietPlanPdfData = async (
  db: Db,
  planId: string,
): Promise<Result<DietPlanPdfData, DietPlanPdfError>> => {
  const withItems = await getPlanWithItems(db, planId);
  if (!withItems) return err({ code: 'PLAN_NOT_FOUND' });

  const [client] = await db
    .select({ name: s.clients.name })
    .from(s.clients)
    .where(eq(s.clients.id, withItems.plan.clientId))
    .limit(1);
  if (!client) return err({ code: 'PLAN_NOT_FOUND' });

  const [coach] = await db
    .select({ name: s.users.name })
    .from(s.coaches)
    .innerJoin(s.users, eq(s.users.id, s.coaches.userId))
    .where(eq(s.coaches.id, withItems.plan.coachId))
    .limit(1);

  const firstToken = client.name.trim().split(/\s+/)[0];
  const firstName = firstToken !== undefined && firstToken !== '' ? firstToken : client.name;
  const coachRaw = coach?.name.trim() ?? '';
  const coachDisplay = coachRaw !== '' ? `Coach ${coachRaw}` : 'Coach';

  return ok({
    clientName: firstName,
    coachName: coachDisplay,
    breakfast: optionsForSlot(withItems.items, 'breakfast'),
    lunch: optionsForSlot(withItems.items, 'lunch'),
    dinner: itemsForDaySlot(withItems.items, 1, 'dinner'),
    notes: ['You can have green tea or black coffee without sugar anytime.'],
  });
};

export type PatchError =
  | { code: 'PLAN_NOT_FOUND' }
  | { code: 'PLAN_NOT_EDITABLE'; status: string }
  | { code: 'ITEM_NOT_FOUND'; itemId: string }
  | { code: 'FOOD_NOT_FOUND'; foodId: string }
  | { code: 'DAY_NOT_FOUND'; day: number };

/** Coach edits — food_db macros from catalog; override-macros is audited coach judgment. */
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
    if (
      op.op === 'set-portion' ||
      op.op === 'swap' ||
      op.op === 'remove' ||
      op.op === 'override-macros'
    ) {
      const item = existing.items.find((i) => i.id === op.itemId);
      if (!item) return err({ code: 'ITEM_NOT_FOUND', itemId: op.itemId });
    }
    if (op.op === 'apply-day-to-week') {
      if (!existing.items.some((i) => i.day === op.day)) {
        return err({ code: 'DAY_NOT_FOUND', day: op.day });
      }
    }
  }

  try {
    await applyPlanOps(db, principal, planId, existing.items, ops);
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

export type PublishOptions = {
  reviewed: boolean;
  acknowledgeDrift?: boolean;
};

export type PublishError =
  | { code: 'PLAN_NOT_FOUND' }
  | { code: 'PLAN_NOT_PUBLISHABLE'; status: string }
  | { code: 'REVIEW_REQUIRED' }
  | {
      code: 'DRIFT_ACK_REQUIRED';
      days: number[];
      kcalTolerancePct: number;
      macroTolerancePct: number;
    };

export type DayTotals = {
  day: number;
  kcal: number;
  proteinG: number;
  fatG: number;
  carbsG: number;
};

export const dayTotalsForPlan = (
  items: readonly { day: number; macros: s.ItemMacros }[],
): DayTotals[] => {
  const byDay = new Map<number, DayTotals>();
  for (const item of items) {
    const cur = byDay.get(item.day) ?? {
      day: item.day,
      kcal: 0,
      proteinG: 0,
      fatG: 0,
      carbsG: 0,
    };
    cur.kcal += item.macros.kcal;
    cur.proteinG += item.macros.proteinG;
    cur.fatG += item.macros.fatG;
    cur.carbsG += item.macros.carbsG;
    byDay.set(item.day, cur);
  }
  return [...byDay.values()].sort((a, b) => a.day - b.day);
};

export const driftedDays = (
  targets: s.PlanTargets,
  items: readonly { day: number; macros: s.ItemMacros }[],
  kcalTolerancePct: number,
  macroTolerancePct: number,
): number[] => {
  const out: number[] = [];
  for (const day of dayTotalsForPlan(items)) {
    const kcalPct = Math.abs((day.kcal - targets.kcal) / targets.kcal) * 100;
    const proteinPct =
      targets.proteinG > 0
        ? Math.abs((day.proteinG - targets.proteinG) / targets.proteinG) * 100
        : 0;
    const fatPct = targets.fatG > 0 ? Math.abs((day.fatG - targets.fatG) / targets.fatG) * 100 : 0;
    const carbsPct =
      targets.carbsG > 0 ? Math.abs((day.carbsG - targets.carbsG) / targets.carbsG) * 100 : 0;
    if (
      kcalPct > kcalTolerancePct ||
      proteinPct > macroTolerancePct ||
      fatPct > macroTolerancePct ||
      carbsPct > macroTolerancePct
    ) {
      out.push(day.day);
    }
  }
  return out;
};

export const publishPlan = async (
  db: Db,
  principal: { userId: string; coachId: string },
  planId: string,
  options: PublishOptions,
  tolerances: { kcalTolerancePct: number; macroTolerancePct: number },
): Promise<Result<typeof s.mealPlans.$inferSelect, PublishError>> => {
  if (!options.reviewed) {
    return err({ code: 'REVIEW_REQUIRED' });
  }

  const withItems = await getPlanWithItems(db, planId);
  if (!withItems) return err({ code: 'PLAN_NOT_FOUND' });
  const { plan, items } = withItems;
  if (plan.status !== 'DRAFT' && plan.status !== 'NEEDS_REVIEW') {
    return err({ code: 'PLAN_NOT_PUBLISHABLE', status: plan.status });
  }

  const drift = driftedDays(
    plan.targets,
    items,
    tolerances.kcalTolerancePct,
    tolerances.macroTolerancePct,
  );
  if (drift.length > 0 && options.acknowledgeDrift !== true) {
    return err({
      code: 'DRIFT_ACK_REQUIRED',
      days: drift,
      kcalTolerancePct: tolerances.kcalTolerancePct,
      macroTolerancePct: tolerances.macroTolerancePct,
    });
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

    const [editEvent] = await tx
      .select({ id: s.aiFeedbackEvents.id })
      .from(s.aiFeedbackEvents)
      .where(
        and(
          eq(s.aiFeedbackEvents.planId, planId),
          inArray(s.aiFeedbackEvents.kind, ['EDIT', 'SWAP']),
        ),
      )
      .limit(1);

    if (!editEvent) {
      const day1Foods = items
        .filter((i) => i.day === 1)
        .map((i) => ({ foodId: i.foodId, slot: i.mealSlot }));
      await tx.insert(s.aiFeedbackEvents).values({
        planId,
        coachId: principal.coachId,
        ...(plan.generationId !== null ? { generationId: plan.generationId } : {}),
        kind: 'PUBLISH_UNCHANGED',
        payload: { foods: day1Foods },
      });
    }

    await writeAudit(tx, {
      actorUserId: principal.userId,
      actorRole: 'COACH',
      action: 'plan.publish',
      resourceType: 'meal_plan',
      resourceId: planId,
      after: {
        version: row.version,
        reviewed: true,
        acknowledgeDrift: options.acknowledgeDrift === true,
        driftedDays: drift,
        publishSignal: editEvent ? 'EDITED' : 'PUBLISH_UNCHANGED',
      },
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
