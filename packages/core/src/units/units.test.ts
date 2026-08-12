import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import {
  cmToFeetInches,
  cmToIn,
  DEFAULT_UNIT_PREFS,
  displayLength,
  displayWeight,
  feetInchesToCm,
  formatLength,
  formatWeight,
  inToCm,
  kgToLb,
  lbToKg,
  parseLength,
  parseLengthToCm,
  parseWeight,
  parseWeightToKg,
  resolveUnitPrefs,
  unitPrefsToSystem,
} from './convert';

describe('conversions', () => {
  it('uses exact legal definitions', () => {
    expect(lbToKg(1)).toBeCloseTo(0.45359237, 10);
    expect(inToCm(1)).toBe(2.54);
  });

  it('round-trips weight and length (property)', () => {
    fc.assert(
      fc.property(fc.double({ min: 0.1, max: 500, noNaN: true }), (kg) => {
        expect(lbToKg(kgToLb(kg))).toBeCloseTo(kg, 9);
      }),
    );
    fc.assert(
      fc.property(fc.double({ min: 1, max: 300, noNaN: true }), (cm) => {
        expect(inToCm(cmToIn(cm))).toBeCloseTo(cm, 9);
      }),
    );
  });
});

describe('display formatting', () => {
  it('formats weight in both systems with rounding', () => {
    expect(displayWeight(80.55, 'metric')).toEqual({ value: 80.6, unit: 'kg' });
    expect(displayWeight(80, 'imperial')).toEqual({ value: 176.4, unit: 'lb' });
    expect(displayWeight(80.5555, 'metric', 2)).toEqual({ value: 80.56, unit: 'kg' });
  });

  it('formats length in both systems', () => {
    expect(displayLength(96.5, 'metric')).toEqual({ value: 96.5, unit: 'cm' });
    expect(displayLength(96.52, 'imperial')).toEqual({ value: 38, unit: 'in' });
  });
});

describe('input parsing (canonical metric storage)', () => {
  it('parses weight from either system to kg', () => {
    expect(parseWeightToKg(80, 'metric')).toBe(80);
    expect(parseWeightToKg(176.4, 'imperial')).toBeCloseTo(80.01, 1);
  });

  it('parses length from either system to cm', () => {
    expect(parseLengthToCm(100, 'metric')).toBe(100);
    expect(parseLengthToCm(39.37, 'imperial')).toBeCloseTo(100, 1);
  });
});

describe('height as feet/inches', () => {
  it('converts to feet+inches and back', () => {
    expect(cmToFeetInches(180)).toEqual({ feet: 5, inches: 11 });
    expect(feetInchesToCm({ feet: 5, inches: 11 })).toBeCloseTo(180.34, 2);
  });

  it('handles the 12-inch rollover', () => {
    expect(cmToFeetInches(182.88)).toEqual({ feet: 6, inches: 0 });
  });
});

describe('granular unit prefs', () => {
  it('resolves user overrides over tenant defaults', () => {
    expect(resolveUnitPrefs({ weight: 'lb' }, DEFAULT_UNIT_PREFS)).toEqual({
      weight: 'lb',
      height: 'ft_in',
      length: 'in',
    });
  });

  it('formats mixed PK prefs (kg + inches)', () => {
    expect(formatWeight(80, 'kg')).toEqual({ value: 80, unit: 'kg' });
    expect(formatLength(96.52, 'in')).toEqual({ value: 38, unit: 'in' });
  });

  it('formats and parses granular weight and length units', () => {
    expect(formatWeight(80, 'lb')).toEqual({ value: 176.4, unit: 'lb' });
    expect(formatLength(96.5, 'cm')).toEqual({ value: 96.5, unit: 'cm' });
    expect(parseWeight(80, 'kg')).toBe(80);
    expect(parseWeight(176.4, 'lb')).toBeCloseTo(80.01, 1);
    expect(parseLength(100, 'cm')).toBe(100);
    expect(parseLength(39.37, 'in')).toBeCloseTo(100, 1);
  });

  it('maps coarse system from weight unit (mixed PK prefs stay metric)', () => {
    expect(unitPrefsToSystem(DEFAULT_UNIT_PREFS)).toBe('metric');
    expect(unitPrefsToSystem({ ...DEFAULT_UNIT_PREFS, weight: 'lb' })).toBe('imperial');
  });

  it('falls back to tenant prefs when the user has none', () => {
    expect(resolveUnitPrefs(null, DEFAULT_UNIT_PREFS)).toEqual(DEFAULT_UNIT_PREFS);
    expect(resolveUnitPrefs(undefined, DEFAULT_UNIT_PREFS)).toEqual(DEFAULT_UNIT_PREFS);
  });
});
