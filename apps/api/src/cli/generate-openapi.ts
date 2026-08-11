import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { PGlite } from '@electric-sql/pglite';
import { drizzle } from 'drizzle-orm/pglite';
import { schema, type Db } from '@gymos/db';
import { tenantManifestSchema } from '@gymos/modules/tenancy';
import { buildApp } from '../app';

/** Emits the committed OpenAPI document (no real DB or secrets involved). */
const manifest = tenantManifestSchema.parse(
  JSON.parse(
    (await import('node:fs')).readFileSync(
      path.resolve(import.meta.dirname, '../../../../infra/tenants/pilot.json'),
      'utf8',
    ),
  ),
);

const db = drizzle(new PGlite(), { schema }) as unknown as Db;
const app = buildApp({
  db,
  manifest,
  env: {
    JWT_ACCESS_SECRET: 'spec-generation-placeholder-secret-0000',
    AI_MODE: 'fallback',
  },
});

const doc = app.getOpenAPI31Document({
  openapi: '3.1.0',
  info: { title: 'GymOS Pilot API', version: '1.0.0' },
});

const out = path.resolve(
  import.meta.dirname,
  '../../../../packages/contracts/openapi/openapi.v1.json',
);
mkdirSync(path.dirname(out), { recursive: true });
writeFileSync(out, `${JSON.stringify(doc, null, 2)}\n`);
console.log(`spec written: ${out}`);
