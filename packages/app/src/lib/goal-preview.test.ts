import { describe, expect, it } from 'vitest';
import type { PublicConfig } from '@gymos/contracts';
import {
  ageYearsFromDob,
  buildGoalPreview,
  estimateGoalWeeks,
  formatGoalEta,
} from './goal-preview';

const pilotConfig = {
  nutrition: {
    weeklyDeltaKg: {
      LOSE: { CONSERVATIVE: -0.5, STANDARD: -1, AGGRESSIVE: -2 },
      GAIN: { CONSERVATIVE: 0.25, STANDARD: 0.5, AGGRESSIVE: 1 },
    },
  },
} as PublicConfig;

describe('goal preview', () => {
  it('uses age 30 when DOB is missing and calculates exact age otherwise', () => {
    const today = new Date('2026-08-15T00:00:00Z');
    expect(ageYearsFromDob('', today)).toBe(30);
    expect(ageYearsFromDob('1996-08-16', today)).toBe(29);
    expect(ageYearsFromDob('1996-08-15', today)).toBe(30);
  });

  it('estimates timelines only when the pace moves toward the target', () => {
    expect(estimateGoalWeeks(80, 70, -0.5)).toBe(20);
    expect(estimateGoalWeeks(70, 80, 0.5)).toBe(20);
    expect(estimateGoalWeeks(80, 70, 0.5)).toBeNull();
    expect(estimateGoalWeeks(80, 70, 0)).toBeNull();
    expect(estimateGoalWeeks(80, null, -0.5)).toBeNull();
  });

  it('formats timelines without false precision', () => {
    expect(formatGoalEta(null)).toBe('Not available');
    expect(formatGoalEta(0)).toBe('Goal reached');
    expect(formatGoalEta(5.2)).toBe('About 6 weeks');
    expect(formatGoalEta(20)).toBe('About 5 months');
    expect(formatGoalEta(110)).toBe('More than 2 years');
  });

  it('builds a safe tenant-aware energy preview', () => {
    const preview = buildGoalPreview({
      sex: 'M',
      dob: '1996-08-15',
      heightCm: 180,
      weightKg: 80,
      activity: 1.55,
      preset: 'LOSE',
      rate: 'CONSERVATIVE',
      startWeightKg: 80,
      targetWeightKg: 70,
      config: pilotConfig,
      today: new Date('2026-08-15T00:00:00Z'),
    });

    expect(preview.expectedWeeklyDeltaKg).toBe(-0.5);
    expect(preview.targetKcal).toBe(preview.tdeeKcal - 550);
    expect(preview.etaWeeks).toBe(20);
    expect(preview.estimatedTargetDate).toBe('2027-01-02');
    expect(preview.safetyIssue).toBeNull();
  });

  it('preserves requested numbers and explains an unsafe pace', () => {
    const preview = buildGoalPreview({
      sex: 'F',
      dob: '1996-01-01',
      heightCm: 165,
      weightKg: 70,
      activity: 1.375,
      preset: 'LOSE',
      rate: 'STANDARD',
      startWeightKg: 70,
      targetWeightKg: 60,
      config: pilotConfig,
      today: new Date('2026-08-15T00:00:00Z'),
    });

    expect(preview.expectedWeeklyDeltaKg).toBe(-1);
    expect(preview.dailyEnergyDeltaKcal).toBe(-1100);
    expect(preview.safetyIssue).not.toBeNull();
    expect(['CALORIE_FLOOR_VIOLATION', 'DEFICIT_CAP_EXCEEDED']).toContain(
      preview.safetyIssue?.code,
    );
  });
});
