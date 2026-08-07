import { describe, expect, it } from 'vitest';
import { adherenceBarTone, adherencePctToRating, adherenceRatingToPct } from './adherence';

describe('adherence pct ↔ rating', () => {
  it('maps percent buckets to 1–5', () => {
    expect(adherencePctToRating(0)).toBe(1);
    expect(adherencePctToRating(1)).toBe(1);
    expect(adherencePctToRating(20)).toBe(1);
    expect(adherencePctToRating(21)).toBe(2);
    expect(adherencePctToRating(50)).toBe(3);
    expect(adherencePctToRating(85)).toBe(5);
    expect(adherencePctToRating(100)).toBe(5);
  });

  it('maps rating back to mid-bucket percent', () => {
    expect(adherenceRatingToPct(1)).toBe(20);
    expect(adherenceRatingToPct(5)).toBe(100);
    expect(adherenceRatingToPct(null)).toBe(0);
  });

  it('colors the bar by kit thresholds', () => {
    expect(adherenceBarTone(90)).toBe('success');
    expect(adherenceBarTone(70)).toBe('primary');
    expect(adherenceBarTone(55)).toBe('warning');
    expect(adherenceBarTone(40)).toBe('danger');
  });
});
