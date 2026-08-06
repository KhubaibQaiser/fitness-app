import { serve } from '@hono/node-server';
import { createDb } from '@gymos/db';
import { loadManifest } from '@gymos/modules/tenancy';
import { buildApp } from './app';
import { loadEnv } from './env';

const env = loadEnv(process.env);
const manifest = loadManifest(env.TENANT_MANIFEST_PATH);
const { db } = createDb(env.DATABASE_URL);

const app = buildApp({ db, manifest, env });

serve({ fetch: app.fetch, port: env.PORT }, (info) => {
  console.log(`gymos api listening on :${info.port} (ai mode: ${env.AI_MODE})`);
});
