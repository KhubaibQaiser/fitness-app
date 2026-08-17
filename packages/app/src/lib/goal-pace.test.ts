import { describe, expect, it } from 'vitest';
import type { PublicConfig } from '@gymos/contracts';
import {
  formatPaceKgPerWeek,
  formatPacePct,
  targetKcalFromPace,
  weeklyDeltaKgFromPublicConfig,
} from './goal-pace';

const legacyConfig = {
  nutrition: {
    weeklyDeltaKg: {
      LOSE: { CONSERVATIVE: -0.5, STANDARD: -1, AGGRESSIVE: -2 },
      GAIN: { CONSERVATIVE: 0.25, STANDARD: 0.5, AGGRESSIVE: 1 },
    },
  },
} as PublicConfig;

describe('goal-pace', () => {
  it('reads tenant weekly overrides from public config', () => {
    expect(weeklyDeltaKgFromPublicConfig(legacyConfig, 'LOSE', 'STANDARD')).toBe(-1);
    expect(weeklyDeltaKgFromPublicConfig(legacyConfig, 'GAIN', 'CONSERVATIVE')).toBe(0.25);
    expect(weeklyDeltaKgFromPublicConfig(legacyConfig, 'RECOMP', 'STANDARD')).toBeUndefined();
    expect(weeklyDeltaKgFromPublicConfig(undefined, 'LOSE', 'STANDARD')).toBeUndefined();
  });

  it('clamps a safe tenant gentle-lose override to the requested kg/week', () => {
    const paced = targetKcalFromPace(2800, 'LOSE', 'CONSERVATIVE', {
      sex: 'M',
      weightKg: 80,
      config: legacyConfig,
    });
    expect(paced.mode).toBe('weekly_kg');
    expect(paced.weeklyDeltaKg).toBe(-0.5);
    expect(paced.targetKcal).toBe(2250);
    expect(paced.clamped).toBe(false);
  });

  it('clamps Aggressive −2 kg/wk at TDEE 2270 to the 25% cap, not 70 kcal', () => {
    const paced = targetKcalFromPace(2270, 'LOSE', 'AGGRESSIVE', {
      sex: 'M',
      weightKg: 95,
      config: legacyConfig,
    });
    expect(paced.mode).toBe('weekly_kg');
    expect(paced.requestedKcal).toBe(70);
    expect(paced.targetKcal).toBe(1703);
    expect(paced.weeklyDeltaKg).toBeCloseTo(-0.52, 2);
    expect(paced.clamped).toBe(true);
  });

  it('falls back to TDEE fraction when no override exists', () => {
    const paced = targetKcalFromPace(2500, 'LOSE', 'STANDARD', { sex: 'M', weightKg: 80 });
    expect(paced.mode).toBe('tdee_fraction');
    expect(paced.targetKcal).toBe(2000);
    expect(paced.weeklyDeltaKg).toBeCloseTo(-0.45, 1);
  });

  it('formats pace labels', () => {
    expect(formatPaceKgPerWeek(-0.5)).toBe('−0.5 kg/wk');
    expect(formatPaceKgPerWeek(1)).toBe('+1 kg/wk');
    expect(formatPacePct(-0.2)).toBe('−20%');
    expect(formatPacePct(0.1)).toBe('+10%');
  });
});
