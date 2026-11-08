import { createDb } from '@gymos/db';
import { readManifestFile, syncSingleOrgRegistryFromFile } from '@gymos/modules/tenancy';
import { buildApp } from '../src/app';
import { loadEnv } from '../src/env';
import { memoizeAsync } from '../src/lazy-app';

/**
 * Vercel entry (ADR-0016). Render/VM keep using `src/index.ts`. The app is
 * built lazily, once per instance. Phase 0 spike: point DATABASE_URL at a
 * Neon *branch* (direct URL); pooled-URL options arrive in Phase 1.
 */
const getApp = memoizeAsync(async () => {
  const env = loadEnv(process.env);
  const { db } = createDb(env.DATABASE_URL, 1);
  const manifest = readManifestFile(env.TENANT_MANIFEST_PATH);
  await syncSingleOrgRegistryFromFile(db, env.TENANT_MANIFEST_PATH);
  return buildApp({ db, manifest, env });
});

const handler = async (request: Request): Promise<Response> => (await getApp()).fetch(request);

export const GET = handler;
export const POST = handler;
export const PUT = handler;
export const PATCH = handler;
export const DELETE = handler;
export const OPTIONS = handler;
export const HEAD = handler;
