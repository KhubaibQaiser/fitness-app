import type { Notification } from '@gymos/contracts';

/**
 * The API's timestamp shape (ISO 8601 with 'T' and an offset). Checked before parsing because
 * Node's Date accepts more formats than Hermes, so a value can pass on web and break on native.
 */
const API_TIMESTAMP = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?(?:Z|[+-]\d{2}:\d{2})$/;

// Built once: a formatter per row is slow on Hermes. Hermes supports these four options.
const ALERT_TIME = new Intl.DateTimeFormat('en-PK', {
  day: 'numeric',
  month: 'short',
  hour: 'numeric',
  minute: '2-digit',
});

/** A createdAt the API sent in a shape other than ISO 8601 with an offset. */
export class AlertTimeError extends Error {
  constructor(readonly value: string) {
    super(`notification createdAt is not ISO 8601 with an offset: ${value}`);
    this.name = 'AlertTimeError';
  }
}

/** Epoch milliseconds of an alert's createdAt. Throws on any other shape rather than show "Invalid Date". */
export const alertMillis = (createdAt: string): number => {
  const ms = API_TIMESTAMP.test(createdAt) ? Date.parse(createdAt) : Number.NaN;
  if (Number.isNaN(ms)) throw new AlertTimeError(createdAt);
  return ms;
};

/** "6 Aug, 10:48 pm" in the device's time zone. */
export const formatAlertTime = (createdAt: string): string =>
  ALERT_TIME.format(alertMillis(createdAt));

/** HIGH first, then newest first, compared on epoch milliseconds. */
export const sortAlerts = (items: readonly Notification[]): Notification[] =>
  items
    .map((n) => ({ n, ms: alertMillis(n.createdAt) }))
    .sort((a, b) =>
      a.n.priority !== b.n.priority ? (a.n.priority === 'HIGH' ? -1 : 1) : b.ms - a.ms,
    )
    .map(({ n }) => n);

export type AlertRows = { ok: true; rows: { alert: Notification; time: string }[] } | { ok: false };

/**
 * The alerts in display order with their times. A createdAt that breaks the contract is logged
 * with its value and returned as not ok, so the screen shows its error state with Try again.
 */
export const alertRows = (items: readonly Notification[]): AlertRows => {
  try {
    const rows = sortAlerts(items).map((alert) => ({
      alert,
      time: formatAlertTime(alert.createdAt),
    }));
    return { ok: true, rows };
  } catch (error) {
    if (!(error instanceof AlertTimeError)) throw error;
    console.warn('[notifications.list] alert time is not ISO 8601 with an offset', {
      operation: 'notifications.list',
      value: error.value,
    });
    return { ok: false };
  }
};
