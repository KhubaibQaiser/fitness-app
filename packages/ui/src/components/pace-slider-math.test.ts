import { describe, expect, it } from 'vitest';
import { clampKcal, kcalToT, nearestTickLabel, stepKcal, tToKcal } from './pace-slider-math';

describe('pace slider math', () => {
  it('clamps and rounds kcal', () => {
    expect(clampKcal(1100.4, 800, 2000)).toBe(1100);
    expect(clampKcal(700, 800, 2000)).toBe(800);
    expect(clampKcal(2500, 800, 2000)).toBe(2000);
  });

  it('inverts deficit tracks so lower kcal sits to the right', () => {
    expect(kcalToT(2000, 800, 2000, true)).toBe(0);
    expect(kcalToT(800, 800, 2000, true)).toBe(1);
    expect(tToKcal(0, 800, 2000, true)).toBe(2000);
    expect(tToKcal(1, 800, 2000, true)).toBe(800);
  });

  it('keeps surplus tracks low-to-high left-to-right', () => {
    expect(kcalToT(2000, 2000, 2600, false)).toBe(0);
    expect(tToKcal(1, 2000, 2600, false)).toBe(2600);
  });

  it('picks the nearest tick label', () => {
    const ticks = [
      { value: 2200, label: 'Gentle' },
      { value: 2000, label: 'Standard' },
      { value: 1800, label: 'Aggressive' },
    ];
    expect(nearestTickLabel(2010, ticks)).toBe('Standard');
    expect(nearestTickLabel(900, ticks)).toBe('Aggressive');
  });

  it('steps inverted tracks so ArrowRight lowers kcal', () => {
    expect(stepKcal(1700, 800, 2000, true, 1, 10)).toBe(1690);
    expect(stepKcal(1700, 800, 2000, true, -1, 10)).toBe(1710);
  });
});
