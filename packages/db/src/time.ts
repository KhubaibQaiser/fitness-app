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
