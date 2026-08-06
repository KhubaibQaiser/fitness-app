import { drizzle, type PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

/**
 * Driver-agnostic database handle: production uses postgres.js (Neon pooled
 * endpoints); tests use PGlite. Repos type against `Db`, never a driver.
 */
export type Db = PostgresJsDatabase<typeof schema>;

export type DbConnection = { db: Db; close: () => Promise<void> };

/** Pooled connection for the API/worker (Neon pgbouncer endpoint in prod). */
export const createDb = (url: string, maxConnections = 4): DbConnection => {
  const sql = postgres(url, { max: maxConnections, onnotice: () => undefined });
  return {
    db: drizzle(sql, { schema }),
    close: () => sql.end({ timeout: 5 }),
  };
};

/** Single-connection handle for migrations (direct, non-pooled URL). */
export const createMigrationDb = (
  url: string,
): { sql: postgres.Sql; close: () => Promise<void> } => {
  const sql = postgres(url, { max: 1, onnotice: () => undefined });
  return { sql, close: () => sql.end({ timeout: 5 }) };
};
