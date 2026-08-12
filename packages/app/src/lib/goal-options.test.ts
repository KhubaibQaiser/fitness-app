import { describe, expect, it } from 'vitest';
import { GOAL_PRESETS, GOAL_RATES } from '@gymos/core/nutrition';
import { GOAL_PRESET_OPTIONS, GOAL_RATE_OPTIONS } from './goal-options';

describe('goal options — parity with the nutrition engine', () => {
  it('covers every GoalPreset exactly once, with no stray values', () => {
    const values = GOAL_PRESET_OPTIONS.map((o) => o.value);
    expect(new Set(values).size).toBe(values.length);
    expect([...values].sort()).toEqual([...GOAL_PRESETS].sort());
  });

  it('covers every GoalRate exactly once, with no stray values', () => {
    const values = GOAL_RATE_OPTIONS.map((o) => o.value);
    expect(new Set(values).size).toBe(values.length);
    expect([...values].sort()).toEqual([...GOAL_RATES].sort());
  });

  it('gives every option a non-empty, human label', () => {
    for (const option of [...GOAL_PRESET_OPTIONS, ...GOAL_RATE_OPTIONS]) {
      expect(option.label.trim().length).toBeGreaterThan(0);
    }
  });
});
