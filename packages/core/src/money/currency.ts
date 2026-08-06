/**
 * ISO 4217 subset supported at launch. There is deliberately NO default currency
 * anywhere in the codebase — a price without an explicit currency code is a bug.
 */
const CURRENCY_MINOR_UNITS = {
  PKR: 2,
  USD: 2,
  EUR: 2,
  GBP: 2,
  AED: 2,
  SAR: 2,
  INR: 2,
  JPY: 0,
  KRW: 0,
  KWD: 3,
  BHD: 3,
} as const satisfies Record<string, 0 | 2 | 3>;

export type CurrencyCode = keyof typeof CURRENCY_MINOR_UNITS;

export const SUPPORTED_CURRENCIES = Object.keys(CURRENCY_MINOR_UNITS) as readonly CurrencyCode[];

export const isCurrencyCode = (value: string): value is CurrencyCode =>
  value in CURRENCY_MINOR_UNITS;

/** Number of digits after the decimal point (0 for JPY/KRW, 3 for KWD/BHD). */
export const minorUnitDigits = (currency: CurrencyCode): 0 | 2 | 3 =>
  CURRENCY_MINOR_UNITS[currency];
