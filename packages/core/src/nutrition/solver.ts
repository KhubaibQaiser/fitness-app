import { err, ok, type Result } from '../shared/result';
import { type MacroTargets } from './types';

/**
 * Layer 2 — deterministic meal construction + portion solving.
 * Hard restriction filtering happens BEFORE this layer (SQL); the solver
 * additionally exposes `assertNoRestrictedFoods` as the independent second
 * allergen check that runs after generation (spec's two-check rule).
 * Seeded PRNG ⇒ identical inputs + seed reproduce the identical plan.
 */

export type FoodGroup =
  'protein' | 'staple' | 'vegetable' | 'fruit' | 'dairy' | 'fat' | 'snack' | 'beverage';

export type Per100g = {
  kcal: number;
  proteinG: number;
  fatG: number;
  carbsG: number;
  fiberG: number;
};

export type CandidateFood = {
  readonly id: string;
  readonly name: string;
  readonly foodGroup: FoodGroup;
  readonly per100g: Per100g;
  readonly allergenTags: readonly string[];
  /** Native serving units; portions move in 0.5-unit steps of the first unit. */
  readonly servingUnits: readonly { name: string; grams: number }[];
  /** Slots this food may appear in. Empty = never selected. */
  readonly allowedSlots: readonly MealSlot[];
  /** Layer-4 ranking seam — higher ranks earlier. Default 1. */
  readonly rankScore?: number;
  /**
   * Realistic single-item serving ceiling, in native serving units
   * (`servingUnits[0]`) — e.g. 3 for an egg (piece = 50g ⇒ 150g ceiling).
   * Per-food, never a global gram cap (ADR-0015 D1). Undefined falls back
   * to a conservative default derived from the food's own serving size.
   */
  readonly maxUnits?: number;
};

export type MealSlot = 'breakfast' | 'lunch' | 'dinner' | 'snack';

export type MealTemplateEntry = {
  readonly slot: MealSlot;
  readonly share: number;
  readonly pattern: readonly FoodGroup[];
};

export type SolvedItem = {
  readonly foodId: string;
  readonly foodName: string;
  readonly slot: MealSlot;
  readonly portionGrams: number;
  readonly portionLabel: string;
  readonly macros: { kcal: number; proteinG: number; fatG: number; carbsG: number };
};

export type SolvedMeal = {
  readonly slot: MealSlot;
  readonly mealIndex: number;
  readonly items: SolvedItem[];
  readonly totals: { kcal: number; proteinG: number; fatG: number; carbsG: number };
};

export type SolvedDay = {
  readonly day: number;
  readonly meals: SolvedMeal[];
  readonly totals: { kcal: number; proteinG: number; fatG: number; carbsG: number };
};

export type SolverError =
  | { readonly code: 'NO_CANDIDATES'; readonly group: FoodGroup }
  | {
      readonly code: 'SOLVER_INFEASIBLE';
      readonly detail: string;
      readonly bestErrorPct: number;
    };

export type SolverConfig = {
  readonly mealCount: 3 | 4 | 5;
  readonly kcalTolerancePct: number; // plan-level, default 5
  readonly macroTolerancePct: number; // plan-level per macro, default 10
  readonly seed: string;
};

export const DEFAULT_SOLVER_CONFIG: Omit<SolverConfig, 'seed'> = {
  mealCount: 3,
  kcalTolerancePct: 5,
  macroTolerancePct: 10,
};

/** Breakfast foods coaches expect — also documented on the Tools meals page. */
export const BREAKFAST_FOOD_NAMES = [
  'Egg (whole, boiled)',
  'Egg scrambled',
  'Omelette',
  'Greek yogurt (plain)',
  'Granola yogurt bowl',
  'Bran bread',
  'Oats (dry)',
  'Black coffee',
  'Green tea',
  'Chai with stevia',
] as const;

/**
 * Meal structure by meal count: slot + share of daily kcal + food-group pattern.
 * Dinner is protein + vegetables only; lunch carries fat and most carbs.
 */
