import { sql } from 'drizzle-orm';
import { type Db } from '@gymos/db';

/** An error from this module, with a code so the log line can name it without its message. */
const storeError = (code: string): Error =>
  Object.assign(new Error(`rate-limit: ${code}`), { code });

/** postgres.js returns the rows; PGlite returns `{ rows }`. */
const rowsOf = <T>(result: unknown): T[] => {
  if (Array.isArray(result)) return result as T[];
  if (typeof result === 'object' && result !== null && 'rows' in result) {
    const { rows } = result;
    if (Array.isArray(rows)) return rows as T[];
  }
  throw storeError('UNEXPECTED_RESULT_SHAPE');
};

const nameAndCode = (error: unknown): { name: string; code?: string } =>
  error instanceof Error
    ? {
        // DrizzleQueryError keeps the default name, so fall back to the class name.
        name: error.name === 'Error' ? error.constructor.name : error.name,
        ...('code' in error && typeof error.code === 'string' ? { code: error.code } : {}),
      }
    : { name: typeof error };

/**
 * Logs a limiter store failure: the limiter (the key's fixed `<route>:<kind>` prefix), the
 * operation, and the name and code of the error and of its cause. Never a message, a query or the
 * key: a failed query's message lists its parameters, and the driver's may quote values.
 */
const logStoreFailure = (
  key: string,
  operation: 'count' | 'attempt' | 'clear',
  outcome: string,
  error: unknown,
): void => {
  console.error(`[rate-limit] ${operation} failed — ${outcome}`, {
    limiter: key.split(':').slice(0, 2).join(':'),
    operation,
    error: nameAndCode(error),
    ...(error instanceof Error && error.cause !== undefined
      ? { cause: nameAndCode(error.cause) }
      : {}),
  });
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
      if (typeof count !== 'number') throw storeError('NO_COUNT');
      return count <= limit;
    } catch (error) {
      logStoreFailure(key, 'count', 'allowing request', error);
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
  /** A successful sign-in or password reset clears the failures. */
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
      logStoreFailure(key, 'attempt', 'allowing request', error);
      return true;
    }
  },
  reset: async (key) => {
    try {
      await db.execute(sql`delete from rate_limits where key = ${key}`);
    } catch (error) {
      // The caller's sign-in or password reset already succeeded; the failures expire with the streak.
      logStoreFailure(key, 'clear', 'failures kept', error);
    }
  },
});
