import { describe, expect, it } from 'vitest';
import { normalizePhone } from './phone';

describe('normalizePhone', () => {
  it('accepts E.164', () => {
    expect(normalizePhone('+923001234567')).toEqual({ ok: true, e164: '+923001234567' });
  });

  it('normalizes PK local numbers', () => {
    expect(normalizePhone('03001234567')).toEqual({ ok: true, e164: '+923001234567' });
  });

  it('rejects garbage', () => {
    expect(normalizePhone('abc')).toEqual({ ok: false, reason: 'INVALID_PHONE' });
  });
});
