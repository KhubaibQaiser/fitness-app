import { describe, expect, it } from 'vitest';
import {
  assertNoRestrictedFoods,
  DEFAULT_SOLVER_CONFIG,
  seededRandom,
  solveDay,
  solveWeek,
  type CandidateFood,
  type MealSlot,
  type SolverConfig,
} from './solver';
import { type MacroTargets } from './types';

const food = (
  id: string,
  foodGroup: CandidateFood['foodGroup'],
  per100g: CandidateFood['per100g'],
  over: Partial<CandidateFood> = {},
): CandidateFood => ({
  id,
  name: id,
  foodGroup,
  per100g,
  allergenTags: [],
  servingUnits: [{ name: 'serving', grams: 100 }],
  allowedSlots: ['breakfast', 'lunch', 'dinner', 'snack'],
  ...over,
});

const slots = (...s: MealSlot[]): readonly MealSlot[] => s;

/** Test fixture covering breakfast / lunch / dinner / snack pools. */
const CANDIDATES: CandidateFood[] = [
  food(
    'chicken',
    'protein',
    { kcal: 165, proteinG: 31, fatG: 3.6, carbsG: 0, fiberG: 0 },
    {
      servingUnits: [{ name: 'piece', grams: 120 }],
      rankScore: 2,
      allowedSlots: slots('lunch', 'dinner'),
    },
  ),
  food(
    'daal',
    'protein',
    { kcal: 116, proteinG: 9, fatG: 0.4, carbsG: 20, fiberG: 8 },
    {
      servingUnits: [{ name: 'cup', grams: 200 }],
      allowedSlots: slots('lunch', 'dinner'),
    },
  ),
  food(
    'fish',
    'protein',
    { kcal: 96, proteinG: 20, fatG: 1.7, carbsG: 0, fiberG: 0 },
    {
      allowedSlots: slots('lunch', 'dinner'),
    },
  ),
  food(
    'egg',
    'protein',
    { kcal: 155, proteinG: 13, fatG: 11, carbsG: 1.1, fiberG: 0 },
    {
      servingUnits: [{ name: 'piece', grams: 50 }],
      allowedSlots: slots('breakfast'),
      name: 'Egg (whole, boiled)',
    },
  ),
  food(
    'roti',
    'staple',
    { kcal: 264, proteinG: 9, fatG: 4, carbsG: 51, fiberG: 7 },
    {
      servingUnits: [{ name: 'roti', grams: 40 }],
      allergenTags: ['wheat_gluten'],
      allowedSlots: slots('lunch'),
    },
  ),
  food(
    'rice',
    'staple',
    { kcal: 130, proteinG: 2.7, fatG: 0.3, carbsG: 28, fiberG: 0.4 },
    {
      servingUnits: [{ name: 'cup', grams: 160 }],
      allowedSlots: slots('lunch'),
    },
  ),
  food(
    'oats',
    'staple',
    { kcal: 389, proteinG: 16.9, fatG: 6.9, carbsG: 66, fiberG: 10.6 },
    {
      servingUnits: [{ name: 'cup', grams: 80 }],
      allowedSlots: slots('breakfast'),
      name: 'Oats (dry)',
    },
  ),
  food(
    'bran',
    'staple',
    { kcal: 247, proteinG: 13, fatG: 3.5, carbsG: 41, fiberG: 7 },
    {
      servingUnits: [{ name: 'slice', grams: 35 }],
      allowedSlots: slots('breakfast'),
    },
  ),
  food(
    'sabzi',
    'vegetable',
    { kcal: 90, proteinG: 2, fatG: 4.5, carbsG: 11, fiberG: 2 },
    {
      servingUnits: [{ name: 'serving', grams: 150 }],
      allowedSlots: slots('lunch', 'dinner'),
    },
  ),
  food(
    'salad',
    'vegetable',
    { kcal: 25, proteinG: 1, fatG: 0.2, carbsG: 5, fiberG: 1.5 },
    {
      allowedSlots: slots('lunch', 'dinner'),
    },
  ),
  food(
    'banana',
    'fruit',
    { kcal: 89, proteinG: 1.1, fatG: 0.3, carbsG: 23, fiberG: 2.6 },
    {
      servingUnits: [{ name: 'piece', grams: 118 }],
      allowedSlots: slots('snack'),
    },
  ),
  food(
    'yogurt',
    'dairy',
    { kcal: 59, proteinG: 10, fatG: 0.4, carbsG: 3.6, fiberG: 0 },
    {
      servingUnits: [{ name: 'cup', grams: 245 }],
      allowedSlots: slots('breakfast'),
      name: 'Greek yogurt (plain)',
    },
  ),
  food(
    'almonds',
    'fat',
    { kcal: 579, proteinG: 21, fatG: 50, carbsG: 22, fiberG: 12.5 },
    {
      servingUnits: [{ name: 'handful', grams: 28 }],
      allergenTags: ['tree_nut'],
      allowedSlots: slots('lunch', 'snack'),
    },
  ),
  food(
    'oil',
    'fat',
    { kcal: 884, proteinG: 0, fatG: 100, carbsG: 0, fiberG: 0 },
    {
      servingUnits: [{ name: 'tbsp', grams: 13.5 }],
      allowedSlots: slots('lunch', 'snack'),
      name: 'Olive oil',
      rankScore: 3,
    },
  ),
  food(
    'ghee',
    'fat',
    { kcal: 900, proteinG: 0, fatG: 100, carbsG: 0, fiberG: 0 },
    {
      servingUnits: [{ name: 'tsp', grams: 4.2 }],
      allowedSlots: slots('lunch'),
      name: 'Desi ghee',
    },
  ),
  food(
    'coffee',
    'beverage',
    { kcal: 2, proteinG: 0.1, fatG: 0, carbsG: 0, fiberG: 0 },
    {
      servingUnits: [{ name: 'cup', grams: 240 }],
      allowedSlots: slots('breakfast'),
      name: 'Black coffee',
    },
  ),
  food(
    'tea',
    'beverage',
    { kcal: 1, proteinG: 0, fatG: 0, carbsG: 0, fiberG: 0 },
    {
      servingUnits: [{ name: 'cup', grams: 240 }],
      allowedSlots: slots('breakfast'),
      name: 'Green tea',
    },
  ),
  food(
    'dates',
    'snack',
    { kcal: 277, proteinG: 1.8, fatG: 0.2, carbsG: 75, fiberG: 6.7 },
    {
      servingUnits: [{ name: 'piece', grams: 7.1 }],
      allowedSlots: slots('snack'),
    },
  ),
];

