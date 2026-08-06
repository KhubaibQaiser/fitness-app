import { describe, expect, it } from 'vitest';
import { isCurrencyCode, minorUnitDigits, SUPPORTED_CURRENCIES } from './currency';
import { formatMoney } from './format';
import {
  add,
  allocate,
  compare,
  equals,
  fromDecimalString,
  money,
  negate,
  subtract,
  toDecimalString,
  zero,
} from './money';

describe('currency registry', () => {
  it('exposes supported codes with correct minor units', () => {
    expect(SUPPORTED_CURRENCIES).toContain('PKR');
    expect(minorUnitDigits('PKR')).toBe(2);
    expect(minorUnitDigits('JPY')).toBe(0);
    expect(minorUnitDigits('KWD')).toBe(3);
  });

  it('validates currency codes', () => {
    expect(isCurrencyCode('PKR')).toBe(true);
    expect(isCurrencyCode('XXX')).toBe(false);
  });
});

describe('money arithmetic', () => {
  it('adds same-currency amounts', () => {
    const result = add(money(150n, 'PKR'), money(250n, 'PKR'));
    expect(result).toEqual({ ok: true, value: money(400n, 'PKR') });
  });

  it('rejects cross-currency addition', () => {
    const result = add(money(1n, 'PKR'), money(1n, 'USD'));
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toEqual({ code: 'CURRENCY_MISMATCH', left: 'PKR', right: 'USD' });
    }
  });

  it('subtracts and rejects mismatches', () => {
    expect(subtract(money(400n, 'PKR'), money(150n, 'PKR'))).toEqual({
      ok: true,
      value: money(250n, 'PKR'),
    });
    expect(subtract(money(1n, 'PKR'), money(1n, 'JPY')).ok).toBe(false);
  });

  it('negates and builds zero', () => {
    expect(negate(money(5n, 'PKR'))).toEqual(money(-5n, 'PKR'));
    expect(zero('PKR')).toEqual(money(0n, 'PKR'));
  });

  it('compares equality across amount and currency', () => {
    expect(equals(money(5n, 'PKR'), money(5n, 'PKR'))).toBe(true);
    expect(equals(money(5n, 'PKR'), money(6n, 'PKR'))).toBe(false);
    expect(equals(money(5n, 'PKR'), money(5n, 'USD'))).toBe(false);
  });

  it('orders amounts', () => {
    expect(compare(money(1n, 'PKR'), money(2n, 'PKR'))).toEqual({ ok: true, value: -1 });
    expect(compare(money(3n, 'PKR'), money(2n, 'PKR'))).toEqual({ ok: true, value: 1 });
    expect(compare(money(2n, 'PKR'), money(2n, 'PKR'))).toEqual({ ok: true, value: 0 });
    expect(compare(money(1n, 'PKR'), money(1n, 'EUR')).ok).toBe(false);
  });
});

describe('fromDecimalString', () => {
  it('parses integers, decimals, negatives and trims whitespace', () => {
    expect(fromDecimalString('1234.56', 'PKR')).toEqual({ ok: true, value: money(123456n, 'PKR') });
    expect(fromDecimalString(' 42 ', 'PKR')).toEqual({ ok: true, value: money(4200n, 'PKR') });
    expect(fromDecimalString('-0.05', 'PKR')).toEqual({ ok: true, value: money(-5n, 'PKR') });
  });

  it('pads short fractions to the currency scale', () => {
    expect(fromDecimalString('1.5', 'PKR')).toEqual({ ok: true, value: money(150n, 'PKR') });
    expect(fromDecimalString('1.5', 'KWD')).toEqual({ ok: true, value: money(1500n, 'KWD') });
  });

  it('handles 0-decimal and 3-decimal currencies', () => {
    expect(fromDecimalString('1235', 'JPY')).toEqual({ ok: true, value: money(1235n, 'JPY') });
    expect(fromDecimalString('1.234', 'BHD')).toEqual({ ok: true, value: money(1234n, 'BHD') });
  });

  it('rejects precision beyond the currency scale', () => {
    expect(fromDecimalString('1.234', 'PKR').ok).toBe(false);
    expect(fromDecimalString('1.5', 'JPY').ok).toBe(false);
  });

  it('rejects malformed input', () => {
    for (const bad of ['abc', '1,000', '1.', '.5', '1e3', '']) {
      expect(fromDecimalString(bad, 'PKR').ok).toBe(false);
    }
  });
});

