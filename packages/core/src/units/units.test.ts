import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import {
  cmToFeetInches,
  cmToIn,
  displayLength,
  displayWeight,
  feetInchesToCm,
  inToCm,
  kgToLb,
  lbToKg,
  parseLengthToCm,
  parseWeightToKg,
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
