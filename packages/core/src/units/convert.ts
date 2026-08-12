/**
 * Canonical storage is ALWAYS metric (kg, cm). Imperial exists only at the
 * display/input boundary. Conversions use exact legal definitions.
 */
export type UnitSystem = 'metric' | 'imperial';

export const KG_PER_LB = 0.453_592_37; // exact (international avoirdupois pound)
export const CM_PER_IN = 2.54; // exact (international inch)

export const kgToLb = (kg: number): number => kg / KG_PER_LB;
export const lbToKg = (lb: number): number => lb * KG_PER_LB;
export const cmToIn = (cm: number): number => cm / CM_PER_IN;
export const inToCm = (inches: number): number => inches * CM_PER_IN;

const roundTo = (value: number, decimals: number): number => {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
};

export type DisplayValue = { readonly value: number; readonly unit: string };

/** Weight for display in the user's unit system (canonical input: kg). */
export const displayWeight = (kg: number, system: UnitSystem, decimals = 1): DisplayValue =>
  system === 'metric'
    ? { value: roundTo(kg, decimals), unit: 'kg' }
    : { value: roundTo(kgToLb(kg), decimals), unit: 'lb' };

/** Length/circumference for display (canonical input: cm). */
export const displayLength = (cm: number, system: UnitSystem, decimals = 1): DisplayValue =>
  system === 'metric'
    ? { value: roundTo(cm, decimals), unit: 'cm' }
    : { value: roundTo(cmToIn(cm), decimals), unit: 'in' };

/** Parse user-entered weight in their unit system back to canonical kg. */
export const parseWeightToKg = (value: number, system: UnitSystem): number =>
  system === 'metric' ? value : lbToKg(value);

/** Parse user-entered length in their unit system back to canonical cm. */
export const parseLengthToCm = (value: number, system: UnitSystem): number =>
  system === 'metric' ? value : inToCm(value);

export type WeightUnit = 'kg' | 'lb';
export type HeightUnit = 'cm' | 'ft_in';
export type LengthUnit = 'cm' | 'in';

export type UnitPrefs = {
  readonly weight: WeightUnit;
  readonly height: HeightUnit;
  readonly length: LengthUnit;
};

/** Pilot (PK) default: metric weight, imperial height and circumferences. */
export const DEFAULT_UNIT_PREFS: UnitPrefs = {
  weight: 'kg',
  height: 'ft_in',
  length: 'in',
};

export const resolveUnitPrefs = (
  user: Partial<UnitPrefs> | null | undefined,
  tenant: UnitPrefs,
): UnitPrefs => ({
  weight: user?.weight ?? tenant.weight,
  height: user?.height ?? tenant.height,
  length: user?.length ?? tenant.length,
});

/** Coarse system for older callers — mixed prefs (PK) count as metric. */
export const unitPrefsToSystem = (prefs: UnitPrefs): UnitSystem =>
  prefs.weight === 'lb' ? 'imperial' : 'metric';

export const formatWeight = (kg: number, unit: WeightUnit, decimals = 1): DisplayValue =>
  unit === 'kg'
    ? { value: roundTo(kg, decimals), unit: 'kg' }
    : { value: roundTo(kgToLb(kg), decimals), unit: 'lb' };

export const parseWeight = (value: number, unit: WeightUnit): number =>
  unit === 'kg' ? value : lbToKg(value);

export const formatLength = (cm: number, unit: LengthUnit, decimals = 1): DisplayValue =>
  unit === 'cm'
    ? { value: roundTo(cm, decimals), unit: 'cm' }
    : { value: roundTo(cmToIn(cm), decimals), unit: 'in' };

export const parseLength = (value: number, unit: LengthUnit): number =>
  unit === 'cm' ? value : inToCm(value);

export type FeetInches = { readonly feet: number; readonly inches: number };

/** Height as feet + inches for imperial display (canonical input: cm). */
export const cmToFeetInches = (cm: number): FeetInches => {
  const totalInches = Math.round(cmToIn(cm));
  return { feet: Math.floor(totalInches / 12), inches: totalInches % 12 };
};

export const feetInchesToCm = ({ feet, inches }: FeetInches): number => inToCm(feet * 12 + inches);
