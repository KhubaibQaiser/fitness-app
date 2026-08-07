import { describe, expect, it } from 'vitest';
import { PREP_PREFERENCES } from './prep-preferences';

describe('PREP_PREFERENCES', () => {
  it('exposes the coach-facing sweetener and oil defaults', () => {
    expect(PREP_PREFERENCES.sweetener).toBe('Stevia');
    expect(PREP_PREFERENCES.cookingOil).toBe('olive oil');
    expect(PREP_PREFERENCES.summary).toContain('Stevia');
    expect(PREP_PREFERENCES.summary).toContain('olive oil');
  });
});
