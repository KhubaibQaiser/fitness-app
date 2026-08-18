import { DateTime } from 'luxon';
import { describe, expect, it } from 'vitest';
import { dbTimestampToMillis, parseDbTimestamp } from './time';

describe('parseDbTimestamp', () => {
  it('parses strict ISO', () => {
    const dt = parseDbTimestamp('2026-08-06T10:46:52.235Z');
    expect(dt.isValid).toBe(true);
    expect(dt.toUTC().toISO()).toBe('2026-08-06T10:46:52.235Z');
  });

  it('parses Postgres SQL-format timestamptz (space separator, +00 offset)', () => {
    const dt = parseDbTimestamp('2026-08-06 10:46:52.235+00');
    expect(dt.isValid).toBe(true);
    expect(dt.toUTC().toISO()).toBe('2026-08-06T10:46:52.235Z');
    expect(Number.isFinite(dbTimestampToMillis('2026-08-06 10:46:52.235+00'))).toBe(true);
  });

  it('parses Date objects from drivers that do not stringify timestamptz', () => {
    const date = new Date('2026-08-06T10:46:52.235Z');
    const dt = parseDbTimestamp(date);
    expect(dt.isValid).toBe(true);
    expect(dt.toMillis()).toBe(date.getTime());
  });

  it('does not treat invalid ISO as epoch/NaN (the INSUFFICIENT_DATA regression)', () => {
    const sql = '2026-08-06 10:46:52.235+00';
    expect(DateTime.fromISO(sql, { setZone: true }).isValid).toBe(false);
    expect(Number.isFinite(dbTimestampToMillis(sql))).toBe(true);
  });
});
