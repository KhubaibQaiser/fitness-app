import { minorUnitDigits } from './currency';
import { toDecimalString, type Money } from './money';

/**
 * Locale-aware display formatting. Precision comes from Intl's own resolved
 * options for the currency — never a hardcoded ×100 assumption.
 * Display-only: the bigint → number conversion is safe for realistic amounts,
 * and this value must never flow back into arithmetic.
 */
export const formatMoney = (m: Money, locale: string): string => {
  const digits = minorUnitDigits(m.currency);
  const numeric = Number(toDecimalString(m));
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: m.currency,
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(numeric);
};
