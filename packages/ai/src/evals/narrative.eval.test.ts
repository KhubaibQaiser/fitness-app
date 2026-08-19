import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { fallbackNarrative } from '../fallback';
import { runGuardrails } from '../guardrails';
import { narrate } from '../narrate';
import {
  containsNumericClaim,
  narrativeOutputSchema,
  type NarrativeInput,
  type NarrativeOutput,
} from '../types';
import { GOLDEN_NARRATIVE_FIXTURES } from './fixtures';

const baseline = JSON.parse(
  readFileSync(path.join(path.dirname(fileURLToPath(import.meta.url)), 'baseline.json'), 'utf8'),
) as { minGuardrailPassRate: number; fixtureCount: number };

describe('narrative offline eval (golden fixtures)', () => {
  it('matches the committed fixture count baseline', () => {
    expect(GOLDEN_NARRATIVE_FIXTURES.length).toBe(baseline.fixtureCount);
  });

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

describe('narrative offline eval (fail-closed red team)', () => {
  const input: NarrativeInput = GOLDEN_NARRATIVE_FIXTURES[0] ?? {
    locale: 'en',
    cuisineContext: 'pakistani',
    verbosity: 'standard',
    days: [],
  };

  it('rejects a numeric macro claim', () => {
    const raw: NarrativeOutput = {
      days: [
        {
          meals: [
            { name: 'Chicken 400 kcal', prepNotes: '20g of protein' },
            { name: 'Rice', prepNotes: '' },
            { name: 'Dal', prepNotes: '' },
          ],
        },
      ],
    };
    expect(runGuardrails(input, raw)).toEqual({ ok: false, reason: 'numeric_claim' });
  });

  it('rejects an ungrounded tracked food', () => {
    const raw: NarrativeOutput = {
      days: [
        {
          meals: [
            { name: 'Salmon and egg roti', prepNotes: '' },
            { name: 'Chicken rice', prepNotes: '' },
            { name: 'Dal roti yogurt', prepNotes: '' },
          ],
        },
      ],
    };
    const gated = runGuardrails(input, raw);
    expect(gated).toEqual({ ok: false, reason: 'ungrounded' });
  });

  it('rejects a shape mismatch (wrong meal count)', () => {
    const raw: NarrativeOutput = {
      days: [{ meals: [{ name: 'Egg roti', prepNotes: '' }] }],
    };
    const gated = runGuardrails(input, raw, input.days[0]?.meals.length);
    expect(gated).toEqual({ ok: false, reason: 'shape_mismatch' });
  });

  it('rejects invalid schema', () => {
    const gated = runGuardrails(input, { nope: true });
    expect(gated).toEqual({ ok: false, reason: 'schema' });
  });
});

/**
 * Live local LLM eval — opt-in only (`AI_EVAL_LIVE=1`).
 * Requires a reachable llama.cpp / OpenAI-compatible endpoint via env.
 */
describe.skipIf(process.env.AI_EVAL_LIVE !== '1')('narrative live eval (AI_EVAL_LIVE=1)', () => {
  it('pass rate meets baseline.minGuardrailPassRate', async () => {
    let passed = 0;
    for (const input of GOLDEN_NARRATIVE_FIXTURES) {
      const expectedMealCount = input.days[0]?.meals.length ?? 0;
      const result = await narrate(input, {
        mode: 'local',
        verbosity: input.verbosity,
        ...(process.env.AI_BASE_URL !== undefined ? { baseUrl: process.env.AI_BASE_URL } : {}),
        ...(process.env.AI_MODEL !== undefined ? { model: process.env.AI_MODEL } : {}),
      });
      const schemaOk = narrativeOutputSchema.safeParse(result.output).success;
      const gated = runGuardrails(input, result.output, expectedMealCount);
      if (schemaOk && !containsNumericClaim(result.output) && gated.ok) passed += 1;
    }
    const rate = passed / GOLDEN_NARRATIVE_FIXTURES.length;
    expect(rate).toBeGreaterThanOrEqual(baseline.minGuardrailPassRate);
  }, 180_000);
});
