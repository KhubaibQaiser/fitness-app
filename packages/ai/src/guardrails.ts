import {
  containsNumericClaim,
  narrativeOutputSchema,
  type NarrativeInput,
  type NarrativeOutput,
} from './types';

export type GuardrailReason = 'schema' | 'numeric_claim' | 'ungrounded' | 'shape_mismatch';

export type GuardrailResult =
  | { readonly ok: true; readonly output: NarrativeOutput }
  | { readonly ok: false; readonly reason: GuardrailReason };

/** Common catalog foods — narrative may not invent these if absent from the meal. */
const TRACKED_FOODS = [
  'chicken',
  'beef',
  'mutton',
  'lamb',
  'pork',
  'fish',
  'salmon',
  'tuna',
  'shrimp',
  'prawn',
  'egg',
  'tofu',
  'paneer',
  'dal',
  'lentil',
  'chickpea',
  'rice',
  'roti',
  'bread',
  'pasta',
  'noodle',
  'potato',
  'banana',
  'apple',
  'yogurt',
  'yoghurt',
  'cheese',
  'milk',
  'oats',
  'granola',
] as const;

const mealTextBlob = (meal: NarrativeInput['days'][number]['meals'][number]): string =>
  meal.items.map((i) => i.foodName.toLowerCase()).join(' ');

/**
 * Groundedness: do not mention tracked foods that are not present in that meal's items.
 * Prep verbs and Stevia/olive oil are allowed via the system prompt.
 */
export const isGrounded = (input: NarrativeInput, output: NarrativeOutput): boolean => {
  for (let d = 0; d < output.days.length; d += 1) {
    const inDay = input.days[d];
    const outDay = output.days[d];
    if (!inDay || !outDay) continue;
    for (let m = 0; m < outDay.meals.length; m += 1) {
      const inMeal = inDay.meals[m];
      const outMeal = outDay.meals[m];
      if (!inMeal || !outMeal) continue;
      const present = mealTextBlob(inMeal);
      const narrative = `${outMeal.name} ${outMeal.prepNotes}`.toLowerCase();
      for (const food of TRACKED_FOODS) {
        if (narrative.includes(food) && !present.includes(food)) return false;
      }
    }
  }
  return true;
};

export const matchesExpectedShape = (
  input: NarrativeInput,
  output: NarrativeOutput,
  expectedMealCount?: number,
): boolean => {
  if (output.days.length !== input.days.length) return false;
  for (let i = 0; i < input.days.length; i += 1) {
    const expected = expectedMealCount ?? input.days[i]?.meals.length ?? 0;
    if ((output.days[i]?.meals.length ?? -1) !== expected) return false;
  }
  return true;
};

/** Fail-closed validation before accepting model output. */
export const runGuardrails = (
  input: NarrativeInput,
  raw: unknown,
  expectedMealCount?: number,
): GuardrailResult => {
  const parsed = narrativeOutputSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, reason: 'schema' };
  if (containsNumericClaim(parsed.data)) return { ok: false, reason: 'numeric_claim' };
  if (!matchesExpectedShape(input, parsed.data, expectedMealCount)) {
    return { ok: false, reason: 'shape_mismatch' };
  }
  if (!isGrounded(input, parsed.data)) return { ok: false, reason: 'ungrounded' };
  return { ok: true, output: parsed.data };
};
