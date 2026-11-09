import { createDb } from '@gymos/db';
import { readManifestFile, syncSingleOrgRegistryFromFile } from '@gymos/modules/tenancy';
import { buildApp } from '../src/app';
import { loadEnv } from '../src/env';
import { memoizeAsync } from '../src/lazy-app';

/**
 * Vercel entry (ADR-0016). Render/VM keep using `src/index.ts`. The app is
 * built lazily, once per instance. Use Neon's pooled URL; prepared
 * statements are off because the pooler runs in transaction mode.
 */
const getApp = memoizeAsync(async () => {
  const env = loadEnv(process.env);
  const { db, close } = createDb(env.DATABASE_URL, 1, { prepare: false });
  try {
    const manifest = readManifestFile(env.TENANT_MANIFEST_PATH);
    await syncSingleOrgRegistryFromFile(db, env.TENANT_MANIFEST_PATH);
    return buildApp({ db, manifest, env });
  } catch (error) {
    await close(); // a failed cold start is retried; don't leak its pool
    throw error;
  }
});

const handler = async (request: Request): Promise<Response> => (await getApp()).fetch(request);

export const GET = handler;
export const POST = handler;
export const PUT = handler;
export const PATCH = handler;
export const DELETE = handler;
export const OPTIONS = handler;
export const HEAD = handler;
