import { describe, expect, it } from 'vitest';
import { buildPaceControlView, rateFromSliderKcal } from './pace-control';

const loseTicks = [
  { value: 2200, label: 'Gentle' },
  { value: 2000, label: 'Standard' },
  { value: 1875, label: 'Aggressive' },
] as const;

describe('pace control view', () => {
  it('places the suggested tick at Standard and allows a sub-floor override', () => {
    const view = buildPaceControlView({
      sex: 'M',
      ageYears: 30,
      heightCm: 180,
      weightKg: 80,
      activity: 1.55,
      preset: 'LOSE',
      rate: 'STANDARD',
      targetKcal: 1100,
    });
    expect(view.min).toBe(800);
    expect(view.warning).toBe('floor');
    expect(view.belowSexFloor).toBe(true);
    expect(view.value).toBe(1100);
    expect(view.nearestRate).toBe('AGGRESSIVE');
  });
});

describe('rateFromSliderKcal', () => {
  it('returns Standard when every tick is the same kcal', () => {
    expect(
      rateFromSliderKcal(2500, [
        { value: 2500, label: 'Gentle' },
        { value: 2500, label: 'Standard' },
        { value: 2500, label: 'Aggressive' },
      ]),
    ).toBe('STANDARD');
  });

  it('returns Standard when there are no ticks', () => {
    expect(rateFromSliderKcal(1800, [])).toBe('STANDARD');
  });

  it('maps a slider value onto the nearest named pace', () => {
    expect(rateFromSliderKcal(2190, loseTicks)).toBe('CONSERVATIVE');
    expect(rateFromSliderKcal(2010, loseTicks)).toBe('STANDARD');
    expect(rateFromSliderKcal(1900, loseTicks)).toBe('AGGRESSIVE');
    expect(rateFromSliderKcal(800, loseTicks)).toBe('AGGRESSIVE');
  });
});
