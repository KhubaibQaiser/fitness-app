/**
 * Zero-docker dev/smoke mode: boots the full API against an in-memory
 * PGlite (real Postgres, real migrations, real seed). State resets on
 * restart — perfect for local UI work and CI smoke tests.
 *
 *   JWT_ACCESS_SECRET=... PILOT_COACH_PASSWORD=... pnpm --filter @gymos/api dev:pglite
 */
import { randomBytes, scrypt as scryptCb } from 'node:crypto';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { PGlite } from '@electric-sql/pglite';
import { serve } from '@hono/node-server';
import { drizzle } from 'drizzle-orm/pglite';
import { migrate } from 'drizzle-orm/pglite/migrator';
import { schema, seed, type Db } from '@gymos/db';
import { readManifestFile } from '@gymos/modules/tenancy';
import { buildApp } from './app';
import { loadEnv } from './env';

const scrypt = (
  password: string,
  salt: Buffer,
  keylen: number,
  options: { N: number; r: number; p: number },
): Promise<Buffer> =>
  new Promise((resolve, reject) => {
    scryptCb(password, salt, keylen, options, (err, derived) => {
      if (err) reject(err);
      else resolve(derived);
    });
  });

const hashPasswordLocal = async (password: string): Promise<string> => {
  const salt = randomBytes(16);
  const derived = await scrypt(password, salt, 64, { N: 16384, r: 8, p: 1 });
  return `scrypt$16384$8$1$${salt.toString('hex')}$${derived.toString('hex')}`;
};

const manifestPath = path.resolve(import.meta.dirname, '../../../infra/tenants/pilot.json');
const env = loadEnv({
  DATABASE_URL: 'pglite://in-memory',
  TENANT_MANIFEST_PATH: manifestPath,
  JWT_ACCESS_SECRET: process.env.JWT_ACCESS_SECRET ?? 'dev-jwt-access-secret-at-least-32-chars!!',
  ...process.env,
});

const pglite = drizzle(new PGlite(), { schema });
await migrate(pglite, {
  migrationsFolder: path.resolve(import.meta.dirname, '../../../packages/db/migrations'),
});
const db = pglite as unknown as Db;
const coachPassword = process.env.PILOT_COACH_PASSWORD ?? 'pilot-coach-change-me';
const tenantManifest = JSON.parse(readFileSync(manifestPath, 'utf8')) as Record<string, unknown>;
const seeded = await seed(db, {
  coachPasswordHash: await hashPasswordLocal(coachPassword),
  tenantManifest,
  tenantSlug: typeof tenantManifest.slug === 'string' ? tenantManifest.slug : 'pilot',
});
console.log('seeded demo client:', seeded.demoClientId);
console.log('login: coach@pilot.local /', coachPassword);

const manifest = readManifestFile(env.TENANT_MANIFEST_PATH);
const app = buildApp({ db, manifest, env });

serve({ fetch: app.fetch, port: env.PORT }, (info) => {
  console.log(`gymos api (pglite dev mode) on :${info.port} — ai mode: ${env.AI_MODE}`);
});
