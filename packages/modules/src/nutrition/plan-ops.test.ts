import { describe, expect, it } from 'vitest';
import {
  clonesForApplyDayToWeek,
  gramsMacros,
  normalizePlanTitle,
  type PlanItemRow,
} from './plan-ops';

describe('gramsMacros', () => {
  const per100g = { kcal: 200, proteinG: 20, fatG: 10, carbsG: 5, fiberG: 0 };

  it('scales linearly to portion grams', () => {
    expect(gramsMacros(per100g, 50)).toEqual({
      kcal: 100,
      proteinG: 10,
      fatG: 5,
      carbsG: 2.5,
    });
  });

  it('rounds kcal to int and macros to 1 decimal', () => {
    expect(gramsMacros({ ...per100g, proteinG: 33.33 }, 30).proteinG).toBe(10);
  });
});

describe('normalizePlanTitle', () => {
  it('returns null for blank input', () => {
    expect(normalizePlanTitle('')).toBeNull();
    expect(normalizePlanTitle('   ')).toBeNull();
  });

  it('trims and caps length', () => {
    expect(normalizePlanTitle('  Fat loss  ')).toBe('Fat loss');
    expect(normalizePlanTitle('x'.repeat(100))?.length).toBe(50);
  });
});

describe('clonesForApplyDayToWeek', () => {
  const item = (day: number, foodId: string): PlanItemRow => ({
    id: `id-${foodId}`,
    planId: 'plan-1',
    day,
    mealIndex: 0,
    mealSlot: 'breakfast',
    mealName: 'Breakfast',
    foodId,
    portionGrams: 100,
    macros: { kcal: 100, proteinG: 10, fatG: 5, carbsG: 5 },
    macrosSource: 'food_db',
    prepNotes: null,
    position: 0,
  });

  it('clones source day onto the other six days only', () => {
    const source = [item(1, 'food-a'), item(1, 'food-b')];
    const clones = clonesForApplyDayToWeek('plan-1', 1, source);
    expect(clones).toHaveLength(12);
    expect(clones.every((c) => c.day !== 1)).toBe(true);
    expect(new Set(clones.map((c) => c.day))).toEqual(new Set([2, 3, 4, 5, 6, 7]));
    expect(clones.filter((c) => c.day === 2).map((c) => c.foodId)).toEqual(['food-a', 'food-b']);
  });

  it('returns empty when source has no items', () => {
    expect(clonesForApplyDayToWeek('plan-1', 3, [])).toEqual([]);
  });
});
