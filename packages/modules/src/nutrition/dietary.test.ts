import { describe, expect, it } from 'vitest';
import { restrictedAllergenCodes } from './dietary';

describe('restrictedAllergenCodes', () => {
  it('collects allergen codes from ALLERGY_SEVERE, ALLERGY_MILD, and INTOLERANCE rows', () => {
    const codes = restrictedAllergenCodes([
      { type: 'ALLERGY_SEVERE', code: 'allergen:peanut' },
      { type: 'ALLERGY_MILD', code: 'allergen:milk' },
      { type: 'INTOLERANCE', code: 'allergen:egg' },
    ]);
    expect(codes.sort()).toEqual(['egg', 'milk', 'peanut']);
  });

  it('ignores non-allergen-prefixed codes and other restriction types', () => {
    const codes = restrictedAllergenCodes([
      { type: 'RELIGIOUS', code: 'religious:halal' },
      { type: 'DISLIKE', code: 'dislike:some-food-id' },
      { type: 'ETHICAL', code: 'ethical:cruelty-free' },
      { type: 'MEDICAL', code: 'medical:low-sodium' },
    ]);
    expect(codes).toEqual([]);
  });

  it('never treats a PREFERRED row as an exclusion (ADR-0015 D6 audit requirement)', () => {
    // PREFERRED is the one non-exclusion restriction type — even one carrying
    // an `allergen:`-shaped code (which should never happen in practice, but
    // the filter must not accidentally treat it as a real allergen exclusion
    // just because the string happens to match the prefix check).
    const codes = restrictedAllergenCodes([{ type: 'PREFERRED', code: 'allergen:peanut' }]);
    expect(codes).toEqual([]);
  });
});
