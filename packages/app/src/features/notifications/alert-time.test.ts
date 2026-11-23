import { describe, expect, it } from 'vitest';
import type { Notification } from '@gymos/contracts';
import { alertMillis, formatAlertTime, sortAlerts } from './alert-time';

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
      /^\d{1,2} Aug, \d{1,2}:\d{2}\s[ap]m$/,
    );
  });
});
