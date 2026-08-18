import { describe, expect, it } from 'vitest';
import { buildPaceControlView } from './pace-control';

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
