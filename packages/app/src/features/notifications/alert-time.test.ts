import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Notification } from '@gymos/contracts';
import {
  ALERT_CLOCK_OPTIONS,
  ALERT_DAY_OPTIONS,
  alertMillis,
  alertRows,
  formatAlertTime,
  joinAlertTime,
  sortAlerts,
} from './alert-time';

const alert = (
  id: string,
  priority: Notification['priority'],
  createdAt: string,
): Notification => ({
  id,
  type: 'SYSTEM',
  priority,
  payload: {},
  deepLink: null,
  readAt: null,
  createdAt,
});

describe('sortAlerts', () => {
  it('puts HIGH first, then newest first by instant across mixed offsets', () => {
    const items = [
      alert('normal-0730z', 'NORMAL', '2026-08-06T12:30:00.000+05:00'),
      alert('high-0300z', 'HIGH', '2026-08-05T23:00:00.000-04:00'),
      alert('normal-1000z', 'NORMAL', '2026-08-06T10:00:00.000Z'),
      alert('high-0400z', 'HIGH', '2026-08-06T04:00:00Z'),
    ];
    // A string sort would put normal-0730z above normal-1000z.
    expect(sortAlerts(items).map((n) => n.id)).toEqual([
      'high-0400z',
      'high-0300z',
      'normal-1000z',
      'normal-0730z',
    ]);
  });

  it('breaks a tie on the same instant by id, whatever the input order', () => {
    const older = alert('01a20a0b-0000-7000-8000-000000000001', 'NORMAL', '2026-08-06T10:00:00Z');
    const newer = alert(
      '01a20a0b-0000-7000-8000-000000000002',
      'NORMAL',
      '2026-08-06T15:00:00+05:00',
    );
    const expected = [newer.id, older.id];
    expect(sortAlerts([older, newer]).map((n) => n.id)).toEqual(expected);
    expect(sortAlerts([newer, older]).map((n) => n.id)).toEqual(expected);
  });

  it('does not mutate its input', () => {
    const items = [
      alert('old', 'NORMAL', '2026-08-01T00:00:00.000Z'),
      alert('new', 'NORMAL', '2026-08-02T00:00:00.000Z'),
    ];
    sortAlerts(items);
    expect(items.map((n) => n.id)).toEqual(['old', 'new']);
  });
});

describe('alertMillis', () => {
  it('reads ISO 8601 with T and an offset', () => {
    expect(alertMillis('2026-08-06T22:48:12.345+05:00')).toBe(
      Date.UTC(2026, 7, 6, 17, 48, 12, 345),
    );
  });

  it.each([
    // The exact string the API returned before B6 (Postgres SQL format). Node parses it; Hermes does not.
    '2026-11-23 20:14:59.426903+00',
    '2026-08-06T17:48:12.345',
    '2026-08-06',
    'not a date',
  ])('rejects %j instead of rendering Invalid Date', (value) => {
    expect(() => alertMillis(value)).toThrow(value);
  });
});

describe('formatAlertTime', () => {
  it('formats as day, short month and 12-hour time', () => {
    // The device zone decides the hour (CI runs in UTC), so check the shape: "6 Aug, 10:48 pm".
    expect(formatAlertTime('2026-08-06T17:48:00.000Z')).toMatch(
      /^\d{1,2} Aug, \d{1,2}:\d{2} [ap]m$/,
    );
  });
});

describe('joinAlertTime', () => {
  it('gives the exact string for a fixed instant (V8, Karachi time)', () => {
    const at = Date.UTC(2026, 7, 6, 17, 48);
    const inKarachi = (options: Intl.DateTimeFormatOptions) =>
      new Intl.DateTimeFormat('en-PK', { ...options, timeZone: 'Asia/Karachi' }).format(at);
    expect(joinAlertTime(inKarachi(ALERT_DAY_OPTIONS), inKarachi(ALERT_CLOCK_OPTIONS))).toBe(
      '6 Aug, 10:48 pm',
    );
  });

  it('gives the same string from the halves Hermes on iOS produces ("10:48 PM")', () => {
    expect(joinAlertTime('6 Aug', '10:48 PM')).toBe('6 Aug, 10:48 pm');
  });

  it('turns a narrow no-break space before am/pm (newer ICU) into a plain space', () => {
    expect(joinAlertTime('6 Aug', '10:48 pm')).toBe('6 Aug, 10:48 pm');
  });
});

describe('alertRows', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns the alerts in display order with readable times', () => {
    const result = alertRows([
      alert('normal', 'NORMAL', '2026-08-06T10:00:00.000Z'),
      alert('high', 'HIGH', '2026-08-05T10:00:00.000Z'),
    ]);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.rows.map((r) => r.alert.id)).toEqual(['high', 'normal']);
    for (const row of result.rows) expect(row.time).toMatch(/^\d{1,2} Aug, \d{1,2}:\d{2} [ap]m$/);
  });

  it('reports a non-ISO createdAt as an error and logs it, instead of throwing during render', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const bad = '2026-11-23 20:14:59.426903+00';
    expect(
      alertRows([alert('fine', 'NORMAL', '2026-08-06T10:00:00.000Z'), alert('bad', 'HIGH', bad)]),
    ).toEqual({ ok: false });
    expect(warn).toHaveBeenCalledWith(
      expect.stringContaining('[notifications.list]'),
      expect.objectContaining({ operation: 'notifications.list', value: bad }),
    );
  });
});
