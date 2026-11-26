import { sql } from 'drizzle-orm';
import { type Db } from '@gymos/db';

/** postgres.js returns the rows; PGlite returns `{ rows }`. */
const rowsOf = <T>(result: unknown): T[] => {
  if (Array.isArray(result)) return result as T[];
  if (typeof result === 'object' && result !== null && 'rows' in result) {
    const { rows } = result;
    if (Array.isArray(rows)) return rows as T[];
  }
  throw new Error('rate-limit: unexpected result shape from db.execute');
};

/**
 * Postgres-backed fixed-window rate limiter — correct across multiple API instances.
 * Fail-open on store errors so a DB blip cannot lock everyone out of login.
 */
export const createDbRateLimiter = (db: Db, limit: number, windowMs: number) => {
  return async (key: string, now = Date.now()): Promise<boolean> => {
    const windowStartMs = now - (now % windowMs);
    const windowStartIso = new Date(windowStartMs).toISOString();
    try {
      const result = await db.execute(sql`
        insert into rate_limits as r (key, window_start, count)
        values (${key}, ${windowStartIso}::timestamptz, 1)
        on conflict (key) do update set
          count = case
            when r.window_start = excluded.window_start then r.count + 1
            else 1
          end,
          window_start = case
            when r.window_start = excluded.window_start then r.window_start
            else excluded.window_start
          end
        returning count
      `);
      const count = rowsOf<{ count: number }>(result)[0]?.count;
      if (typeof count !== 'number') throw new Error('rate-limit: upsert returned no count');
      return count <= limit;
    } catch (error) {
      console.error('[rate-limit] store failed — allowing request', error);
      return true;
    }
  };
};

/** Failures allowed before an account backs off. */
export const ACCOUNT_FAILURE_LIMIT = 5;
/** A gap this long between failures starts a new streak. */
const STREAK_MS = 15 * 60_000;
/** Back-off after the limit: 1 minute, doubling with each further failure, at most 15 minutes. */
const BACKOFF = sql`least(interval '15 minutes', interval '1 minute' * power(2, r.count - ${ACCOUNT_FAILURE_LIMIT}))`;

export type AccountLimiter = {
  /** Counts this attempt as a failure up front; false while the account is backing off. */
  attempt: (key: string, now?: number) => Promise<boolean>;
  /** A successful sign-in clears the failures. */
  reset: (key: string) => Promise<void>;
};

/**
 * Per-account failure limiter, one `rate_limits` row per key: `count` is the failures in the current
 * streak and `window_start` the latest one. An attempt is counted before the password check, in one
 * statement, so parallel attempts can't all pass; a success deletes the row, so only failures stay
 * counted. After ACCOUNT_FAILURE_LIMIT failures with no 15-minute gap, attempts are refused, and not
 * counted, until the back-off has passed. Fail-open on store errors, like the limiter above.
 */
export const createAccountLimiter = (db: Db): AccountLimiter => ({
  attempt: async (key, now = Date.now()) => {
    const nowIso = new Date(now).toISOString();
    const streakStartIso = new Date(now - STREAK_MS).toISOString();
    try {
      // While backing off the WHERE skips the update, so no row comes back and nothing is counted.
      const result = await db.execute(sql`
        insert into rate_limits as r (key, window_start, count)
        values (${key}, ${nowIso}::timestamptz, 1)
        on conflict (key) do update set
          count = case when r.window_start < ${streakStartIso}::timestamptz then 1 else r.count + 1 end,
          window_start = ${nowIso}::timestamptz
        where not (
          r.window_start >= ${streakStartIso}::timestamptz
          and r.count >= ${ACCOUNT_FAILURE_LIMIT}
          and ${nowIso}::timestamptz < r.window_start + ${BACKOFF}
        )
        returning count
      `);
      return rowsOf<{ count: number }>(result).length > 0;
    } catch (error) {
      console.error('[rate-limit] account store failed — allowing request', error);
      return true;
    }
  },
  reset: async (key) => {
    try {
      await db.execute(sql`delete from rate_limits where key = ${key}`);
    } catch (error) {
      // The sign-in already succeeded; the failures left behind expire with the streak.
      console.error('[rate-limit] account reset failed', error);
    }
  },
});
