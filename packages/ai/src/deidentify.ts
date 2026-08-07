/**
 * Runtime guard at the Layer-3 boundary: asserts the serialized payload
 * carries no obvious PII even though the model runs on our own hardware
 * (defense in depth — spec §11 privacy posture).
 */
const EMAIL = /[\w.+-]+@[\w-]+\.[\w.]+/;
const PHONE = /\+?\d[\d\s-]{8,}\d/;
const UUID = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;
/** Long digit runs that are not typical food grams (grams are small ints). */
const LONG_DIGIT_RUN = /\d{8,}/;
const URL = /https?:\/\/[^\s"'\\]+/i;

export type DeidentifyViolation = {
  readonly kind: 'email' | 'phone' | 'uuid' | 'url' | 'long_digit_run';
};

export const assertDeidentified = (payload: unknown): DeidentifyViolation | null => {
  const text = JSON.stringify(payload);
  // Most-specific first: a UUID's digit runs would otherwise match the phone pattern.
  if (UUID.test(text)) return { kind: 'uuid' };
  if (EMAIL.test(text)) return { kind: 'email' };
  if (URL.test(text)) return { kind: 'url' };
  if (PHONE.test(text)) return { kind: 'phone' };
  if (LONG_DIGIT_RUN.test(text)) return { kind: 'long_digit_run' };
  return null;
};
