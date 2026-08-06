import { err, ok, type Result } from '../shared/result';
import { minorUnitDigits, type CurrencyCode } from './currency';

/**
 * Money is always integer minor units (bigint) + an explicit ISO 4217 code.
 * Floating-point money is banned repo-wide; parsing goes through strings.
 */
export type Money = {
  readonly amountMinor: bigint;
  readonly currency: CurrencyCode;
};

export type MoneyError =
  | {
      readonly code: 'CURRENCY_MISMATCH';
      readonly left: CurrencyCode;
      readonly right: CurrencyCode;
    }
  | { readonly code: 'INVALID_AMOUNT'; readonly input: string };

export const money = (amountMinor: bigint, currency: CurrencyCode): Money => ({
  amountMinor,
  currency,
});

export const zero = (currency: CurrencyCode): Money => money(0n, currency);

const sameCurrency = (a: Money, b: Money): Result<CurrencyCode, MoneyError> =>
  a.currency === b.currency
    ? ok(a.currency)
    : err({ code: 'CURRENCY_MISMATCH', left: a.currency, right: b.currency });

export const add = (a: Money, b: Money): Result<Money, MoneyError> => {
  const check = sameCurrency(a, b);
  return check.ok ? ok(money(a.amountMinor + b.amountMinor, check.value)) : check;
};

export const subtract = (a: Money, b: Money): Result<Money, MoneyError> => {
  const check = sameCurrency(a, b);
  return check.ok ? ok(money(a.amountMinor - b.amountMinor, check.value)) : check;
};

export const negate = (a: Money): Money => money(-a.amountMinor, a.currency);

export const equals = (a: Money, b: Money): boolean =>
  a.currency === b.currency && a.amountMinor === b.amountMinor;

/** -1 | 0 | 1; comparing across currencies is a MoneyError. */
export const compare = (a: Money, b: Money): Result<-1 | 0 | 1, MoneyError> => {
  const check = sameCurrency(a, b);
  if (!check.ok) return check;
  if (a.amountMinor < b.amountMinor) return ok(-1);
  if (a.amountMinor > b.amountMinor) return ok(1);
  return ok(0);
};

/**
 * Parse a decimal string ("1234.56") into Money, exact for the currency's
 * minor-unit digits. Rejects floats-in-disguise (too many decimals), signs
 * are allowed. Never accepts `number` input — that is the whole point.
 */
export const fromDecimalString = (
  input: string,
  currency: CurrencyCode,
): Result<Money, MoneyError> => {
  const digits = minorUnitDigits(currency);
  const match = /^(-)?(\d+)(?:\.(\d+))?$/.exec(input.trim());
  if (!match) return err({ code: 'INVALID_AMOUNT', input });
  const [, sign, whole = '0', frac = ''] = match;
  if (frac.length > digits) return err({ code: 'INVALID_AMOUNT', input });
  const scaled = BigInt(whole) * 10n ** BigInt(digits) + BigInt(frac.padEnd(digits, '0') || '0');
  return ok(money(sign === '-' ? -scaled : scaled, currency));
};

/** Render minor units back to an exact decimal string ("1234.56", "-0.005", "150"). */
export const toDecimalString = (m: Money): string => {
  const digits = minorUnitDigits(m.currency);
  const negative = m.amountMinor < 0n;
  const abs = negative ? -m.amountMinor : m.amountMinor;
  const base = 10n ** BigInt(digits);
  const whole = (abs / base).toString();
  if (digits === 0) return `${negative ? '-' : ''}${whole}`;
  const frac = (abs % base).toString().padStart(digits, '0');
  return `${negative ? '-' : ''}${whole}.${frac}`;
};

/**
 * Split an amount into parts proportional to integer weights using the
 * largest-remainder method. The parts always sum exactly to the input —
 * no cent is ever created or destroyed.
 */
export const allocate = (m: Money, weights: readonly number[]): Result<Money[], MoneyError> => {
  if (weights.length === 0 || weights.some((w) => !Number.isInteger(w) || w < 0)) {
    return err({ code: 'INVALID_AMOUNT', input: `weights:${weights.join(',')}` });
  }
  const total = weights.reduce((sum, w) => sum + w, 0);
  if (total === 0) return err({ code: 'INVALID_AMOUNT', input: 'weights:all-zero' });

  const totalBig = BigInt(total);
  const negative = m.amountMinor < 0n;
  const abs = negative ? -m.amountMinor : m.amountMinor;

  const shares = weights.map((w) => (abs * BigInt(w)) / totalBig);
  const remainder = abs - shares.reduce((sum, s) => sum + s, 0n);
  // Distribute leftover minor units one by one, largest fractional part first
  // (ties broken by position), so parts always sum exactly to the input.
  const bump = new Set<number>();
  const byFraction = weights
    .map((w, i) => ({ i, frac: (abs * BigInt(w)) % totalBig }))
    .sort((a, b) => {
      if (a.frac !== b.frac) return b.frac > a.frac ? 1 : -1;
      return a.i - b.i;
    });
  let distributed = 0n;
  for (const { i } of byFraction) {
    if (distributed >= remainder) break;
    bump.add(i);
    distributed += 1n;
  }
  return ok(
    shares.map((share, i) => {
      const withBump = bump.has(i) ? share + 1n : share;
      return money(negative ? -withBump : withBump, m.currency);
    }),
  );
};
