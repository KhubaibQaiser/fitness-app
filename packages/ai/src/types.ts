import { z } from 'zod';

export type AiMode = 'local' | 'fallback' | 'hosted';

export type AiConfig = {
  readonly mode: AiMode;
  readonly baseUrl?: string;
  readonly model?: string;
  readonly apiKey?: string;
  readonly verbosity: 'terse' | 'standard';
  /** Override default prompt version (canary). */
  readonly promptVersion?: string;
  /** Optional LoRA / adapter id served by llama.cpp. */
  readonly adapterVersion?: string;
  /** Tenant prompt/cuisine pack id (see prompts/packs.ts). */
  readonly promptPackId?: string;
};

/** De-identified Layer-3 input — food names and grams only, never PII. */
export type NarrativeInput = {
  readonly locale: string;
  readonly cuisineContext: string;
  readonly verbosity: 'terse' | 'standard';
  readonly days: readonly {
    readonly day: number;
    readonly meals: readonly {
      readonly slot: 'breakfast' | 'lunch' | 'dinner' | 'snack';
      readonly items: readonly { readonly foodName: string; readonly grams: number }[];
    }[];
  }[];
};

/**
 * Strict output schema: NO numeric fields exist, so the model is structurally
 * incapable of emitting a macro number. Post-parse content lint enforces it
 * again inside strings.
 */
export const narrativeOutputSchema = z
  .object({
    days: z.array(
      z
        .object({
          meals: z.array(
            z
              .object({
                name: z.string().max(60),
                prepNotes: z.string().max(280),
              })
              .strict(),
          ),
        })
        .strict(),
    ),
  })
  .strict();

export type NarrativeOutput = z.infer<typeof narrativeOutputSchema>;

/** Rejects macro-number claims sneaking into narrative strings. */
export const NUMERIC_CLAIM_PATTERN =
  /\d+(\.\d+)?\s?(kcal|cal\b|calories|g\s+(of\s+)?(protein|carb|fat)|grams?\s+(of\s+)?(protein|carb|fat))/i;

export const containsNumericClaim = (output: NarrativeOutput): boolean =>
  output.days.some((day) =>
    day.meals.some(
      (meal) => NUMERIC_CLAIM_PATTERN.test(meal.name) || NUMERIC_CLAIM_PATTERN.test(meal.prepNotes),
    ),
  );
