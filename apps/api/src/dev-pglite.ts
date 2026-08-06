/**
 * Zero-docker dev/smoke mode: boots the full API against an in-memory
 * PGlite (real Postgres, real migrations, real seed). State resets on
 * restart — perfect for local UI work and CI smoke tests.
 *
 *   PILOT_ACCESS_KEY=dev-access-key-0123 GATE_COOKIE_SECRET=... pnpm --filter @gymos/api dev:pglite
 */
import path from 'node:path';
import { PGlite } from '@electric-sql/pglite';
import { serve } from '@hono/node-server';
import { drizzle } from 'drizzle-orm/pglite';
import { migrate } from 'drizzle-orm/pglite/migrator';
import { schema, seed, type Db } from '@gymos/db';
import { loadManifest } from '@gymos/modules/tenancy';
import { buildApp } from './app';
import { loadEnv } from './env';

const env = loadEnv({
  DATABASE_URL: 'pglite://in-memory',
  TENANT_MANIFEST_PATH: path.resolve(import.meta.dirname, '../../../infra/tenants/pilot.json'),
  ...process.env,
});

const pglite = drizzle(new PGlite(), { schema });
await migrate(pglite, {
  migrationsFolder: path.resolve(import.meta.dirname, '../../../packages/db/migrations'),
});
const db = pglite as unknown as Db;
const seeded = await seed(db);
console.log('seeded demo client:', seeded.demoClientId);

const manifest = loadManifest(env.TENANT_MANIFEST_PATH);
const app = buildApp({ db, manifest, env });

serve({ fetch: app.fetch, port: env.PORT }, (info) => {
  console.log(`gymos api (pglite dev mode) on :${info.port} — ai mode: ${env.AI_MODE}`);
});
