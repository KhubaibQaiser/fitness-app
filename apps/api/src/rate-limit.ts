import { sql } from 'drizzle-orm';
import { type Db } from '@gymos/db';

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
      const rows = result as unknown as { count: number }[];
      const count = Array.isArray(rows) ? rows[0]?.count : undefined;
      if (typeof count !== 'number') {
        // postgres.js / drizzle row shape varies — read back
        const again = await db.execute(sql`
          select count from rate_limits where key = ${key} limit 1
        `);
        const againRows = again as unknown as { count: number }[];
        const c = Array.isArray(againRows) ? againRows[0]?.count : 1;
        return (c ?? 1) <= limit;
      }
      return count <= limit;
    } catch (error) {
      console.error('[rate-limit] store failed — allowing request', error);
      return true;
    }
  };
};
