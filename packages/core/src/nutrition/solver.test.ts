import { describe, expect, it } from 'vitest';
import {
  assertNoRestrictedFoods,
  DEFAULT_SOLVER_CONFIG,
  seededRandom,
  solveDay,
  solveWeek,
  type CandidateFood,
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
  ...over,
});

/** Test fixture roughly mirroring the seed set's macro spread. */
const CANDIDATES: CandidateFood[] = [
  food(
    'chicken',
    'protein',
    { kcal: 165, proteinG: 31, fatG: 3.6, carbsG: 0, fiberG: 0 },
    {
      servingUnits: [{ name: 'piece', grams: 120 }],
      rankScore: 2,
    },
  ),
  food(
    'daal',
    'protein',
    { kcal: 116, proteinG: 9, fatG: 0.4, carbsG: 20, fiberG: 8 },
    {
      servingUnits: [{ name: 'cup', grams: 200 }],
    },
  ),
  food('fish', 'protein', { kcal: 96, proteinG: 20, fatG: 1.7, carbsG: 0, fiberG: 0 }),
  food(
    'roti',
    'staple',
    { kcal: 264, proteinG: 9, fatG: 4, carbsG: 51, fiberG: 7 },
    {
      servingUnits: [{ name: 'roti', grams: 40 }],
      allergenTags: ['wheat_gluten'],
    },
  ),
  food(
    'rice',
    'staple',
    { kcal: 130, proteinG: 2.7, fatG: 0.3, carbsG: 28, fiberG: 0.4 },
    {
      servingUnits: [{ name: 'cup', grams: 160 }],
    },
  ),
  food(
    'oats',
    'staple',
    { kcal: 389, proteinG: 16.9, fatG: 6.9, carbsG: 66, fiberG: 10.6 },
    {
      servingUnits: [{ name: 'cup', grams: 80 }],
    },
  ),
  food(
    'sabzi',
    'vegetable',
    { kcal: 90, proteinG: 2, fatG: 4.5, carbsG: 11, fiberG: 2 },
    {
      servingUnits: [{ name: 'serving', grams: 150 }],
    },
  ),
  food('salad', 'vegetable', { kcal: 25, proteinG: 1, fatG: 0.2, carbsG: 5, fiberG: 1.5 }),
  food(
    'banana',
    'fruit',
    { kcal: 89, proteinG: 1.1, fatG: 0.3, carbsG: 23, fiberG: 2.6 },
    {
      servingUnits: [{ name: 'piece', grams: 118 }],
    },
  ),
  food(
    'yogurt',
    'dairy',
    { kcal: 59, proteinG: 10, fatG: 0.4, carbsG: 3.6, fiberG: 0 },
    {
      servingUnits: [{ name: 'cup', grams: 245 }],
    },
  ),
  food(
    'almonds',
    'fat',
    { kcal: 579, proteinG: 21, fatG: 50, carbsG: 22, fiberG: 12.5 },
    {
      servingUnits: [{ name: 'handful', grams: 28 }],
      allergenTags: ['tree_nut'],
    },
  ),
  food(
    'oil',
    'fat',
    { kcal: 884, proteinG: 0, fatG: 100, carbsG: 0, fiberG: 0 },
    {
      servingUnits: [{ name: 'tbsp', grams: 13.5 }],
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
    const result = solveDay(1, TARGETS, CANDIDATES, config());
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

  it('falls back to substitute groups when a pattern group is empty', () => {
    const noFruit = CANDIDATES.filter((f) => f.foodGroup !== 'fruit');
    const result = solveDay(1, TARGETS, noFruit, config({ mealCount: 4 }));
    // snack pattern wants fruit → falls back to vegetable/snack instead.
    expect(result.ok).toBe(true);
  });

  it('reuses foods when the pool is too small for full variety', () => {
    const tiny = [
      CANDIDATES[0],
      CANDIDATES[3],
      CANDIDATES[7],
      CANDIDATES[8],
      CANDIDATES[11],
    ].flatMap((f) => (f ? [f] : []));
    const result = solveDay(1, TARGETS, tiny, config());
    expect(result.ok).toBe(true);
  });

  it('errors NO_CANDIDATES when a group and all fallbacks are missing', () => {
    const onlyProtein = CANDIDATES.filter((f) => f.foodGroup === 'protein');
    const result = solveDay(1, TARGETS, onlyProtein, config({ mealCount: 3 }));
    expect(result).toEqual({ ok: false, error: { code: 'NO_CANDIDATES', group: 'staple' } });
  });

  it('errors SOLVER_INFEASIBLE when portions cannot reach the targets', () => {
    const sparse: CandidateFood[] = [
      food('lettuce', 'protein', { kcal: 15, proteinG: 1.4, fatG: 0.2, carbsG: 2.9, fiberG: 1.3 }),
      food('cucumber', 'staple', { kcal: 16, proteinG: 0.7, fatG: 0.1, carbsG: 3.6, fiberG: 0.5 }),
      food('celery', 'vegetable', { kcal: 14, proteinG: 0.7, fatG: 0.2, carbsG: 3, fiberG: 1.6 }),
      food('radish', 'fruit', { kcal: 16, proteinG: 0.7, fatG: 0.1, carbsG: 3.4, fiberG: 1.6 }),
      food('sprouts', 'fat', { kcal: 23, proteinG: 3, fatG: 0.2, carbsG: 2.1, fiberG: 1.9 }),
    ];
    const result = solveDay(1, TARGETS, sparse, config());
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
        },
      ),
    ];
    const result = solveDay(2, TARGETS, withOddities, config({ seed: 'oddity' }));
    expect(result.ok).toBe(true);
  });
});

describe('solveWeek', () => {
  it('produces 7 in-tolerance days with variety across the week', () => {
    const result = solveWeek(TARGETS, CANDIDATES, config());
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value).toHaveLength(7);
    const signatures = result.value.map((d) =>
      d.meals.flatMap((m) => m.items.map((i) => i.foodId)).join('|'),
    );
    expect(new Set(signatures).size).toBeGreaterThan(1);
  });

  it('propagates day-level errors', () => {
    const onlyProtein = CANDIDATES.filter((f) => f.foodGroup === 'protein');
    const result = solveWeek(TARGETS, onlyProtein, config({ mealCount: 3 }));
    expect(result.ok).toBe(false);
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