export const MEAL_TEMPLATES: Record<3 | 4 | 5, readonly MealTemplateEntry[]> = {
  3: [
    { slot: 'breakfast', share: 0.28, pattern: ['protein', 'staple', 'beverage'] },
    { slot: 'lunch', share: 0.47, pattern: ['protein', 'staple', 'vegetable', 'fat'] },
    { slot: 'dinner', share: 0.25, pattern: ['protein', 'vegetable'] },
  ],
  4: [
    { slot: 'breakfast', share: 0.25, pattern: ['protein', 'staple', 'beverage'] },
    { slot: 'lunch', share: 0.35, pattern: ['protein', 'staple', 'vegetable', 'fat'] },
    { slot: 'snack', share: 0.12, pattern: ['fruit', 'fat'] },
    { slot: 'dinner', share: 0.28, pattern: ['protein', 'vegetable'] },
  ],
  5: [
    { slot: 'breakfast', share: 0.24, pattern: ['protein', 'staple', 'beverage'] },
    { slot: 'snack', share: 0.08, pattern: ['fruit'] },
    { slot: 'lunch', share: 0.32, pattern: ['protein', 'staple', 'vegetable', 'fat'] },
    { slot: 'snack', share: 0.08, pattern: ['fat'] },
    { slot: 'dinner', share: 0.28, pattern: ['protein', 'vegetable'] },
  ],
};

/** Groups that may substitute when a pattern group has no candidates. */
const GROUP_FALLBACKS: Record<FoodGroup, FoodGroup[]> = {
  protein: ['dairy'],
  staple: ['dairy', 'fruit'],
  vegetable: ['fruit'],
  fruit: ['vegetable', 'snack'],
  dairy: ['protein'],
  fat: ['dairy', 'snack'],
  snack: ['fruit', 'fat'],
  beverage: [],
};

const OLIVE_OIL_NAME = 'Olive oil';

