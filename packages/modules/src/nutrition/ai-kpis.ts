import { and, count, eq, gte, inArray, sql } from 'drizzle-orm';
import { DateTime } from 'luxon';
import { iso, schema as s, type Db } from '@gymos/db';

export type GenerationKpis = {
  readonly windowHours: number;
  readonly succeeded: number;
  readonly fellBackRate: number | null;
  readonly cacheHitRate: number | null;
  readonly guardrailFailRate: number | null;
  /** REJECTED generations / (SUCCEEDED + REJECTED) in window — allergen post-check. */
  readonly allergenRejectRate: number | null;
};

export type EditSignals = {
  readonly windowDays: number;
  readonly editCount: number;
  readonly swapCount: number;
  readonly publishUnchangedCount: number;
  readonly regenerateCount: number;
  readonly adjustmentAcceptedCount: number;
  readonly adjustmentModifiedCount: number;
  readonly adjustmentRejectedCount: number;
  /**
   * ADJUSTMENT_ACCEPTED / (accepted + modified + rejected).
   * Null when no adjustment outcomes in the window.
   */
  readonly adjustmentAcceptRate: number | null;
};

export type DaysCustomizedKpi = {
  readonly publishedPlans: number;
  readonly totalDays: number;
  readonly customizedDays: number;
  /** Share of non-day-1 days that diverge from the day-1 template. */
  readonly daysCustomizedPct: number | null;
};

export type EditDistanceKpi = {
  readonly windowDays: number;
  readonly sampleSize: number;
  /**
   * Mean normalized Levenshtein over day-1 meal names (generation snapshot → published).
   * 0 = names unchanged; approaches 1 when heavily rewritten. Null if no samples.
   */
  readonly meanNormalizedEditDistance: number | null;
};

/** Online Layer-3 KPIs from plan_generations in the lookback window. */
export const queryGenerationKpis = async (
  db: Db,
  opts?: { windowHours?: number },
): Promise<GenerationKpis> => {
  const windowHours = opts?.windowHours ?? 24;
  const since = iso(DateTime.utc().minus({ hours: windowHours }));

  const rows = await db
    .select({
      status: s.planGenerations.status,
      fellBack: sql<boolean | null>`(${s.planGenerations.validation}->>'fellBack')::boolean`,
      cacheHit: sql<boolean | null>`(${s.planGenerations.validation}->>'cacheHit')::boolean`,
      guardrail: sql<string | null>`${s.planGenerations.validation}->>'guardrail'`,
    })
    .from(s.planGenerations)
    .where(
      and(
        inArray(s.planGenerations.status, ['SUCCEEDED', 'REJECTED']),
        gte(s.planGenerations.createdAt, since),
      ),
    );

  const succeededRows = rows.filter((r) => r.status === 'SUCCEEDED');
  const rejected = rows.filter((r) => r.status === 'REJECTED').length;
  const succeeded = succeededRows.length;
  const denomAllergen = succeeded + rejected;

  if (succeeded === 0) {
    return {
      windowHours,
      succeeded: 0,
      fellBackRate: null,
      cacheHitRate: null,
      guardrailFailRate: null,
      allergenRejectRate: denomAllergen === 0 ? null : rejected / denomAllergen,
    };
  }

  const fellBack = succeededRows.filter((r) => r.fellBack === true).length;
  const cacheHits = succeededRows.filter((r) => r.cacheHit === true).length;
  const guardrailFails = succeededRows.filter(
    (r) => r.guardrail !== null && r.guardrail !== '',
  ).length;

  return {
    windowHours,
    succeeded,
    fellBackRate: fellBack / succeeded,
    cacheHitRate: cacheHits / succeeded,
    guardrailFailRate: guardrailFails / succeeded,
    allergenRejectRate: denomAllergen === 0 ? null : rejected / denomAllergen,
  };
};

/** Coach edit / swap / publish / adjustment signals from ai_feedback_events. */
export const queryEditSignals = async (
  db: Db,
  opts?: { windowDays?: number },
): Promise<EditSignals> => {
  const windowDays = opts?.windowDays ?? 30;
  const since = iso(DateTime.utc().minus({ days: windowDays }));

  const rows = await db
    .select({
      kind: s.aiFeedbackEvents.kind,
      n: count(),
    })
    .from(s.aiFeedbackEvents)
    .where(gte(s.aiFeedbackEvents.createdAt, since))
    .groupBy(s.aiFeedbackEvents.kind);

  const byKind = new Map(rows.map((r) => [r.kind, r.n]));
  const adjustmentAcceptedCount = byKind.get('ADJUSTMENT_ACCEPTED') ?? 0;
  const adjustmentModifiedCount = byKind.get('ADJUSTMENT_MODIFIED') ?? 0;
  const adjustmentRejectedCount = byKind.get('ADJUSTMENT_REJECTED') ?? 0;
  const adjustmentTotal =
    adjustmentAcceptedCount + adjustmentModifiedCount + adjustmentRejectedCount;

  return {
    windowDays,
    editCount: byKind.get('EDIT') ?? 0,
    swapCount: byKind.get('SWAP') ?? 0,
    publishUnchangedCount: byKind.get('PUBLISH_UNCHANGED') ?? 0,
    regenerateCount: byKind.get('REGENERATE') ?? 0,
    adjustmentAcceptedCount,
    adjustmentModifiedCount,
    adjustmentRejectedCount,
    adjustmentAcceptRate: adjustmentTotal === 0 ? null : adjustmentAcceptedCount / adjustmentTotal,
  };
};

