import { readFileSync } from 'node:fs';
import path from 'node:path';
import { PGlite } from '@electric-sql/pglite';
import { drizzle } from 'drizzle-orm/pglite';
import { migrate } from 'drizzle-orm/pglite/migrator';
import { beforeAll, describe, expect, it } from 'vitest';
import { schema, seed, type Db } from '@gymos/db';
import { hashPassword, resetPrincipalCache } from '@gymos/modules/identity';
import { notify } from '@gymos/modules/notifications';
import {
  resetManifestCache,
  resetRegistryCache,
  tenantManifestSchema,
} from '@gymos/modules/tenancy';
import { buildApp, type App } from '../src/app';

const JWT_SECRET = 'a-test-jwt-access-secret-that-is-long-enough';
const COACH_PASSWORD = 'pilot-coach-test-password';

/**
 * The ECMAScript date-time string format: ISO 8601 with 'T', milliseconds and an offset.
 * Node's Date also accepts Postgres's '2026-08-06 10:46:52.235+00'; Hermes does not (B6),
 * so assert the shape rather than parsing.
 */
const ISO_WITH_OFFSET = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}(?:Z|[+-]\d{2}:\d{2})$/;

let app: App;
let accessToken = '';

const manifest = tenantManifestSchema.parse(
  JSON.parse(
    readFileSync(path.resolve(import.meta.dirname, '../../../infra/tenants/pilot.json'), 'utf8'),
  ),
);

beforeAll(async () => {
  resetManifestCache();
  resetRegistryCache();
  resetPrincipalCache();
  const pglite = drizzle(new PGlite(), { schema });
  await migrate(pglite, {
    migrationsFolder: path.resolve(import.meta.dirname, '../../../packages/db/migrations'),
  });
  const db = pglite as unknown as Db;
  const seeded = await seed(db, {
    coachPasswordHash: await hashPassword(COACH_PASSWORD),
    tenantManifest: manifest as unknown as Record<string, unknown>,
    tenantSlug: manifest.slug,
  });

  // One read alert with a known instant written in +05:00, one fresh alert through the real path.
  await db.insert(schema.notifications).values({
    recipientUserId: seeded.coachUserId,
    type: 'PLAN_PUBLISHED',
    payload: {},
    createdAt: '2026-08-06 22:48:12.345+05',
    readAt: '2026-08-07 09:00:00+05',
  });
  await notify(db, {
    recipientUserId: seeded.coachUserId,
    type: 'CHECKIN_OVERDUE',
    priority: 'HIGH',
    payload: {},
  });

  app = buildApp({
    db,
    manifest,
    env: { JWT_ACCESS_SECRET: JWT_SECRET, AI_MODE: 'fallback' },
  });
  const login = await app.request('/v1/auth/login', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email: 'coach@pilot.local', password: COACH_PASSWORD }),
  });
  accessToken = ((await login.json()) as { accessToken: string }).accessToken;
});

describe('GET /v1/notifications timestamps', () => {
  it('emits createdAt and readAt as ISO 8601 with T and an offset', async () => {
    const res = await app.request('/v1/notifications', {
      headers: { authorization: `Bearer ${accessToken}` },
    });
    expect(res.status).toBe(200);
    const { items } = (await res.json()) as {
      items: { type: string; createdAt: string; readAt: string | null }[];
    };
    expect(items).toHaveLength(2);
    for (const n of items) {
      expect(n.createdAt).toMatch(ISO_WITH_OFFSET);
      if (n.readAt !== null) expect(n.readAt).toMatch(ISO_WITH_OFFSET);
    }

    const published = items.find((n) => n.type === 'PLAN_PUBLISHED');
    expect(published?.createdAt).toBe('2026-08-06T17:48:12.345Z');
    expect(published?.readAt).toBe('2026-08-07T04:00:00.000Z');
    expect(items.find((n) => n.type === 'CHECKIN_OVERDUE')?.readAt).toBeNull();
  });
});
