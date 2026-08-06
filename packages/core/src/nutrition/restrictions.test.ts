import { describe, expect, it } from 'vitest';
import {
  ALLERGENS,
  isAllergenCode,
  isReligiousCode,
  RELIGIOUS_CODES,
  RESTRICTION_TYPES,
} from './restrictions';

describe('restriction registries', () => {
  it('covers the EU-14 allergen list', () => {
    expect(ALLERGENS).toHaveLength(14);
    expect(ALLERGENS).toContain('peanut');
    expect(ALLERGENS).toContain('wheat_gluten');
  });

  it('exposes the seven restriction types from the spec', () => {
    expect(RESTRICTION_TYPES).toEqual([
      'ALLERGY_SEVERE',
      'ALLERGY_MILD',
      'INTOLERANCE',
      'DISLIKE',
      'RELIGIOUS',
      'ETHICAL',
      'MEDICAL',
    ]);
  });

  it('validates allergen codes', () => {
    expect(isAllergenCode('peanut')).toBe(true);
    expect(isAllergenCode('sugar')).toBe(false);
  });

  it('validates religious codes', () => {
    expect(RELIGIOUS_CODES).toContain('halal');
    expect(isReligiousCode('halal')).toBe(true);
    expect(isReligiousCode('unknown')).toBe(false);
  });
});
