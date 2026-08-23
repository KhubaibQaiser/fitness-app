import { describe, expect, it } from 'vitest';
import type { PlanItem } from '@gymos/contracts';
import { mealKcal } from './plan-totals';

const item = (mealIndex: number, kcal: number): PlanItem => ({
  id: `i-${mealIndex}-${kcal}`,
  day: 1,
  mealIndex,
  mealSlot: 'breakfast',
  mealName: 'Breakfast',
  foodId: 'food-1',
  foodName: 'Egg',
  portionGrams: 100,
  macros: { kcal, proteinG: 0, fatG: 0, carbsG: 0 },
  macrosSource: 'food_db',
  prepNotes: null,
  position: 0,
});

describe('D4 smoke test — mealKcal', () => {
  it('sums only the items belonging to the given meal, ignoring other meals', () => {
    const items = [item(0, 200), item(0, 150), item(1, 500)];
    expect(mealKcal(items, 0)).toBe(350); // breakfast: 200 + 150, not influenced by lunch's 500
    expect(mealKcal(items, 1)).toBe(500);
  });

  it('returns 0 for a meal with no items rather than throwing', () => {
    expect(mealKcal([], 0)).toBe(0);
  });
});