const dayFingerprint = (
  items: readonly { day: number; mealIndex: number; foodId: string; portionGrams: number }[],
  day: number,
): string =>
  items
    .filter((i) => i.day === day)
    .map((i) => `${i.mealIndex}:${i.foodId}:${i.portionGrams}`)
    .sort()
    .join('|');

/**
 * Among PUBLISHED plans, share of days 2–7 whose food/portion fingerprint
 * differs from day 1 (coach-customized days on a daily template).
 */
export const queryDaysCustomizedPct = async (db: Db): Promise<DaysCustomizedKpi> => {
  const plans = await db
    .select({ id: s.mealPlans.id })
    .from(s.mealPlans)
    .where(eq(s.mealPlans.status, 'PUBLISHED'));

  if (plans.length === 0) {
    return { publishedPlans: 0, totalDays: 0, customizedDays: 0, daysCustomizedPct: null };
  }

  const items = await db
    .select({
      planId: s.mealPlanItems.planId,
      day: s.mealPlanItems.day,
      mealIndex: s.mealPlanItems.mealIndex,
      foodId: s.mealPlanItems.foodId,
      portionGrams: s.mealPlanItems.portionGrams,
    })
    .from(s.mealPlanItems)
    .where(
      inArray(
        s.mealPlanItems.planId,
        plans.map((p) => p.id),
      ),
    );

  let totalDays = 0;
  let customizedDays = 0;

  for (const plan of plans) {
    const planItems = items.filter((i) => i.planId === plan.id);
    const days = [...new Set(planItems.map((i) => i.day))].sort((a, b) => a - b);
    const day1 = dayFingerprint(planItems, 1);
    for (const day of days) {
      if (day === 1) continue;
      totalDays += 1;
      if (dayFingerprint(planItems, day) !== day1) customizedDays += 1;
    }
  }

  return {
    publishedPlans: plans.length,
    totalDays,
    customizedDays,
    daysCustomizedPct: totalDays === 0 ? null : customizedDays / totalDays,
  };
};

/** Classic Levenshtein distance (small strings — meal names). */
export const levenshtein = (a: string, b: string): number => {
  if (a === b) return 0;
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;
  const row = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i += 1) {
    let prev = row[0] ?? 0;
    row[0] = i;
    for (let j = 1; j <= b.length; j += 1) {
      const tmp = row[j] ?? 0;
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      row[j] = Math.min((row[j] ?? 0) + 1, (row[j - 1] ?? 0) + 1, prev + cost);
      prev = tmp;
    }
  }
  return row[b.length] ?? 0;
};

export const normalizedEditDistance = (a: string, b: string): number => {
  const maxLen = Math.max(a.length, b.length);
  if (maxLen === 0) return 0;
  return levenshtein(a, b) / maxLen;
};

/**
 * Mean normalized meal-name edit distance for published plans in the window
 * that still have a generation snapshot (`validation.templateMealNames`).
 */
export const queryEditDistance = async (
  db: Db,
  opts?: { windowDays?: number },
): Promise<EditDistanceKpi> => {
  const windowDays = opts?.windowDays ?? 30;
  const since = iso(DateTime.utc().minus({ days: windowDays }));

  const plans = await db
    .select({
      id: s.mealPlans.id,
      generationId: s.mealPlans.generationId,
    })
    .from(s.mealPlans)
    .where(
      and(
        eq(s.mealPlans.status, 'PUBLISHED'),
        gte(s.mealPlans.publishedAt, since),
        sql`${s.mealPlans.generationId} is not null`,
      ),
    );

  if (plans.length === 0) {
    return { windowDays, sampleSize: 0, meanNormalizedEditDistance: null };
  }

  const genIds = plans
    .map((p) => p.generationId)
    .filter((id): id is string => typeof id === 'string');

  const gens =
    genIds.length === 0
      ? []
      : await db
          .select({
            id: s.planGenerations.id,
            validation: s.planGenerations.validation,
          })
          .from(s.planGenerations)
          .where(inArray(s.planGenerations.id, genIds));

  const namesByGen = new Map<string, string[]>();
  for (const g of gens) {
    const raw = (g.validation as { templateMealNames?: unknown } | null)?.templateMealNames;
    if (!Array.isArray(raw)) continue;
    const names = raw.filter((n): n is string => typeof n === 'string');
    if (names.length > 0) namesByGen.set(g.id, names);
  }

  const items = await db
    .select({
      planId: s.mealPlanItems.planId,
      mealIndex: s.mealPlanItems.mealIndex,
      mealName: s.mealPlanItems.mealName,
    })
    .from(s.mealPlanItems)
    .where(
      and(
        inArray(
          s.mealPlanItems.planId,
          plans.map((p) => p.id),
        ),
        eq(s.mealPlanItems.day, 1),
      ),
    );

  const distances: number[] = [];
  for (const plan of plans) {
    if (plan.generationId === null) continue;
    const generated = namesByGen.get(plan.generationId);
    if (!generated) continue;

    const byMeal = new Map<number, string>();
    for (const item of items.filter((i) => i.planId === plan.id)) {
      if (!byMeal.has(item.mealIndex)) byMeal.set(item.mealIndex, item.mealName);
    }
    const published = [...byMeal.entries()].sort(([a], [b]) => a - b).map(([, name]) => name);

    const n = Math.min(generated.length, published.length);
    if (n === 0) continue;
    let sum = 0;
    for (let i = 0; i < n; i += 1) {
      sum += normalizedEditDistance(generated[i] ?? '', published[i] ?? '');
    }
    distances.push(sum / n);
  }

  return {
    windowDays,
    sampleSize: distances.length,
    meanNormalizedEditDistance:
      distances.length === 0 ? null : distances.reduce((a, b) => a + b, 0) / distances.length,
  };
};
