import { drizzle, type PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

/**
 * Driver-agnostic database handle: production uses postgres.js (Neon pooled
 * endpoints); tests use PGlite. Repos type against `Db`, never a driver.
 */
export type Db = PostgresJsDatabase<typeof schema>;

/** The transaction handle passed to `db.transaction(async (tx) => …)`. */
export type Tx = Parameters<Parameters<Db['transaction']>[0]>[0];

/** Accepted by helpers that work identically inside or outside a transaction. */
export type DbOrTx = Db | Tx;

export type DbConnection = { db: Db; close: () => Promise<void> };

export type DbOptions = {
  /**
   * Set `false` behind a transaction-mode pooler (Neon's pgbouncer endpoint on
   * serverless hosts). Left unset, postgres.js keeps its default (prepared
   * statements on), which is what the long-lived Render/VM API uses.
   */
  prepare?: boolean;
};

/** postgres.js options for the runtime pool; pure so it can be tested without a server. */
export const runtimeOptions = (
  maxConnections: number,
  { prepare }: DbOptions = {},
): postgres.Options<Record<string, never>> => ({
  max: maxConnections,
  onnotice: () => undefined,
  ...(prepare === undefined ? {} : { prepare }),
});

/** Pooled connection for the API/worker (Neon pgbouncer endpoint in prod). */
export const createDb = (url: string, maxConnections = 4, options?: DbOptions): DbConnection => {
  const sql = postgres(url, runtimeOptions(maxConnections, options));
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
