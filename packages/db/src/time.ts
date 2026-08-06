import { DateTime } from 'luxon';

/** Current UTC instant as an ISO string — the only clock the db layer uses. */
export const nowIso = (): string => DateTime.utc().toISO();

export const todayIsoDate = (zone: string): string => {
  const date = DateTime.now().setZone(zone).toISODate();
  if (date === null) throw new Error(`invalid timezone: ${zone}`);
  return date;
};

/** Non-null ISO timestamp from a valid Luxon DateTime. */
export const iso = (dt: DateTime): string => {
  const value = dt.toISO();
  if (value === null) throw new Error('invalid DateTime');
  return value;
};

/** Non-null ISO date (YYYY-MM-DD) from a valid Luxon DateTime. */
export const isoDate = (dt: DateTime): string => {
  const value = dt.toISODate();
  if (value === null) throw new Error('invalid DateTime');
  return value;
};

/**
 * Parse a Postgres timestamptz string. Drivers return SQL format
 * ('2026-08-06 10:46:52.235+00'), not strict ISO — fromISO alone
 * silently fails on it, so always try both.
 */
export const parseDbTimestamp = (value: string): DateTime => {
  const isoParsed = DateTime.fromISO(value, { setZone: true });
  if (isoParsed.isValid) return isoParsed;
  const sqlParsed = DateTime.fromSQL(value, { setZone: true });
  if (sqlParsed.isValid) return sqlParsed;
  throw new Error(`unparseable timestamp from database: ${value}`);
};

/** Strict ISO (with 'T') from a database timestamptz string. */
export const toStrictIso = (value: string): string => iso(parseDbTimestamp(value).toUTC());

/** Epoch milliseconds from a database timestamptz string. */
export const dbTimestampToMillis = (value: string): number => parseDbTimestamp(value).toMillis();
