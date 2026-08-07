import { describe, expect, it } from 'vitest';
import { fallbackNarrative } from '../fallback';
import { runGuardrails } from '../guardrails';
import { narrate } from '../narrate';
import { containsNumericClaim, narrativeOutputSchema } from '../types';
import { GOLDEN_NARRATIVE_FIXTURES } from './fixtures';

describe('narrative offline eval (golden fixtures)', () => {
  for (const [idx, input] of GOLDEN_NARRATIVE_FIXTURES.entries()) {
    const label = `fixture[${idx}] locale=${input.locale} meals=${input.days[0]?.meals.length ?? 0}`;

    it(`${label}: fallback passes schema, numeric, groundedness, shape`, () => {
      const expectedMealCount = input.days[0]?.meals.length;
      const output = fallbackNarrative(input);

      expect(narrativeOutputSchema.safeParse(output).success).toBe(true);
      expect(containsNumericClaim(output)).toBe(false);

      const gated = runGuardrails(input, output, expectedMealCount);
      expect(gated).toEqual({ ok: true, output });
    });
  }
});

/**
 * Live local LLM eval — opt-in only (`AI_EVAL_LIVE=1`).
 * Requires a reachable llama.cpp / OpenAI-compatible endpoint via env.
 */
describe.skipIf(process.env.AI_EVAL_LIVE !== '1')('narrative live eval (AI_EVAL_LIVE=1)', () => {
  for (const [idx, input] of GOLDEN_NARRATIVE_FIXTURES.entries()) {
    it(`fixture[${idx}]: local narrate passes guardrails`, async () => {
      const expectedMealCount = input.days[0]?.meals.length ?? 0;
      const result = await narrate(input, {
        mode: 'local',
        verbosity: input.verbosity,
        ...(process.env.AI_BASE_URL !== undefined ? { baseUrl: process.env.AI_BASE_URL } : {}),
        ...(process.env.AI_MODEL !== undefined ? { model: process.env.AI_MODEL } : {}),
      });

      expect(narrativeOutputSchema.safeParse(result.output).success).toBe(true);
      expect(containsNumericClaim(result.output)).toBe(false);
      const gated = runGuardrails(input, result.output, expectedMealCount);
      expect(gated.ok).toBe(true);
    }, 60_000);
  }
});
