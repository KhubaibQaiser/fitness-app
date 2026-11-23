import { and, eq, sql } from 'drizzle-orm';
import { assertNoRestrictedFoods } from '@gymos/core/nutrition';
import { schema as s, type Db, type DbOrTx } from '@gymos/db';
import { getActiveProfile, restrictedAllergenCodes } from './dietary';
import { foodsById } from './foods';

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
    }
  | {
      op: 'override-macros';
      itemId: string;
      macros: { kcal: number; proteinG: number; fatG: number; carbsG: number };
      reason?: string | undefined;
    }
  | { op: 'apply-day-to-week'; day: number }
  | { op: 'set-title'; title: string };

export type PlanItemRow = typeof s.mealPlanItems.$inferSelect & { foodName?: string };

export class PatchFoodMissing extends Error {
  constructor(readonly foodId: string) {
    super(`food not found: ${foodId}`);
  }
}

export class PatchAllergenConflict extends Error {
  constructor(
    readonly foodId: string,
    readonly allergen: string,
  ) {
    super(`food ${foodId} contains restricted allergen ${allergen}`);
  }
}

/** Pure: scale food macros to a portion. */
export const gramsMacros = (per100g: s.Per100g, grams: number) => ({
  kcal: Math.round((per100g.kcal * grams) / 100),
  proteinG: Math.round(((per100g.proteinG * grams) / 100) * 10) / 10,
  fatG: Math.round(((per100g.fatG * grams) / 100) * 10) / 10,
  carbsG: Math.round(((per100g.carbsG * grams) / 100) * 10) / 10,
});

/** Pure: empty / whitespace → null; otherwise trim + cap. */
export const normalizePlanTitle = (title: string, maxLen = 50): string | null => {
  const trimmed = title.trim();
  if (trimmed.length === 0) return null;
  return trimmed.slice(0, maxLen);
};

/** Pure: clone source-day items onto the other six days. */
export const clonesForApplyDayToWeek = (
  planId: string,
  sourceDay: number,
  source: readonly PlanItemRow[],
): (typeof s.mealPlanItems.$inferInsert)[] => {
  const clones: (typeof s.mealPlanItems.$inferInsert)[] = [];
  for (let day = 1; day <= 7; day += 1) {
    if (day === sourceDay) continue;
    for (const item of source) {
      clones.push({
        planId,
        day,
        mealIndex: item.mealIndex,
        mealSlot: item.mealSlot,
        mealName: item.mealName,
        foodId: item.foodId,
        portionGrams: item.portionGrams,
        macros: item.macros,
        macrosSource: item.macrosSource,
        prepNotes: item.prepNotes,
        position: item.position,
      });
    }
  }
  return clones;
};

type ApplyCtx = {
  readonly tx: DbOrTx;
  readonly planId: string;
  readonly coachId: string;
  readonly working: { items: PlanItemRow[] };
  /** The client's allergen codes, by the same rule as the solver's Layer-2 filter. */
  readonly restrictedAllergens: readonly string[];
};

/** A coach can't put into a plan by hand what generation would exclude (ADR-0001, ruling O16). */
const assertNoAllergen = (
  ctx: ApplyCtx,
  items: readonly { foodId: string }[],
  foods: Awaited<ReturnType<typeof foodsById>>,
): void => {
  const check = assertNoRestrictedFoods(items, foods, ctx.restrictedAllergens);
  if (!check.ok) throw new PatchAllergenConflict(check.error.foodId, check.error.allergen);
};

const requireItem = (ctx: ApplyCtx, itemId: string): PlanItemRow | null =>
  ctx.working.items.find((i) => i.id === itemId) ?? null;

const applyRemove = async (ctx: ApplyCtx, op: Extract<PlanOp, { op: 'remove' }>): Promise<void> => {
  await ctx.tx.delete(s.mealPlanItems).where(eq(s.mealPlanItems.id, op.itemId));
  ctx.working.items = ctx.working.items.filter((i) => i.id !== op.itemId);
};

const applySetPortion = async (
  ctx: ApplyCtx,
  op: Extract<PlanOp, { op: 'set-portion' }>,
): Promise<void> => {
  const item = requireItem(ctx, op.itemId);
  if (!item) return;
  const food = await foodsById(ctx.tx, [item.foodId]);
  const per100g = food.get(item.foodId)?.per100g;
  if (!per100g) return;
  const macros = gramsMacros(per100g, op.portionGrams);
  await ctx.tx
    .update(s.mealPlanItems)
    .set({
      portionGrams: op.portionGrams,
      macros,
      macrosSource: 'food_db',
    })
    .where(eq(s.mealPlanItems.id, op.itemId));
  item.portionGrams = op.portionGrams;
  item.macros = macros;
  item.macrosSource = 'food_db';
};

const applySwap = async (ctx: ApplyCtx, op: Extract<PlanOp, { op: 'swap' }>): Promise<void> => {
  const item = requireItem(ctx, op.itemId);
  if (!item) return;
  const food = await foodsById(ctx.tx, [op.foodId]);
  const per100g = food.get(op.foodId)?.per100g;
  if (!per100g) throw new PatchFoodMissing(op.foodId);
  assertNoAllergen(ctx, [{ foodId: op.foodId }], food);
  const macros = gramsMacros(per100g, item.portionGrams);
  await ctx.tx
    .update(s.mealPlanItems)
    .set({ foodId: op.foodId, macros, macrosSource: 'food_db' })
    .where(eq(s.mealPlanItems.id, op.itemId));
  await ctx.tx.insert(s.aiFeedbackEvents).values({
    planId: ctx.planId,
    coachId: ctx.coachId,
    kind: 'SWAP',
    payload: { from: item.foodId, to: op.foodId, slot: item.mealSlot },
  });
  item.foodId = op.foodId;
  item.macros = macros;
  item.macrosSource = 'food_db';
};

