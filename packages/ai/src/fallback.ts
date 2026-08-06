import { type NarrativeInput, type NarrativeOutput } from './types';

const SLOT_LABEL: Record<'breakfast' | 'lunch' | 'dinner' | 'snack', string> = {
  breakfast: 'Breakfast',
  lunch: 'Lunch',
  dinner: 'Dinner',
  snack: 'Snack',
};

const titleCase = (name: string): string =>
  name.replace(/\s*\(.*\)$/, '').replace(/^\w/, (c) => c.toUpperCase());

/**
 * Deterministic template naming — the $0 mode and the runtime safety net.
 * Generation never fails because of the LLM: this always succeeds.
 */
export const fallbackNarrative = (input: NarrativeInput): NarrativeOutput => ({
  days: input.days.map((day) => ({
    meals: day.meals.map((meal) => {
      const names = meal.items.map((i) => titleCase(i.foodName));
      const head = names.slice(0, 2).join(', ');
      const tail = names.length > 2 ? ` & ${names[names.length - 1] ?? ''}` : '';
      return {
        name: `${head}${tail} — ${SLOT_LABEL[meal.slot]}`.slice(0, 60),
        prepNotes:
          input.verbosity === 'terse'
            ? ''
            : `Portion as listed. Prepare ${names[0] ?? 'the main item'} fresh where possible.`,
      };
    }),
  })),
});