const TARGETS: MacroTargets = { kcal: 2200, proteinG: 176, fatG: 72, carbsG: 212, fiberG: 31 };

const config = (over: Partial<SolverConfig> = {}): SolverConfig => ({
  ...DEFAULT_SOLVER_CONFIG,
  seed: 'test-seed',
  ...over,
});

describe('seededRandom', () => {
  it('is deterministic per seed and varies across seeds', () => {
    const a1 = seededRandom('alpha');
    const a2 = seededRandom('alpha');
    const b = seededRandom('bravo');
    const seqA1 = [a1(), a1(), a1()];
    const seqA2 = [a2(), a2(), a2()];
    const seqB = [b(), b(), b()];
    expect(seqA1).toEqual(seqA2);
    expect(seqA1).not.toEqual(seqB);
    for (const v of seqA1) {
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });
});

describe('solveDay', () => {
  it('solves within plan tolerances (±5% kcal, ±10% per macro)', () => {
    const result = solveDay(1, TARGETS, CANDIDATES, config({ mealCount: 4 }));
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const { totals, meals } = result.value;
    expect(Math.abs(totals.kcal - TARGETS.kcal) / TARGETS.kcal).toBeLessThanOrEqual(0.05);
    expect(Math.abs(totals.proteinG - TARGETS.proteinG) / TARGETS.proteinG).toBeLessThanOrEqual(
      0.1,
    );
    expect(Math.abs(totals.fatG - TARGETS.fatG) / TARGETS.fatG).toBeLessThanOrEqual(0.1);
    expect(Math.abs(totals.carbsG - TARGETS.carbsG) / TARGETS.carbsG).toBeLessThanOrEqual(0.1);
    expect(meals).toHaveLength(4);
    for (const meal of meals) {
      expect(meal.items.length).toBeGreaterThan(0);
      for (const item of meal.items) {
        expect(item.portionGrams).toBeGreaterThan(0);
        expect(item.portionLabel).toMatch(/\d/);
      }
    }
  });

  it('is deterministic for the same seed and differs across seeds', () => {
    const a = solveDay(1, TARGETS, CANDIDATES, config());
    const b = solveDay(1, TARGETS, CANDIDATES, config());
    const c = solveDay(1, TARGETS, CANDIDATES, config({ seed: 'another-seed' }));
    expect(a).toEqual(b);
    expect(JSON.stringify(c)).not.toEqual(JSON.stringify(a));
  });

  it('supports 3-meal and 5-meal structures', () => {
    for (const mealCount of [3, 5] as const) {
      const result = solveDay(1, TARGETS, CANDIDATES, config({ mealCount }));
      expect(result.ok).toBe(true);
      if (result.ok) expect(result.value.meals).toHaveLength(mealCount);
    }
  });

  it('never puts lunch/dinner proteins on breakfast', () => {
    for (let day = 1; day <= 7; day += 1) {
      const result = solveDay(day, TARGETS, CANDIDATES, config({ mealCount: 3, seed: `b-${day}` }));
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      const breakfast = result.value.meals.find((m) => m.slot === 'breakfast');
      expect(breakfast).toBeDefined();
      for (const item of breakfast?.items ?? []) {
        expect(['chicken', 'daal', 'fish']).not.toContain(item.foodId);
      }
    }
  });

  it('keeps dinner to protein and vegetable groups only', () => {
    const result = solveDay(1, TARGETS, CANDIDATES, config({ mealCount: 3 }));
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const dinner = result.value.meals.find((m) => m.slot === 'dinner');
    expect(dinner).toBeDefined();
    const byId = new Map(CANDIDATES.map((c) => [c.id, c]));
    for (const item of dinner?.items ?? []) {
      const group = byId.get(item.foodId)?.foodGroup;
      expect(['protein', 'vegetable', 'dairy']).toContain(group);
      expect(['staple', 'fat', 'beverage']).not.toContain(group);
    }
  });

  it('can include fat on lunch', () => {
    let sawFat = false;
    for (let day = 1; day <= 14; day += 1) {
      const result = solveDay(
        day,
        TARGETS,
        CANDIDATES,
        config({ mealCount: 3, seed: `fat-${day}` }),
      );
      if (!result.ok) continue;
      const lunch = result.value.meals.find((m) => m.slot === 'lunch');
      const byId = new Map(CANDIDATES.map((c) => [c.id, c]));
      if (lunch?.items.some((i) => byId.get(i.foodId)?.foodGroup === 'fat')) {
        sawFat = true;
        break;
      }
    }
    expect(sawFat).toBe(true);
  });

  it('falls back to substitute groups when a pattern group is empty', () => {
    const noFruit = CANDIDATES.filter((f) => f.foodGroup !== 'fruit');
    const result = solveDay(1, TARGETS, noFruit, config({ mealCount: 4 }));
    expect(result.ok).toBe(true);
  });

  it('reuses foods when the pool is too small for full variety', () => {
    const tiny = [
      CANDIDATES.find((c) => c.id === 'egg'),
      CANDIDATES.find((c) => c.id === 'oats'),
      CANDIDATES.find((c) => c.id === 'coffee'),
      CANDIDATES.find((c) => c.id === 'chicken'),
      CANDIDATES.find((c) => c.id === 'roti'),
      CANDIDATES.find((c) => c.id === 'salad'),
      CANDIDATES.find((c) => c.id === 'oil'),
    ].flatMap((f) => (f ? [f] : []));
    const result = solveDay(1, TARGETS, tiny, config({ mealCount: 3 }));
    expect(result.ok).toBe(true);
  });

  it('errors NO_CANDIDATES when a group and all fallbacks are missing', () => {
    const onlyProtein = CANDIDATES.filter((f) => f.foodGroup === 'protein');
    const result = solveDay(1, TARGETS, onlyProtein, config({ mealCount: 3 }));
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('NO_CANDIDATES');
  });

  it('errors SOLVER_INFEASIBLE when portions cannot reach the targets', () => {
    const sparse: CandidateFood[] = [
      food(
        'lettuce',
        'protein',
        { kcal: 15, proteinG: 1.4, fatG: 0.2, carbsG: 2.9, fiberG: 1.3 },
        {
          allowedSlots: slots('breakfast', 'lunch', 'dinner'),
        },
      ),
      food(
        'cucumber',
        'staple',
        { kcal: 16, proteinG: 0.7, fatG: 0.1, carbsG: 3.6, fiberG: 0.5 },
        {
          allowedSlots: slots('breakfast', 'lunch'),
        },
      ),
      food(
        'celery',
        'vegetable',
        { kcal: 14, proteinG: 0.7, fatG: 0.2, carbsG: 3, fiberG: 1.6 },
        {
          allowedSlots: slots('lunch', 'dinner'),
        },
      ),
      food(
        'radish',
        'fruit',
        { kcal: 16, proteinG: 0.7, fatG: 0.1, carbsG: 3.4, fiberG: 1.6 },
        {
          allowedSlots: slots('snack'),
        },
      ),
      food(
        'sprouts',
        'fat',
        { kcal: 23, proteinG: 3, fatG: 0.2, carbsG: 2.1, fiberG: 1.9 },
        {
          allowedSlots: slots('lunch', 'snack'),
        },
      ),
      food(
        'water',
        'beverage',
        { kcal: 0, proteinG: 0, fatG: 0, carbsG: 0, fiberG: 0 },
        {
          allowedSlots: slots('breakfast'),
        },
      ),
    ];
    const result = solveDay(1, TARGETS, sparse, config({ mealCount: 4 }));
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe('SOLVER_INFEASIBLE');
      if (result.error.code === 'SOLVER_INFEASIBLE') {
        expect(result.error.bestErrorPct).toBeGreaterThan(0);
      }
    }
  });

  it('handles foods without serving units and zero-kcal foods', () => {
    const withOddities: CandidateFood[] = [
      ...CANDIDATES,
      food(
        'water-veg',
        'vegetable',
        { kcal: 0, proteinG: 0, fatG: 0, carbsG: 0, fiberG: 0 },
        {
          servingUnits: [],
          allowedSlots: slots('lunch', 'dinner'),
        },
      ),
    ];
    const result = solveDay(2, TARGETS, withOddities, config({ seed: 'oddity', mealCount: 3 }));
    expect(result.ok).toBe(true);
  });
});