const applyOverrideMacros = async (
  ctx: ApplyCtx,
  op: Extract<PlanOp, { op: 'override-macros' }>,
): Promise<void> => {
  const item = requireItem(ctx, op.itemId);
  if (!item) return;
  await ctx.tx
    .update(s.mealPlanItems)
    .set({ macros: op.macros, macrosSource: 'coach_override' })
    .where(eq(s.mealPlanItems.id, op.itemId));
  item.macros = op.macros;
  item.macrosSource = 'coach_override';
  await ctx.tx.insert(s.aiFeedbackEvents).values({
    planId: ctx.planId,
    coachId: ctx.coachId,
    kind: 'EDIT',
    payload: {
      op: 'override-macros',
      itemId: op.itemId,
      macros: op.macros,
      reason: op.reason ?? null,
    },
  });
};

const applyDayToWeek = async (
  ctx: ApplyCtx,
  op: Extract<PlanOp, { op: 'apply-day-to-week' }>,
): Promise<void> => {
  const source = ctx.working.items.filter((i) => i.day === op.day);
  // Fail closed on an allergen item already in the plan (from before this check), not copy it.
  assertNoAllergen(ctx, source, await foodsById(ctx.tx, [...new Set(source.map((i) => i.foodId))]));
  await ctx.tx
    .delete(s.mealPlanItems)
    .where(and(eq(s.mealPlanItems.planId, ctx.planId), sql`${s.mealPlanItems.day} <> ${op.day}`));
  const clones = clonesForApplyDayToWeek(ctx.planId, op.day, source);
  if (clones.length > 0) {
    await ctx.tx.insert(s.mealPlanItems).values(clones);
  }
};

const applySetTitle = async (
  ctx: ApplyCtx,
  op: Extract<PlanOp, { op: 'set-title' }>,
): Promise<void> => {
  await ctx.tx
    .update(s.mealPlans)
    .set({ title: normalizePlanTitle(op.title) })
    .where(eq(s.mealPlans.id, ctx.planId));
};

const applyAdd = async (ctx: ApplyCtx, op: Extract<PlanOp, { op: 'add' }>): Promise<void> => {
  const food = await foodsById(ctx.tx, [op.foodId]);
  const per100g = food.get(op.foodId)?.per100g;
  if (!per100g) throw new PatchFoodMissing(op.foodId);
  assertNoAllergen(ctx, [{ foodId: op.foodId }], food);
  await ctx.tx.insert(s.mealPlanItems).values({
    planId: ctx.planId,
    day: op.day,
    mealIndex: op.mealIndex,
    mealSlot: op.mealSlot,
    mealName: `${op.mealSlot}, day ${op.day}`,
    foodId: op.foodId,
    portionGrams: op.portionGrams,
    macros: gramsMacros(per100g, op.portionGrams),
    macrosSource: 'food_db',
    position: 99,
  });
};

/** Dispatch one op — exhaustive switch, no if/else ladder. */
export const applyPlanOp = async (ctx: ApplyCtx, op: PlanOp): Promise<void> => {
  switch (op.op) {
    case 'remove':
      return applyRemove(ctx, op);
    case 'set-portion':
      return applySetPortion(ctx, op);
    case 'swap':
      return applySwap(ctx, op);
    case 'override-macros':
      return applyOverrideMacros(ctx, op);
    case 'apply-day-to-week':
      return applyDayToWeek(ctx, op);
    case 'set-title':
      return applySetTitle(ctx, op);
    case 'add':
      return applyAdd(ctx, op);
    default: {
      const _exhaustive: never = op;
      void _exhaustive;
      throw new Error('unreachable plan op');
    }
  }
};

/** Run a batch of coach edits in one transaction + audit EDIT event. */
export const applyPlanOps = async (
  db: Db,
  principal: { userId: string; coachId: string },
  planId: string,
  existingItems: readonly PlanItemRow[],
  ops: PlanOp[],
): Promise<void> => {
  const working = { items: [...existingItems] };
  await db.transaction(async (tx) => {
    const [plan] = await tx
      .select({ clientId: s.mealPlans.clientId })
      .from(s.mealPlans)
      .where(eq(s.mealPlans.id, planId))
      .limit(1);
    if (!plan) throw new Error(`applyPlanOps: plan ${planId} not found`);
    const profile = await getActiveProfile(tx, plan.clientId);
    const ctx: ApplyCtx = {
      tx,
      planId,
      coachId: principal.coachId,
      working,
      restrictedAllergens: restrictedAllergenCodes(profile?.restrictions ?? []),
    };
    for (const op of ops) {
      await applyPlanOp(ctx, op);
    }
    await tx.insert(s.aiFeedbackEvents).values({
      planId,
      coachId: principal.coachId,
      kind: 'EDIT',
      payload: { ops: ops.map((o) => o.op) },
    });
  });
};
