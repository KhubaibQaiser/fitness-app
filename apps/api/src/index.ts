import { serve } from '@hono/node-server';
import { createDb } from '@gymos/db';
import { readManifestFile, syncSingleOrgRegistryFromFile } from '@gymos/modules/tenancy';
import { buildApp } from './app';
import { loadEnv } from './env';

const env = loadEnv(process.env);
const { db } = createDb(env.DATABASE_URL);

/** Bootstrap file for public config / OpenAPI; registry is source of truth per org. */
const manifest = readManifestFile(env.TENANT_MANIFEST_PATH);
await syncSingleOrgRegistryFromFile(db, env.TENANT_MANIFEST_PATH);

const app = buildApp({ db, manifest, env });

serve({ fetch: app.fetch, port: env.PORT }, (info) => {
  console.log(`gymos api listening on :${info.port} (ai mode: ${env.AI_MODE})`);
});
