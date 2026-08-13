import { parseLength, parseWeight, type UnitPrefs } from '@gymos/core/units';
import { parsePositive, resolveHeightCmInput } from '../../lib/height-units';
import { isCountryCode, toE164, type CountryCode } from '../../lib/phone';
import type { OnboardingDraft } from './onboarding-types';

export const resolveHeightCm = (draft: OnboardingDraft, prefs: UnitPrefs): number | null =>
  resolveHeightCmInput(prefs.height, {
    cm: draft.heightCm,
    ft: draft.heightFt,
    inches: draft.heightIn,
  });

export const parseConditions = (raw: string): string[] =>
  raw
    .split(/[\n,]+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);

export const resolveWeightKg = (raw: string, prefs: UnitPrefs): number | null => {
  const n = parsePositive(raw);
  if (n === null) return null;
  return parseWeight(n, prefs.weight);
};

export const resolveLengthCm = (raw: string, prefs: UnitPrefs): number | null => {
  if (raw.trim() === '') return null;
  const n = parsePositive(raw);
  if (n === null) return null;
  return parseLength(n, prefs.length);
};

export const resolvePhoneE164 = (raw: string, defaultCountry: string): string | null => {
  const country: CountryCode = isCountryCode(defaultCountry) ? defaultCountry : 'PK';
  return toE164(raw, country);
};

export const validateStep = (
  stepIndex: number,
  draft: OnboardingDraft,
  prefs: UnitPrefs,
  defaultCountry: string,
): Record<string, string> => {
  const errors: Record<string, string> = {};

  if (stepIndex === 0) {
    if (draft.name.trim().length === 0) errors.name = 'Name is required';
    if (draft.dob.trim() !== '' && !/^\d{4}-\d{2}-\d{2}$/.test(draft.dob.trim())) {
      errors.dob = 'Use YYYY-MM-DD format';
    }
  }

  if (stepIndex === 1) {
    const cm = resolveHeightCm(draft, prefs);
    if (cm === null || cm < 100 || cm > 230) {
      errors.height = 'Enter a height between 100 and 230 cm';
    }
  }

  if (stepIndex === 2) {
    if (draft.phone.trim().length === 0) errors.phone = 'WhatsApp number is required';
    else if (resolvePhoneE164(draft.phone, defaultCountry) === null) {
      errors.phone = 'Enter a valid phone number';
    }
    if (draft.email.trim() !== '' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(draft.email.trim())) {
      errors.email = 'Enter a valid email';
    }
  }

  if (stepIndex === 4) {
    const w = resolveWeightKg(draft.weightKg, prefs);
    if (w === null || w < 20 || w > 400) {
      errors.weightKg = `Enter weight in ${prefs.weight} (20–400 kg equivalent)`;
    }
    for (const key of ['waistCm', 'chestCm', 'hipCm', 'armCm', 'thighCm'] as const) {
      if (draft[key].trim() === '') continue;
      const n = resolveLengthCm(draft[key], prefs);
      if (n === null) errors[key] = 'Enter a valid number';
    }
  }

  if (stepIndex === 5) {
    const start =
      resolveWeightKg(draft.startWeightKg, prefs) ?? resolveWeightKg(draft.weightKg, prefs);
    if (start === null) errors.startWeightKg = 'Enter a starting weight';
    const target = resolveWeightKg(draft.targetWeightKg, prefs);
    if (target === null) errors.targetWeightKg = 'Target weight is required';
  }

  if (stepIndex === 8) {
    if (draft.signaturePngBase64 === null || draft.signaturePngBase64.length < 40) {
      errors.signature = 'Client signature is required';
    }
  }

  return errors;
};
