import { describe, expect, it } from 'vitest';
import { cmToFtIn, ftInToCm, parsePositive } from './height-units';

describe('ftInToCm', () => {
  it('converts feet + inches to centimeters', () => {
    expect(ftInToCm(5, 8)).toBeCloseTo(172.7, 1);
    expect(ftInToCm(6, 0)).toBeCloseTo(182.9, 1);
    expect(ftInToCm(0, 0)).toBe(0);
  });
});

describe('cmToFtIn', () => {
  it('splits centimeters into whole feet + remaining inches', () => {
    expect(cmToFtIn(172.7)).toEqual({ ft: 5, inches: 8 });
    expect(cmToFtIn(182.9)).toEqual({ ft: 6, inches: 0 });
  });

  it('round-trips with ftInToCm for common heights', () => {
    for (const [ft, inches] of [
      [4, 11],
      [5, 5],
      [5, 11],
      [6, 3],
    ] as const) {
      const cm = ftInToCm(ft, inches);
      const back = cmToFtIn(cm);
      expect(back.ft).toBe(ft);
      expect(back.inches).toBeCloseTo(inches, 0);
    }
  });
});

describe('parsePositive', () => {
  it('parses positive numeric strings', () => {
    expect(parsePositive('72')).toBe(72);
    expect(parsePositive('72.5')).toBe(72.5);
  });

  it('rejects blank, zero, negative, and non-numeric input', () => {
    expect(parsePositive('')).toBeNull();
    expect(parsePositive('   ')).toBeNull();
    expect(parsePositive('0')).toBeNull();
    expect(parsePositive('-5')).toBeNull();
    expect(parsePositive('abc')).toBeNull();
  });
});
