import { type NarrativeInput, type NarrativeOutput } from './types';

const SLOT_LABEL_EN: Record<'breakfast' | 'lunch' | 'dinner' | 'snack', string> = {
  breakfast: 'Breakfast',
  lunch: 'Lunch',
  dinner: 'Dinner',
  snack: 'Snack',
};

const SLOT_LABEL_UR: Record<'breakfast' | 'lunch' | 'dinner' | 'snack', string> = {
  breakfast: 'Nashta',
  lunch: 'Dopahar',
  dinner: 'Raat ka khana',
  snack: 'Snack',
};

const titleCase = (name: string): string =>
  name.replace(/\s*\(.*\)$/, '').replace(/^\w/, (c) => c.toUpperCase());

const isUr = (locale: string): boolean => locale.toLowerCase().startsWith('ur');

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
      const main = names[0] ?? 'the main item';
      const slotLabel = (isUr(input.locale) ? SLOT_LABEL_UR : SLOT_LABEL_EN)[meal.slot];
      const prepNotes =
        input.verbosity === 'terse'
          ? ''
          : isUr(input.locale)
            ? `Listed portion use karein. ${main} ko fresh tayyar karein jahan mumkin ho.`
            : `Portion as listed. Prepare ${main} fresh where possible.`;
      return {
        name: `${head}${tail} — ${slotLabel}`.slice(0, 60),
        prepNotes,
      };
    }),
  })),
});
