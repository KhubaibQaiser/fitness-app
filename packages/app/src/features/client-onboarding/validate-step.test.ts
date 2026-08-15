import { describe, expect, it } from 'vitest';
import { DEFAULT_UNIT_PREFS } from '@gymos/core/units';
import { INITIAL_DRAFT, STEP_META } from './onboarding-types';
import { validateStep } from './validate-step';

describe('client onboarding steps', () => {
  it('keeps activity inside the goal step instead of a standalone step', () => {
    expect(STEP_META.map((step) => step.id)).toEqual([
      'identity',
      'height',
      'contact',
      'body',
      'goal',
      'medical',
      'diet',
      'sign',
    ]);
  });

  it('validates reordered steps by stable step id', () => {
    const draft = {
      ...INITIAL_DRAFT,
      weightKg: '80',
      startWeightKg: '80',
      targetWeightKg: '',
    };

    expect(validateStep('body', draft, DEFAULT_UNIT_PREFS, 'PK')).toEqual({});
    expect(validateStep('goal', draft, DEFAULT_UNIT_PREFS, 'PK')).toEqual({
      targetWeightKg: 'Target weight is required',
    });
  });
});