describe('solveWeek', () => {
  it('produces 7 in-tolerance days with variety across the week', () => {
    const result = solveWeek(TARGETS, CANDIDATES, config({ mealCount: 3 }));
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value).toHaveLength(7);
    const signatures = result.value.map((d) =>
      d.meals.flatMap((m) => m.items.map((i) => i.foodId)).join('|'),
    );
    expect(new Set(signatures).size).toBeGreaterThan(1);
  });

  it('propagates NO_CANDIDATES without recovery retries', () => {
    const onlyProtein = CANDIDATES.filter((f) => f.foodGroup === 'protein');
    const result = solveWeek(TARGETS, onlyProtein, config({ mealCount: 3 }));
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('NO_CANDIDATES');
  });

  it('exhausts recovery and returns SOLVER_INFEASIBLE for an impossible pool', () => {
    // Same low-calorie pool as the solveDay infeasible case — enough groups to
    // construct meals, but portions can never hit TARGETS even after recovery.
    const sparse: CandidateFood[] = [
      food(
        'lettuce',
        'protein',
        { kcal: 15, proteinG: 1.4, fatG: 0.2, carbsG: 2.9, fiberG: 1.3 },
        { allowedSlots: slots('breakfast', 'lunch', 'dinner') },
      ),
      food(
        'cucumber',
        'staple',
        { kcal: 16, proteinG: 0.7, fatG: 0.1, carbsG: 3.6, fiberG: 0.5 },
        { allowedSlots: slots('breakfast', 'lunch') },
      ),
      food(
        'celery',
        'vegetable',
        { kcal: 14, proteinG: 0.7, fatG: 0.2, carbsG: 3, fiberG: 1.6 },
        { allowedSlots: slots('lunch', 'dinner') },
      ),
      food(
        'radish',
        'fruit',
        { kcal: 16, proteinG: 0.7, fatG: 0.1, carbsG: 3.4, fiberG: 1.6 },
        { allowedSlots: slots('snack') },
      ),
      food(
        'sprouts',
        'fat',
        { kcal: 23, proteinG: 3, fatG: 0.2, carbsG: 2.1, fiberG: 1.9 },
        { allowedSlots: slots('lunch', 'snack') },
      ),
      food(
        'water',
        'beverage',
        { kcal: 0, proteinG: 0, fatG: 0, carbsG: 0, fiberG: 0 },
        { allowedSlots: slots('breakfast') },
      ),
    ];
    const result = solveWeek(TARGETS, sparse, config({ mealCount: 4, seed: 'impossible-week' }));
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('SOLVER_INFEASIBLE');
  });
});

describe('assertNoRestrictedFoods (independent second allergen check)', () => {
  const foodsById = new Map(CANDIDATES.map((f) => [f.id, { allergenTags: f.allergenTags }]));

  it('passes a clean plan', () => {
    const result = assertNoRestrictedFoods([{ foodId: 'chicken' }, { foodId: 'rice' }], foodsById, [
      'peanut',
    ]);
    expect(result).toEqual({ ok: true, value: true });
  });

  it('rejects any item carrying a restricted allergen tag', () => {
    const result = assertNoRestrictedFoods(
      [{ foodId: 'chicken' }, { foodId: 'almonds' }],
      foodsById,
      ['tree_nut'],
    );
    expect(result).toEqual({
      ok: false,
      error: { code: 'RESTRICTED_FOOD_PRESENT', foodId: 'almonds', allergen: 'tree_nut' },
    });
  });

  it('rejects unknown foods outright (fail closed)', () => {
    const result = assertNoRestrictedFoods([{ foodId: 'mystery' }], foodsById, []);
    expect(result.ok).toBe(false);
  });
});