describe('toDecimalString', () => {
  it('renders exact decimals per currency scale', () => {
    expect(toDecimalString(money(123456n, 'PKR'))).toBe('1234.56');
    expect(toDecimalString(money(1235n, 'JPY'))).toBe('1235');
    expect(toDecimalString(money(1234n, 'KWD'))).toBe('1.234');
    expect(toDecimalString(money(-5n, 'PKR'))).toBe('-0.05');
    expect(toDecimalString(money(-7n, 'JPY'))).toBe('-7');
  });

  it('round-trips with fromDecimalString', () => {
    const parsed = fromDecimalString('98765.432', 'BHD');
    expect(parsed.ok).toBe(true);
    if (parsed.ok) expect(toDecimalString(parsed.value)).toBe('98765.432');
  });
});

describe('allocate', () => {
  it('splits evenly with zero remainder', () => {
    const result = allocate(money(100n, 'PKR'), [1, 1]);
    expect(result).toEqual({ ok: true, value: [money(50n, 'PKR'), money(50n, 'PKR')] });
  });

  it('distributes remainders largest-fraction-first and preserves the sum', () => {
    const result = allocate(money(100n, 'PKR'), [1, 1, 1]);
    expect(result.ok).toBe(true);
    if (result.ok) {
      const sum = result.value.reduce((acc, m) => acc + m.amountMinor, 0n);
      expect(sum).toBe(100n);
      expect(result.value.map((m) => m.amountMinor)).toEqual([34n, 33n, 33n]);
    }
  });

  it('respects unequal weights', () => {
    const result = allocate(money(1000n, 'PKR'), [3, 7]);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value.map((m) => m.amountMinor)).toEqual([300n, 700n]);
  });

  it('orders remainder distribution across three distinct fractions', () => {
    // shares 50/30/20, remainder 1 goes to the largest fraction (weight 5).
    const result = allocate(money(101n, 'PKR'), [5, 3, 2]);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.map((m) => m.amountMinor)).toEqual([51n, 30n, 20n]);
      expect(result.value.reduce((acc, m) => acc + m.amountMinor, 0n)).toBe(101n);
    }
  });

  it('distributes correctly when fractions arrive in ascending order', () => {
    // fracs 2/3/5 ascending — the largest fraction (last weight) gets the extra unit.
    const result = allocate(money(101n, 'PKR'), [2, 3, 5]);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.map((m) => m.amountMinor)).toEqual([20n, 30n, 51n]);
    }
  });

  it('allocates negative amounts with sum preserved', () => {
    const result = allocate(money(-101n, 'PKR'), [1, 2]);
    expect(result.ok).toBe(true);
    if (result.ok) {
      const sum = result.value.reduce((acc, m) => acc + m.amountMinor, 0n);
      expect(sum).toBe(-101n);
    }
  });

  it('rejects empty, negative, fractional and all-zero weights', () => {
    expect(allocate(money(100n, 'PKR'), []).ok).toBe(false);
    expect(allocate(money(100n, 'PKR'), [-1, 2]).ok).toBe(false);
    expect(allocate(money(100n, 'PKR'), [0.5, 1]).ok).toBe(false);
    expect(allocate(money(100n, 'PKR'), [0, 0]).ok).toBe(false);
  });
});

describe('formatMoney', () => {
  it('formats with locale-aware symbols and currency-correct precision', () => {
    expect(formatMoney(money(123456n, 'USD'), 'en-US')).toBe('$1,234.56');
    expect(formatMoney(money(1235n, 'JPY'), 'en-US')).toBe('¥1,235');
    expect(formatMoney(money(1234n, 'KWD'), 'en-US')).toContain('1.234');
  });
});
