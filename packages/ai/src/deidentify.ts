/**
 * Runtime guard at the Layer-3 boundary: asserts the serialized payload
 * carries no obvious PII even though the model runs on our own hardware
 * (defense in depth — spec §11 privacy posture).
 */
const EMAIL = /[\w.+-]+@[\w-]+\.[\w.]+/;
const PHONE = /\+?\d[\d\s-]{8,}\d/;
const UUID = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;

export type DeidentifyViolation = { readonly kind: 'email' | 'phone' | 'uuid' };

export const assertDeidentified = (payload: unknown): DeidentifyViolation | null => {
  const text = JSON.stringify(payload);
  // Most-specific first: a UUID's digit runs would otherwise match the phone pattern.
  if (UUID.test(text)) return { kind: 'uuid' };
  if (EMAIL.test(text)) return { kind: 'email' };
  if (PHONE.test(text)) return { kind: 'phone' };
  return null;
};