/** Deterministic PRNG (mulberry32 over a djb2 hash of the seed). */
export const seededRandom = (seed: string): (() => number) => {
  let h = 5381;
  for (let i = 0; i < seed.length; i += 1) {
    h = (h * 33) ^ seed.charCodeAt(i);
  }
  let a = h >>> 0;
  return () => {
    a += 0x6d2b79f5;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

const macrosForGrams = (
  food: CandidateFood,
  grams: number,
): { kcal: number; proteinG: number; fatG: number; carbsG: number } => ({
  kcal: (food.per100g.kcal * grams) / 100,
  proteinG: (food.per100g.proteinG * grams) / 100,
  fatG: (food.per100g.fatG * grams) / 100,
  carbsG: (food.per100g.carbsG * grams) / 100,
});

const sumMacros = (
  items: readonly { macros: { kcal: number; proteinG: number; fatG: number; carbsG: number } }[],
): { kcal: number; proteinG: number; fatG: number; carbsG: number } =>
  items.reduce(
    (acc, item) => ({
      kcal: acc.kcal + item.macros.kcal,
      proteinG: acc.proteinG + item.macros.proteinG,
      fatG: acc.fatG + item.macros.fatG,
      carbsG: acc.carbsG + item.macros.carbsG,
    }),
    { kcal: 0, proteinG: 0, fatG: 0, carbsG: 0 },
  );

/** Relative error of a day against targets, weighted kcal-first. */
const errorScore = (
  totals: { kcal: number; proteinG: number; fatG: number; carbsG: number },
  targets: MacroTargets,
): number => {
  const kcalErr = Math.abs(totals.kcal - targets.kcal) / targets.kcal;
  const proteinErr = Math.abs(totals.proteinG - targets.proteinG) / Math.max(1, targets.proteinG);
  const fatErr = Math.abs(totals.fatG - targets.fatG) / Math.max(1, targets.fatG);
  const carbsErr = Math.abs(totals.carbsG - targets.carbsG) / Math.max(1, targets.carbsG);
  return 2 * kcalErr + proteinErr + fatErr + carbsErr;
};

const withinTolerance = (
  totals: { kcal: number; proteinG: number; fatG: number; carbsG: number },
  targets: MacroTargets,
  config: SolverConfig,
): boolean => {
  const kcalOk =
    Math.abs(totals.kcal - targets.kcal) / targets.kcal <= config.kcalTolerancePct / 100;
  const macroOk = (['proteinG', 'fatG', 'carbsG'] as const).every(
    (m) =>
      Math.abs(totals[m] - targets[m]) / Math.max(1, targets[m]) <= config.macroTolerancePct / 100,
  );
  return kcalOk && macroOk;
};

type MutableItem = {
  food: CandidateFood;
  slot: MealSlot;
  mealIndex: number;
  units: number; // portions in serving units (0.5 steps)
  unitGrams: number;
  unitName: string;
  /** Beverages stay at 1 serving — excluded from hill-climb. */
  fixedPortion: boolean;
};

const UNIT_MIN = 0.5;
const UNIT_MAX = 8;
const UNIT_STEP = 0.5;
/**
 * Bounds dynamic expansion (ADR-0015 D1) — at most this many items beyond a
 * meal's own base pattern length. Relative, not a flat constant: lunch's base
 * pattern is already 4 groups (protein/staple/vegetable/fat), larger than
 * dinner's 2, so a single flat cap smaller than 4 would forbid lunch from
 * expanding at all before it even starts.
 */
const MAX_EXPANSION_ITEMS_PER_MEAL = 2;
/** Conservative per-food ceiling in grams when `foods.max_units` is unset. */
const DEFAULT_MAX_UNITS_GRAMS = 250;
/** Bounds the expansion loop per solve attempt — well under any realistic meal-composition need. */
const MAX_EXPANSIONS_PER_ATTEMPT = 10;

/**
 * Realistic per-item serving ceiling in native serving units — per-food, never
 * a single global gram number (ADR-0015 D1: a flat cap is simultaneously too
 * high for calorie-dense fats and too low for bulky staples). Falls back to a
 * conservative default derived from the food's own serving size when the
 * catalog has not set an explicit `maxUnits`.
 */
const unitCeiling = (food: CandidateFood, unitGrams: number): number => {
  const fallback = Math.round(DEFAULT_MAX_UNITS_GRAMS / unitGrams / UNIT_STEP) * UNIT_STEP;
  const raw = food.maxUnits ?? fallback;
  return Math.min(UNIT_MAX, Math.max(UNIT_MIN, raw));
};

const toSolvedItem = (item: MutableItem): SolvedItem => {
  const grams = Number((item.units * item.unitGrams).toFixed(1));
  const macros = macrosForGrams(item.food, grams);
  return {
    foodId: item.food.id,
    foodName: item.food.name,
    slot: item.slot,
    portionGrams: grams,
    portionLabel: `${item.units} ${item.unitName}`,
    macros: {
      kcal: Math.round(macros.kcal),
      proteinG: Math.round(macros.proteinG * 10) / 10,
      fatG: Math.round(macros.fatG * 10) / 10,
      carbsG: Math.round(macros.carbsG * 10) / 10,
    },
  };
};

const currentTotals = (items: readonly MutableItem[]) =>
  sumMacros(items.map((i) => ({ macros: macrosForGrams(i.food, i.units * i.unitGrams) })));

/**
 * Greedy hill-climb: repeatedly apply the single ±0.5-unit portion move that
 * most reduces the weighted error, until tolerance is met or no move helps.
 * Deterministic given item order. Fixed-portion items (beverages) are skipped.
 */
const optimizePortions = (
  items: MutableItem[],
  targets: MacroTargets,
  config: SolverConfig,
): void => {
  while (true) {
    const totals = currentTotals(items);
    if (withinTolerance(totals, targets, config)) return;
    let bestItem: MutableItem | null = null;
    let bestDelta = 0;
    let bestScore = errorScore(totals, targets);
    for (const item of items) {
      if (item.fixedPortion) continue;
      for (const delta of [UNIT_STEP, -UNIT_STEP]) {
        const next = item.units + delta;
        if (next < UNIT_MIN || next > unitCeiling(item.food, item.unitGrams)) continue;
        item.units = next;
        const score = errorScore(currentTotals(items), targets);
        item.units = next - delta;
        if (score < bestScore - 1e-9) {
          bestScore = score;
          bestItem = item;
          bestDelta = delta;
        }
      }
    }
    if (bestItem === null) return;
    bestItem.units += bestDelta;
  }
};

const allowedForSlot = (food: CandidateFood, slot: MealSlot): boolean =>
  food.allowedSlots.includes(slot);

const effectiveRank = (food: CandidateFood, group: FoodGroup): number => {
  const base = food.rankScore ?? 1;
  if (group === 'fat' && food.name === OLIVE_OIL_NAME) return base + 2;
  return base;
};

const pickCandidate = (
  pool: readonly CandidateFood[],
  group: FoodGroup,
  slot: MealSlot,
  rand: () => number,
  used: ReadonlySet<string>,
): CandidateFood | undefined => {
  const groups = [group, ...GROUP_FALLBACKS[group]];
  const slotPool = pool.filter((f) => allowedForSlot(f, slot));
  for (const g of groups) {
    const inGroup = slotPool
      .filter((f) => f.foodGroup === g)
      .sort((a, b) => effectiveRank(b, g) - effectiveRank(a, g) || a.id.localeCompare(b.id));
    if (inGroup.length === 0) continue;
    const fresh = inGroup.filter((f) => !used.has(f.id));
    const pickFrom = fresh.length > 0 ? fresh : inGroup;
    const topN = pickFrom.slice(0, Math.min(3, pickFrom.length));
    const idx = Math.floor(rand() * topN.length);
    return topN[idx];
  }
  return undefined;
};

const ATTEMPTS_PER_DAY = 10;

/**
 * Build one meal's initial items — a food per pattern group, sized to that
 * group's share of the meal's kcal share, clamped to each food's own
 * realistic ceiling (never `UNIT_MAX` alone). Shared by the full-day build
 * loop below and by `solveMeal`'s single-meal regenerate path (ADR-0015 D3),
 * so meal composition logic exists exactly once.
 */
const buildMealItems = (
  mealIndex: number,
  meal: MealTemplateEntry,
  targets: MacroTargets,
  candidates: readonly CandidateFood[],
  rand: () => number,
  used: Set<string>,
): Result<MutableItem[], SolverError> => {
  const adjustableGroups = meal.pattern.filter((g) => g !== 'beverage');
  const adjustableCount = Math.max(1, adjustableGroups.length);
  const items: MutableItem[] = [];
  for (const group of meal.pattern) {
    const food = pickCandidate(candidates, group, meal.slot, rand, used);
    if (food === undefined) {
      return err({ code: 'NO_CANDIDATES', group });
    }
    used.add(food.id);
    const unit = food.servingUnits[0] ?? { name: 'g', grams: 100 };
    const fixedPortion = group === 'beverage' || food.foodGroup === 'beverage';
    let units: number;
    if (fixedPortion) {
      units = 1;
    } else {
      const perItemKcal = (targets.kcal * meal.share) / adjustableCount;
      const kcalPerUnit = (food.per100g.kcal * unit.grams) / 100;
      const rawUnits = kcalPerUnit > 0 ? perItemKcal / kcalPerUnit : UNIT_MIN;
      const ceiling = unitCeiling(food, unit.grams);
      units = Math.min(ceiling, Math.max(UNIT_MIN, Math.round(rawUnits / UNIT_STEP) * UNIT_STEP));
    }
    items.push({
      food,
      slot: meal.slot,
      mealIndex,
      units,
      unitGrams: unit.grams,
      unitName: unit.name,
      fixedPortion,
    });
  }
  return ok(items);
};

const buildItems = (
  targets: MacroTargets,
  candidates: readonly CandidateFood[],
  template: readonly MealTemplateEntry[],
  rand: () => number,
): Result<MutableItem[], SolverError> => {
  const used = new Set<string>();
  const items: MutableItem[] = [];
  for (const [mealIndex, meal] of template.entries()) {
    const built = buildMealItems(mealIndex, meal, targets, candidates, rand, used);
    if (!built.ok) return built;
    items.push(...built.value);
  }
  return ok(items);
};

/**
 * Dynamic pattern expansion (ADR-0015 D1): when the day is still short of its
 * kcal target and an adjustable item is already at its realistic ceiling,
 * add another item to that same meal — from the same food group or a
 * `GROUP_FALLBACKS` group — rather than continuing to inflate one item past
 * what a plate realistically holds. Bounded by `MAX_EXPANSION_ITEMS_PER_MEAL`
 * (relative to each meal's own base pattern length — no meal silently grows
 * without limit) and `MAX_EXPANSIONS_PER_ATTEMPT` (a hard iteration guard).
 * De-prioritizes, never hard-excludes, foods already used that day — a thin
 * candidate pool should degrade to reuse, not to `NO_CANDIDATES`.
 */
const expandInfeasibleItems = (
  items: MutableItem[],
  targets: MacroTargets,
  config: SolverConfig,
  mealByIndex: ReadonlyMap<number, MealTemplateEntry>,
  candidates: readonly CandidateFood[],
  rand: () => number,
  used: Set<string>,
): void => {
  for (let expansion = 0; expansion < MAX_EXPANSIONS_PER_ATTEMPT; expansion += 1) {
    const totals = currentTotals(items);
    if (withinTolerance(totals, targets, config)) return;
    if (totals.kcal >= targets.kcal) return; // expansion only helps when short of target

    const atCeiling = items.find((item) => {
      if (item.fixedPortion) return false;
      const itemMeal = mealByIndex.get(item.mealIndex);
      if (!itemMeal) return false;
      const mealItemCount = items.filter((i) => i.mealIndex === item.mealIndex).length;
      if (mealItemCount >= itemMeal.pattern.length + MAX_EXPANSION_ITEMS_PER_MEAL) return false;
      return item.units >= unitCeiling(item.food, item.unitGrams);
    });
    if (!atCeiling) return; // nothing left that expansion could help

    const meal = mealByIndex.get(atCeiling.mealIndex);
    if (!meal) return;
    const newFood = pickCandidate(candidates, atCeiling.food.foodGroup, meal.slot, rand, used);
    if (!newFood) return;
    used.add(newFood.id);
    const unit = newFood.servingUnits[0] ?? { name: 'g', grams: 100 };
    items.push({
      food: newFood,
      slot: meal.slot,
      mealIndex: atCeiling.mealIndex,
      units: UNIT_MIN,
      unitGrams: unit.grams,
      unitName: unit.name,
      fixedPortion: newFood.foodGroup === 'beverage',
    });
    optimizePortions(items, targets, config);
  }
};

/**
 * Solve a single day to the given targets. Deterministic restarts: if the
 * hill-climb lands outside tolerance, re-pick foods with the next sub-seed
 * and keep the best attempt.
 */
export const solveDay = (
  day: number,
  targets: MacroTargets,
  candidates: readonly CandidateFood[],
  config: SolverConfig,
): Result<SolvedDay, SolverError> => {
  const template = MEAL_TEMPLATES[config.mealCount];

  const mealByIndex = new Map(template.map((meal, mealIndex) => [mealIndex, meal] as const));

  const attemptSolve = (attempt: number): Result<MutableItem[], SolverError> => {
    const rand = seededRandom(`${config.seed}:day:${day}:attempt:${attempt}`);
    const built = buildItems(targets, candidates, template, rand);
    if (!built.ok) return built;
    optimizePortions(built.value, targets, config);
    const used = new Set(built.value.map((i) => i.food.id));
    expandInfeasibleItems(built.value, targets, config, mealByIndex, candidates, rand, used);
    return built;
  };

  const firstAttempt = attemptSolve(0);
  if (!firstAttempt.ok) return firstAttempt;
  let best = {
    items: firstAttempt.value,
    score: errorScore(currentTotals(firstAttempt.value), targets),
  };

  for (
    let attempt = 1;
    attempt < ATTEMPTS_PER_DAY && !withinTolerance(currentTotals(best.items), targets, config);
    attempt += 1
  ) {
    const retry = attemptSolve(attempt);
    /* v8 ignore next 2 -- NO_CANDIDATES is deterministic per candidate pool:
       if attempt 0 built successfully, every retry builds too. */
    if (!retry.ok) return retry;
    const score = errorScore(currentTotals(retry.value), targets);
    /* v8 ignore next -- seed-dependent whether a later attempt improves the score */
    if (score < best.score) best = { items: retry.value, score };
  }

  const totals = currentTotals(best.items);
  if (!withinTolerance(totals, targets, config)) {
    return err({
      code: 'SOLVER_INFEASIBLE',
      detail: `day ${day}: best of ${ATTEMPTS_PER_DAY} attempts outside tolerance (kcal ${Math.round(totals.kcal)} vs target ${targets.kcal})`,
      bestErrorPct: Math.round((Math.abs(totals.kcal - targets.kcal) / targets.kcal) * 1000) / 10,
    });
  }

  const items = best.items;
  const meals: SolvedMeal[] = template.map((meal, mealIndex) => {
    const mealItems = items.filter((i) => i.mealIndex === mealIndex).map(toSolvedItem);
    return { slot: meal.slot, mealIndex, items: mealItems, totals: sumRounded(mealItems) };
  });

  return ok({ day, meals, totals: sumRounded(meals.flatMap((m) => m.items)) });
};

/**
 * Solve a single meal in isolation against its own share of the plan's
 * targets — the entry point for regenerating one meal without touching any
 * other meal, day, or plan (ADR-0015 D3). Reuses the exact same primitives
 * `solveDay` uses (`buildMealItems`, `optimizePortions`,
 * `expandInfeasibleItems`), scoped to one `MealTemplateEntry` instead of a
 * full day — the meal-composition and portion-realism logic exists once,
 * not twice. `usedElsewhereThatDay` keeps the regenerated meal from
 * duplicating a food already placed in another meal that day.
 */
export const solveMeal = (
  mealIndex: number,
  meal: MealTemplateEntry,
  targets: MacroTargets,
  candidates: readonly CandidateFood[],
  config: SolverConfig,
  usedElsewhereThatDay: ReadonlySet<string> = new Set(),
): Result<SolvedMeal, SolverError> => {
  const mealTargets: MacroTargets = {
    kcal: targets.kcal * meal.share,
    proteinG: targets.proteinG * meal.share,
    fatG: targets.fatG * meal.share,
    carbsG: targets.carbsG * meal.share,
    fiberG: targets.fiberG * meal.share,
  };
  const mealByIndex = new Map([[mealIndex, meal] as const]);

  const attemptSolve = (attempt: number): Result<MutableItem[], SolverError> => {
    const rand = seededRandom(`${config.seed}:meal:${mealIndex}:attempt:${attempt}`);
    const used = new Set(usedElsewhereThatDay);
    const built = buildMealItems(mealIndex, meal, mealTargets, candidates, rand, used);
    if (!built.ok) return built;
    optimizePortions(built.value, mealTargets, config);
    expandInfeasibleItems(built.value, mealTargets, config, mealByIndex, candidates, rand, used);
    return built;
  };

  const firstAttempt = attemptSolve(0);
  if (!firstAttempt.ok) return firstAttempt;
  let best = {
    items: firstAttempt.value,
    score: errorScore(currentTotals(firstAttempt.value), mealTargets),
  };

  for (
    let attempt = 1;
    attempt < ATTEMPTS_PER_DAY && !withinTolerance(currentTotals(best.items), mealTargets, config);
    attempt += 1
  ) {
    const retry = attemptSolve(attempt);
    if (!retry.ok) return retry;
    const score = errorScore(currentTotals(retry.value), mealTargets);
    if (score < best.score) best = { items: retry.value, score };
  }

  const totals = currentTotals(best.items);
  if (!withinTolerance(totals, mealTargets, config)) {
    return err({
      code: 'SOLVER_INFEASIBLE',
      detail: `meal ${mealIndex} (${meal.slot}): best of ${ATTEMPTS_PER_DAY} attempts outside tolerance (kcal ${Math.round(totals.kcal)} vs target ${Math.round(mealTargets.kcal)})`,
      bestErrorPct:
        Math.round((Math.abs(totals.kcal - mealTargets.kcal) / mealTargets.kcal) * 1000) / 10,
    });
  }

  const solvedItems = best.items.map(toSolvedItem);
  return ok({ slot: meal.slot, mealIndex, items: solvedItems, totals: sumRounded(solvedItems) });
};

const sumRounded = (items: readonly SolvedItem[]) => {
  const t = sumMacros(items);
  return {
    kcal: Math.round(t.kcal),
    proteinG: Math.round(t.proteinG),
    fatG: Math.round(t.fatG),
    carbsG: Math.round(t.carbsG),
  };
};

/** Week-level generation mode (ADR-0015 D5). */
export type WeekMode = 'daily_template' | 'rotating_template';

const cloneAsDay = (template: SolvedDay, day: number): SolvedDay => ({
  day,
  meals: template.meals.map((meal) => ({
    ...meal,
    items: meal.items.map((item) => ({ ...item })),
  })),
  totals: { ...template.totals },
});

/** `solveDay` plus the existing deterministic recovery-retry policy, shared by both week modes. */
const solveDayWithRecovery = (
  day: number,
  targets: MacroTargets,
  candidates: readonly CandidateFood[],
  config: SolverConfig,
): Result<SolvedDay, SolverError> => {
  let solved = solveDay(day, targets, candidates, config);
  for (let recovery = 0; !solved.ok && recovery < 8; recovery += 1) {
    if (solved.error.code !== 'SOLVER_INFEASIBLE') return solved;
    solved = solveDay(day, targets, candidates, {
      ...config,
      seed: `${config.seed}:r${recovery}`,
    });
  }
  return solved;
};

/**
 * Solve a weekly plan as a daily template: one day solved, then cloned to days 2–7.
 * Per-day variety is coach-authored via edits, not solver randomness (ADR-0001) —
 * this remains the default; `rotating_template` (below) is opt-in.
 */
const solveDailyTemplateWeek = (
  targets: MacroTargets,
  candidates: readonly CandidateFood[],
  config: SolverConfig,
): Result<SolvedDay[], SolverError> => {
  const solved = solveDayWithRecovery(1, targets, candidates, config);
  if (!solved.ok) return solved;
  const template = solved.value;
  const days: SolvedDay[] = [template];
  for (let day = 2; day <= 7; day += 1) {
    days.push(cloneAsDay(template, day));
  }
  return ok(days);
};

/**
 * Solve `templateCount` distinct days (clamped 1–7) and rotate them across
 * the week (ADR-0015 D5) — real, visible variety while keeping shopping/prep
 * to a bounded number of distinct meal sets, unlike a fully independent
 * 7-day solve. Each template reuses `solveDay` unmodified: its seed already
 * includes the day number, so distinct template days naturally produce
 * distinct (still deterministic, tolerance-respecting) picks — this
 * mechanism already existed and was simply never exercised for days 2–7.
 */
const solveRotatingTemplateWeek = (
  targets: MacroTargets,
  candidates: readonly CandidateFood[],
  config: SolverConfig,
  templateCount: number,
): Result<SolvedDay[], SolverError> => {
  const count = Math.min(7, Math.max(1, Math.round(templateCount)));
  const templates: SolvedDay[] = [];
  for (let t = 1; t <= count; t += 1) {
    const solved = solveDayWithRecovery(t, targets, candidates, config);
    if (!solved.ok) return solved;
    templates.push(solved.value);
  }

  const days: SolvedDay[] = [];
  for (let day = 1; day <= 7; day += 1) {
    const template = templates[(day - 1) % count];
    /* v8 ignore next -- unreachable: count is clamped >=1 and templates has exactly `count` entries */
    if (!template)
      return err({
        code: 'SOLVER_INFEASIBLE',
        detail: 'rotation index out of bounds',
        bestErrorPct: 0,
      });
    days.push(cloneAsDay(template, day));
  }
  return ok(days);
};

/**
 * Solve a weekly plan. `daily_template` (default) preserves the exact
 * existing behavior; `rotating_template` is the ADR-0015 D5 opt-in.
 */
export const solveWeek = (
  targets: MacroTargets,
  candidates: readonly CandidateFood[],
  config: SolverConfig,
  weekMode: WeekMode = 'daily_template',
  templateCount = 3,
): Result<SolvedDay[], SolverError> =>
  weekMode === 'rotating_template'
    ? solveRotatingTemplateWeek(targets, candidates, config, templateCount)
    : solveDailyTemplateWeek(targets, candidates, config);

/**
 * Independent post-generation allergen assertion (the second of two checks;
 * the first is the SQL hard filter BEFORE generation). Never delegated to
 * a model, tested to 100% branch.
 */
export const assertNoRestrictedFoods = (
  items: readonly { foodId: string }[],
  foodsById: ReadonlyMap<string, Pick<CandidateFood, 'allergenTags'>>,
  restrictedAllergenCodes: readonly string[],
): Result<true, { code: 'RESTRICTED_FOOD_PRESENT'; foodId: string; allergen: string }> => {
  const restricted = new Set(restrictedAllergenCodes);
  for (const item of items) {
    const food = foodsById.get(item.foodId);
    if (food === undefined) {
      return err({
        code: 'RESTRICTED_FOOD_PRESENT',
        foodId: item.foodId,
        allergen: 'unknown_food',
      });
    }
    for (const tag of food.allergenTags) {
      if (restricted.has(tag)) {
        return err({ code: 'RESTRICTED_FOOD_PRESENT', foodId: item.foodId, allergen: tag });
      }
    }
  }
  return ok(true);
};
