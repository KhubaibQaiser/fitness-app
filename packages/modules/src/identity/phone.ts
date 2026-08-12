/**
 * Lightweight phone normalization for the pilot (default region PK).
 * Accepts E.164 (`+923001234567`) or common local PK forms (`03001234567`).
 */

export type PhoneNormalizeResult =
  { ok: true; e164: string } | { ok: false; reason: 'INVALID_PHONE' };

const stripToDigits = (raw: string): string => raw.replace(/\D/g, '');

/**
 * Normalize a phone string to E.164.
 * @param defaultRegion ISO 3166-1 alpha-2; only `PK` is handled specially for local numbers.
 */
export const normalizePhone = (
  raw: string,
  defaultRegion: 'PK' | 'US' = 'PK',
): PhoneNormalizeResult => {
  const trimmed = raw.trim();
  if (trimmed.length === 0) return { ok: false, reason: 'INVALID_PHONE' };

  if (trimmed.startsWith('+')) {
    const digits = stripToDigits(trimmed);
    if (digits.length < 8 || digits.length > 15) {
      return { ok: false, reason: 'INVALID_PHONE' };
    }
    return { ok: true, e164: `+${digits}` };
  }

  const digits = stripToDigits(trimmed);
  if (defaultRegion === 'PK') {
    // 03XXXXXXXXX (11 digits) → +923XXXXXXXXX
    if (/^03\d{9}$/.test(digits)) {
      return { ok: true, e164: `+92${digits.slice(1)}` };
    }
    // 923XXXXXXXXX without plus
    if (/^923\d{9}$/.test(digits)) {
      return { ok: true, e164: `+${digits}` };
    }
  }

  if (defaultRegion === 'US' && /^[2-9]\d{9}$/.test(digits)) {
    return { ok: true, e164: `+1${digits}` };
  }

  return { ok: false, reason: 'INVALID_PHONE' };
};
