import { ftInToCm, parsePositive } from './height-units';
import type { OnboardingDraft } from './onboarding-types';

export const resolveHeightCm = (draft: OnboardingDraft): number | null => {
  if (draft.heightUnit === 'cm') return parsePositive(draft.heightCm);
  const ft = parsePositive(draft.heightFt);
  if (ft === null) return null;
  const inches = draft.heightIn.trim() === '' ? 0 : Number(draft.heightIn);
  if (!Number.isFinite(inches) || inches < 0) return null;
  return ftInToCm(ft, inches);
};

export const parseConditions = (raw: string): string[] =>
  raw
    .split(/[\n,]+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);

export const validateStep = (stepIndex: number, draft: OnboardingDraft): Record<string, string> => {
  const errors: Record<string, string> = {};

  if (stepIndex === 0) {
    if (draft.name.trim().length === 0) errors.name = 'Name is required';
    if (draft.dob.trim() !== '' && !/^\d{4}-\d{2}-\d{2}$/.test(draft.dob.trim())) {
      errors.dob = 'Use YYYY-MM-DD format';
    }
  }

  if (stepIndex === 1) {
    const cm = resolveHeightCm(draft);
    if (cm === null || cm < 100 || cm > 230) {
      errors.height = 'Enter a height between 100 and 230 cm';
    }
  }

  if (stepIndex === 2) {
    if (draft.phone.trim().length === 0) errors.phone = 'WhatsApp number is required';
    if (draft.email.trim() !== '' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(draft.email.trim())) {
      errors.email = 'Enter a valid email';
    }
  }

  if (stepIndex === 4) {
    const w = parsePositive(draft.weightKg);
    if (w === null || w < 20 || w > 400) errors.weightKg = 'Enter weight in kg (20–400)';
    for (const key of ['waistCm', 'chestCm', 'hipCm', 'armCm', 'thighCm'] as const) {
      if (draft[key].trim() === '') continue;
      const n = parsePositive(draft[key]);
      if (n === null) errors[key] = 'Enter a valid number';
    }
  }

  if (stepIndex === 5) {
    const start = parsePositive(draft.startWeightKg) ?? parsePositive(draft.weightKg);
    if (start === null) errors.startWeightKg = 'Enter a starting weight';
    if (draft.targetWeightKg.trim() !== '') {
      const t = parsePositive(draft.targetWeightKg);
      if (t === null) errors.targetWeightKg = 'Enter a valid target';
    }
  }

  if (stepIndex === 7) {
    if (draft.signaturePngBase64 === null || draft.signaturePngBase64.length < 40) {
      errors.signature = 'Client signature is required';
    }
  }

  return errors;
};
