import type { HeightUnit } from '@gymos/core/units';

/** Convert feet + inches to centimeters (rounded to 1 decimal). */
export const ftInToCm = (ft: number, inches: number): number =>
  Math.round((ft * 30.48 + inches * 2.54) * 10) / 10;

/** Split centimeters into whole feet and remaining inches. */
export const cmToFtIn = (cm: number): { ft: number; inches: number } => {
  const totalIn = cm / 2.54;
  const ft = Math.floor(totalIn / 12);
  const inches = Math.round((totalIn - ft * 12) * 10) / 10;
  return { ft, inches };
};

export const parsePositive = (raw: string): number | null => {
  if (raw.trim() === '') return null;
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? n : null;
};

/** Resolve display height inputs to centimeters using the coach height unit pref. */
export const resolveHeightCmInput = (
  unit: HeightUnit,
  values: { cm: string; ft: string; inches: string },
): number | null => {
  if (unit === 'cm') return parsePositive(values.cm);
  const ft = parsePositive(values.ft);
  if (ft === null) return null;
  const inches = values.inches.trim() === '' ? 0 : Number(values.inches);
  if (!Number.isFinite(inches) || inches < 0) return null;
  return ftInToCm(ft, inches);
};
