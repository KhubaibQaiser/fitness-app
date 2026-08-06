import { describe, expect, it } from 'vitest';
import { assertDeidentified } from './deidentify';
import { fallbackNarrative } from './fallback';
import { narrate } from './narrate';
import { containsNumericClaim, type NarrativeInput } from './types';

const input: NarrativeInput = {
  locale: 'en',
  cuisineContext: 'pakistani',
  verbosity: 'standard',
  days: [
    {
      day: 1,
      meals: [
        {
          slot: 'lunch',
          items: [
            { foodName: 'Chicken breast (skinless, cooked)', grams: 180 },
            { foodName: 'Roti (whole wheat)', grams: 80 },
            { foodName: 'Kachumber salad', grams: 120 },
          ],
        },
        { slot: 'snack', items: [{ foodName: 'Banana', grams: 118 }] },
      ],
    },
  ],
};

describe('fallbackNarrative', () => {
  it('names meals from their items deterministically', () => {
    const out = fallbackNarrative(input);
    expect(out.days[0]?.meals[0]?.name).toBe('Chicken breast, Roti & Kachumber salad — Lunch');
    expect(out.days[0]?.meals[1]?.name).toBe('Banana — Snack');
    expect(fallbackNarrative(input)).toEqual(out);
  });

  it('emits empty prep notes in terse mode', () => {
    const out = fallbackNarrative({ ...input, verbosity: 'terse' });
    expect(out.days[0]?.meals[0]?.prepNotes).toBe('');
  });

  it('never contains numeric macro claims', () => {
    expect(containsNumericClaim(fallbackNarrative(input))).toBe(false);
  });
});

describe('assertDeidentified', () => {
  it('passes clean payloads', () => {
    expect(assertDeidentified(input)).toBeNull();
  });

  it('catches emails, phones and uuids', () => {
    expect(assertDeidentified({ a: 'coach@pilot.local' })).toEqual({ kind: 'email' });
    expect(assertDeidentified({ a: '+92 300 1234567' })).toEqual({ kind: 'phone' });
    expect(assertDeidentified({ a: '0198e2f4-1111-7abc-9def-0123456789ab' })).toEqual({
      kind: 'uuid',
    });
  });
});

describe('narrate', () => {
  it('uses templates in fallback mode with zero external calls', async () => {
    const result = await narrate(input, { mode: 'fallback', verbosity: 'standard' });
    expect(result.modelId).toBe('fallback-templates');
    expect(result.fellBack).toBe(false);
    expect(result.output.days[0]?.meals).toHaveLength(2);
  });

  it('falls back gracefully when local mode is unreachable', async () => {
    const result = await narrate(input, {
      mode: 'local',
      baseUrl: 'http://127.0.0.1:1',
      model: 'qwen3-4b-instruct',
      verbosity: 'standard',
    });
    expect(result.modelId).toBe('fallback-templates');
    expect(result.fellBack).toBe(true);
  });

  it('hard-fails on PII rather than sending it anywhere', async () => {
    const dirty = {
      ...input,
      cuisineContext: 'client email coach@pilot.local',
    };
    await expect(narrate(dirty, { mode: 'fallback', verbosity: 'terse' })).rejects.toThrow(
      /de-identification/,
    );
  });
});
