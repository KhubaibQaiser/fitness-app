import { describe, expect, it } from 'vitest';
import { aggregateRankings, scoreFromSignals } from './ranking';

describe('scoreFromSignals', () => {
  it('returns prior when there are no samples', () => {
    expect(scoreFromSignals([])).toEqual({ score: 1, samples: 0 });
  });

  it('raises score for publish-unchanged signals', () => {
    const { score, samples } = scoreFromSignals([
      'PUBLISH_UNCHANGED',
      'PUBLISH_UNCHANGED',
      'PUBLISH_UNCHANGED',
    ]);
    expect(samples).toBe(3);
    expect(score).toBeGreaterThan(1);
  });

  it('lowers score for swap-away signals', () => {
    const { score } = scoreFromSignals(['SWAP_AWAY', 'SWAP_AWAY', 'SWAP_AWAY', 'SWAP_AWAY']);
    expect(score).toBeLessThan(1);
  });

  it('covers remove and adjustment signal kinds', () => {
    const mixed = scoreFromSignals(['EDIT_REMOVE', 'ADJUSTMENT_ACCEPTED']);
    expect(mixed.samples).toBe(2);
    expect(mixed.score).toBeLessThan(1);
  });

  it('clamps to configured bounds', () => {
    const high = scoreFromSignals(Array.from({ length: 40 }, () => 'SWAP_TOWARD' as const));
    expect(high.score).toBe(3);
    const low = scoreFromSignals(Array.from({ length: 40 }, () => 'SWAP_AWAY' as const));
    expect(low.score).toBe(0.1);
  });
});

describe('aggregateRankings', () => {
  it('groups by food, slot, and goal', () => {
    const rows = aggregateRankings([
      { foodId: 'a', slot: 'lunch', goal: 'LOSE', kind: 'SWAP_TOWARD' },
      { foodId: 'a', slot: 'lunch', goal: 'LOSE', kind: 'PUBLISH_UNCHANGED' },
      { foodId: 'b', slot: 'dinner', goal: 'LOSE', kind: 'SWAP_AWAY' },
    ]);
    expect(rows).toHaveLength(2);
    const lunch = rows.find((r) => r.foodId === 'a');
    expect(lunch?.samples).toBe(2);
    expect(lunch?.score).toBeGreaterThan(1);
  });
});
