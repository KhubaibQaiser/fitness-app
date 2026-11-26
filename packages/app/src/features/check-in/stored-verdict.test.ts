import { describe, expect, it } from 'vitest';
import { parseStoredVerdict, shownVerdict } from './stored-verdict';

/** What `evaluateProgress` stores for an on-track week (no narrative: older rows and the seed). */
const hold = {
  type: 'HOLD',
  actualWeeklyDeltaKg: -0.45,
  expectedWeeklyDeltaKg: -0.44,
  observedTdeeEstimate: 2650,
  confidence: 0.94,
  reasons: ['on track: actual -0.45 vs expected -0.44 kg/wk (band ±0.15)'],
};

/** A re-run row: engine output plus the Layer-3 narrative, as `completeCheckIn` stores it. */
const adjust = {
  type: 'ADJUST_TARGETS',
  deltaKcalPerDay: -150,
  newTargets: { kcal: 2050, proteinG: 160, fatG: 70, carbsG: 210, fiberG: 29 },
  clampedBySafety: false,
  actualWeeklyDeltaKg: -0.1,
  expectedWeeklyDeltaKg: -0.45,
  observedTdeeEstimate: 2310,
  confidence: 0.8,
  reasons: ['deviation 0.35 kg/wk ⇒ energy gap 385 kcal/day; damped step 193 kcal'],
  narrative: {
    title: 'Adjustment recommended',
    coachSummary: 'Progress is slower than planned.',
    clientSummary: 'Small change to your daily food.',
  },
};

const without = (key: string, value: Record<string, unknown>) =>
  Object.fromEntries(Object.entries(value).filter(([k]) => k !== key));

describe('parseStoredVerdict', () => {
  it('treats null as no verdict yet', () => {
    expect(parseStoredVerdict(null)).toEqual({ ok: true, verdict: null });
  });

  it('accepts what the engine stores, with and without a narrative', () => {
    expect(parseStoredVerdict(hold)).toEqual({ ok: true, verdict: hold });
    expect(parseStoredVerdict(adjust)).toEqual({ ok: true, verdict: adjust });
    expect(
      parseStoredVerdict({ type: 'INSUFFICIENT_DATA', confidence: 0.3, reasons: ['x'] }),
    ).toEqual({
      ok: true,
      verdict: { type: 'INSUFFICIENT_DATA', confidence: 0.3, reasons: ['x'] },
    });
  });

  it("rejects the old seed's verdict, which has only a type", () => {
    const result = parseStoredVerdict({ type: 'HOLD', seeded: true });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.issues.join('\n')).toMatch(/^confidence: /m);
    expect(result.issues.join('\n')).toMatch(/^reasons: /m);
  });

  it.each(['type', 'confidence', 'reasons'])('rejects a verdict missing %s', (key) => {
    const result = parseStoredVerdict(without(key, hold));
    expect(result).toMatchObject({ ok: false, issues: [expect.stringMatching(`^${key}: `)] });
  });

  it.each<[string, unknown]>([
    ['an unknown type', { ...hold, type: 'MAYBE' }],
    ['reasons that are not strings', { ...hold, reasons: [{ code: 'ON_TRACK' }] }],
    ['a non-number confidence', { ...hold, confidence: '94%' }],
    ['new targets missing kcal', { ...adjust, newTargets: without('kcal', adjust.newTargets) }],
    ['a narrative missing its coach summary', { ...adjust, narrative: { title: 't' } }],
    ['an optional field stored as null', { ...hold, actualWeeklyDeltaKg: null }],
    ['an array', [hold]],
    ['a string', 'HOLD'],
    ['undefined (field missing from the response)', undefined],
  ])('rejects %s', (_label, value) => {
    expect(parseStoredVerdict(value).ok).toBe(false);
  });

  it('reports field paths and messages, never the stored values', () => {
    const result = parseStoredVerdict({ type: 'MAYBE', reasons: ['weighs 84.2 kg'] });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    const text = result.issues.join('\n');
    expect(text).not.toContain('MAYBE');
    expect(text).not.toContain('84.2');
  });
});

describe('shownVerdict', () => {
  it('shows the stored verdict until a re-run returns', () => {
    expect(shownVerdict(hold, undefined)).toEqual({ ok: true, verdict: hold });
    expect(shownVerdict(null, undefined)).toEqual({ ok: true, verdict: null });
  });

  it("shows a valid re-run's verdict instead of the stored one", () => {
    expect(shownVerdict(hold, adjust)).toEqual({ ok: true, verdict: adjust });
  });

  it('rejects a malformed re-run verdict even when the stored one is valid', () => {
    expect(shownVerdict(hold, without('reasons', adjust))).toMatchObject({
      ok: false,
      issues: ['reasons: missing or invalid'],
    });
    expect(shownVerdict(hold, null)).toEqual({ ok: false, issues: ['verdict: missing'] });
  });
});
