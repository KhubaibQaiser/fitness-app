import { readFileSync } from 'node:fs';
import { eq } from 'drizzle-orm';
import { schema as s, type Db } from '@gymos/db';
import { tenantManifestSchema, type TenantManifest } from './manifest';

/**
 * Per-org manifest registry. Replaces the single process-global file cache so
 * multiple gym chains can each have their own branding/locale/AI config.
 *
 * See docs/adr/0004-tenant-config-registry.md.
 */

const byOrgId = new Map<string, { manifest: TenantManifest; at: number }>();
const CACHE_TTL_MS = 60_000;

/** Test seam — clears the short TTL cache between cases. */
export const resetRegistryCache = (): void => {
  byOrgId.clear();
};

export const upsertTenantConfig = async (
  db: Db,
  input: { orgId: string; slug: string; manifest: TenantManifest },
): Promise<void> => {
  const parsed = tenantManifestSchema.parse(input.manifest);
  await db
    .insert(s.tenantConfigs)
    .values({
      orgId: input.orgId,
      slug: input.slug,
      manifest: parsed as Record<string, unknown>,
    })
    .onConflictDoUpdate({
      target: s.tenantConfigs.orgId,
      set: {
        slug: input.slug,
        manifest: parsed,
      },
    });
  byOrgId.set(input.orgId, { manifest: parsed, at: Date.now() });
};

export const getManifestForOrg = async (db: Db, orgId: string): Promise<TenantManifest> => {
  const cached = byOrgId.get(orgId);
  if (cached !== undefined && Date.now() - cached.at < CACHE_TTL_MS) {
    return cached.manifest;
  }
  const [row] = await db
    .select({ manifest: s.tenantConfigs.manifest })
    .from(s.tenantConfigs)
    .where(eq(s.tenantConfigs.orgId, orgId))
    .limit(1);
  if (!row) {
    throw new Error(`tenant config missing for org ${orgId} — seed the registry`);
  }
  const manifest = tenantManifestSchema.parse(row.manifest);
  byOrgId.set(orgId, { manifest, at: Date.now() });
  return manifest;
};

export const getManifestBySlug = async (db: Db, slug: string): Promise<TenantManifest | null> => {
  const [row] = await db
    .select({ orgId: s.tenantConfigs.orgId, manifest: s.tenantConfigs.manifest })
    .from(s.tenantConfigs)
    .where(eq(s.tenantConfigs.slug, slug))
    .limit(1);
  if (!row) return null;
  const manifest = tenantManifestSchema.parse(row.manifest);
  byOrgId.set(row.orgId, { manifest, at: Date.now() });
  return manifest;
};

/** Bootstrap helper: parse a committed JSON file (used by seed / API cold start). */
export const readManifestFile = (path: string): TenantManifest => {
  const raw: unknown = JSON.parse(readFileSync(path, 'utf8'));
  return tenantManifestSchema.parse(raw);
};

/**
 * Ensure the registry has a row for `orgId` from a committed manifest file.
 * Idempotent upsert — used by API cold start so already-seeded DBs pick up the
 * registry without a full re-seed.
 */
export const syncTenantConfigFromFile = async (
  db: Db,
  orgId: string,
  path: string,
): Promise<TenantManifest> => {
  const manifest = readManifestFile(path);
  await upsertTenantConfig(db, { orgId, slug: manifest.slug, manifest });
  return manifest;
};

/**
 * Pilot / single-org cold start: if exactly one organization exists and has no
 * registry row yet, upsert from the file. Multi-org DBs are left alone.
 */
export const syncSingleOrgRegistryFromFile = async (
  db: Db,
  path: string,
): Promise<TenantManifest | null> => {
  const orgs = await db.select({ id: s.organizations.id }).from(s.organizations).limit(2);
  if (orgs.length !== 1 || orgs[0] === undefined) return null;
  const orgId = orgs[0].id;
  const [existing] = await db
    .select({ orgId: s.tenantConfigs.orgId })
    .from(s.tenantConfigs)
    .where(eq(s.tenantConfigs.orgId, orgId))
    .limit(1);
  if (existing) return getManifestForOrg(db, orgId);
  return syncTenantConfigFromFile(db, orgId, path);
};
