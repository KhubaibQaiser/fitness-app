/** Canonical restriction codes — the ONLY vocabulary Layer 2's hard filters accept. */

export const ALLERGENS = [
  'peanut',
  'tree_nut',
  'milk',
  'egg',
  'fish',
  'shellfish',
  'soy',
  'wheat_gluten',
  'sesame',
  'mustard',
  'celery',
  'lupin',
  'sulphites',
  'mollusc',
] as const;
export type AllergenCode = (typeof ALLERGENS)[number];

export const RELIGIOUS_CODES = [
  'halal',
  'vegetarian',
  'vegan',
  'no_beef',
  'no_pork',
  'no_alcohol',
] as const;
export type ReligiousCode = (typeof RELIGIOUS_CODES)[number];

export const RESTRICTION_TYPES = [
  'ALLERGY_SEVERE',
  'ALLERGY_MILD',
  'INTOLERANCE',
  'DISLIKE',
  'RELIGIOUS',
  'ETHICAL',
  'MEDICAL',
] as const;
export type RestrictionType = (typeof RESTRICTION_TYPES)[number];

export const isAllergenCode = (value: string): value is AllergenCode =>
  (ALLERGENS as readonly string[]).includes(value);

export const isReligiousCode = (value: string): value is ReligiousCode =>
  (RELIGIOUS_CODES as readonly string[]).includes(value);
