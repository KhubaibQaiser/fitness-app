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
