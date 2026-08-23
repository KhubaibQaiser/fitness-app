import type { PlanItem } from '@gymos/contracts';

/**
 * Sum of one meal's own items — the per-meal calorie split shown next to
 * each section header in `plan-editor.tsx` (ADR-0015 D4). Pure logic, kept
 * out of the `.tsx` file (which pulls in React Native/Tamagui) so it can be
 * unit-tested without a component-rendering setup.
 */
export const mealKcal = (items: readonly PlanItem[], mealIndex: number): number =>
  items.filter((i) => i.mealIndex === mealIndex).reduce((sum, i) => sum + i.macros.kcal, 0);
