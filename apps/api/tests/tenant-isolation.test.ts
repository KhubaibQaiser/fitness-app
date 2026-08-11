import { readFileSync } from 'node:fs';
import path from 'node:path';
import { PGlite } from '@electric-sql/pglite';
import { eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/pglite';
import { migrate } from 'drizzle-orm/pglite/migrator';
import { beforeAll, describe, expect, it } from 'vitest';
import { schema, seed, type Db } from '@gymos/db';
import { listClients } from '@gymos/modules/coaching';
import { hashPassword, resetPrincipalCache } from '@gymos/modules/identity';
import {
  getManifestForOrg,
  resetManifestCache,
  resetRegistryCache,
  tenantManifestSchema,
} from '@gymos/modules/tenancy';
import { buildApp, type App } from '../src/app';

const JWT_SECRET = 'a-test-jwt-access-secret-that-is-long-enough';
const COACH_PASSWORD = 'pilot-coach-test-password';

let app: App;
let db: Db;
let accessToken = '';
let orgId = '';

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
  db = pglite as unknown as Db;
  const seeded = await seed(db, {
    coachPasswordHash: await hashPassword(COACH_PASSWORD),
    tenantManifest: manifest as unknown as Record<string, unknown>,
    tenantSlug: manifest.slug,
  });
  orgId = seeded.orgId;

  // Second org + outlet + client — must never appear in the pilot coach's roster.
  const [otherOrg] = await db
    .insert(schema.organizations)
    .values({ name: 'Other Gym Chain' })
    .returning();
  if (!otherOrg) throw new Error('other org insert failed');
  const [otherOutlet] = await db
    .insert(schema.outlets)
    .values({ orgId: otherOrg.id, name: 'Other Branch', timezone: 'Asia/Karachi' })
    .returning();
  if (!otherOutlet) throw new Error('other outlet insert failed');
  await db.insert(schema.clients).values({
    outletId: otherOutlet.id,
    name: 'Secret Other Client',
    sex: 'F',
    status: 'active',
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
  const body = (await login.json()) as { accessToken: string };
  accessToken = body.accessToken;
});

describe('tenant isolation', () => {
  it('listClients never returns clients from another organization', async () => {
    const res = await app.request('/v1/clients', {
      headers: { authorization: `Bearer ${accessToken}` },
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as { items: { name: string }[] };
    expect(body.items.some((i) => i.name === 'Secret Other Client')).toBe(false);
    expect(body.items.some((i) => i.name === 'Adnan (Demo)')).toBe(true);
  });

  it('module-level listClients filters by org when orgWide', async () => {
    const items = await listClients(db, {
      scope: {
        userId: 'x',
        orgWide: true,
        outletIds: [],
        assignedClientIds: [],
      },
      orgId,
    });
    expect(items.some((i) => i.name === 'Secret Other Client')).toBe(false);

    const [other] = await db
      .select({ id: schema.organizations.id })
      .from(schema.organizations)
      .where(eq(schema.organizations.name, 'Other Gym Chain'))
      .limit(1);
    if (!other) throw new Error('other org missing');
    const foreign = await listClients(db, {
      scope: {
        userId: 'x',
        orgWide: true,
        outletIds: [],
        assignedClientIds: [],
      },
      orgId: other.id,
    });
    expect(foreign.some((i) => i.name === 'Secret Other Client')).toBe(true);
    expect(foreign.some((i) => i.name === 'Adnan (Demo)')).toBe(false);
  });

  it('tenant registry returns the seeded org manifest by orgId', async () => {
    const fromDb = await getManifestForOrg(db, orgId);
    expect(fromDb.slug).toBe('pilot');
    expect(fromDb.branding.appName).toBe(manifest.branding.appName);
  });

  it('public config resolves by slug from the registry', async () => {
    const res = await app.request('/v1/config/public?slug=pilot');
    expect(res.status).toBe(200);
    const body = (await res.json()) as { appName: string };
    expect(body.appName).toBe(manifest.branding.appName);
  });
});
