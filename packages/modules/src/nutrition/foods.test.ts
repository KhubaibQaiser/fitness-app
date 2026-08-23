import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { PGlite } from '@electric-sql/pglite';
import { eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/pglite';
import { migrate } from 'drizzle-orm/pglite/migrator';
import { beforeAll, describe, expect, it } from 'vitest';
import { schema as s, seed, type Db } from '@gymos/db';
import { tenantManifestSchema } from '../tenancy';
import { candidatesForRestrictions } from './foods';

const migrationsFolder = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../../../db/migrations',
);

let db: Db;
let chickenId: string;
let daalId: string;
let eggId: string;

const manifest = tenantManifestSchema.parse({
  version: 1,
  slug: 'foods-test',
  name: 'Foods Test',
  branding: { appName: 'Test', colors: { primary: '#000000', accent: '#000000' } },
  locales: { default: 'en', enabled: ['en'] },
  currency: 'PKR',
  units: 'metric',
  aiConfig: {},
});

beforeAll(async () => {
  const client = new PGlite();
  const pglite = drizzle(client, { schema: s });
  await migrate(pglite, { migrationsFolder });
  db = pglite as unknown as Db;
  await seed(db, {});

  const [chicken] = await db
    .select({ id: s.foods.id })
    .from(s.foods)
    .where(eq(s.foods.name, 'Chicken breast (skinless, cooked)'))
    .limit(1);
  const [daal] = await db
    .select({ id: s.foods.id })
    .from(s.foods)
    .where(eq(s.foods.name, 'Daal masoor (cooked)'))
    .limit(1);
  const [egg] = await db
    .select({ id: s.foods.id })
    .from(s.foods)
    .where(eq(s.foods.name, 'Egg (whole, boiled)'))
    .limit(1);
  if (!chicken || !daal || !egg) throw new Error('seed fixture missing an expected food');
  chickenId = chicken.id;
  daalId = daal.id;
  eggId = egg.id;
});

describe('D6 smoke test — candidatesForRestrictions positive preferences', () => {
  it('ranks a preferred food above an equivalent unpreferred one in the same group', async () => {
    const withPreference = await candidatesForRestrictions(
      db,
      [{ type: 'PREFERRED', code: `preferred:${daalId}` }],
      manifest,
    );
    const daal = withPreference.find((f) => f.id === daalId);
    const chicken = withPreference.find((f) => f.id === chickenId);
    expect(daal?.rankScore ?? 0).toBeGreaterThan(chicken?.rankScore ?? 0);
  });

  it('never lets a preference override a hard allergen exclusion for the same food', async () => {
    const result = await candidatesForRestrictions(
      db,
      [
        { type: 'ALLERGY_SEVERE', code: 'allergen:egg' },
        { type: 'PREFERRED', code: `preferred:${eggId}` },
      ],
      manifest,
    );
    expect(result.some((f) => f.id === eggId)).toBe(false); // still excluded — preference is not a bypass
  });

  it('a preference with no learned per-slot ranking still boosts the flat rankScore', async () => {
    const withPreference = await candidatesForRestrictions(
      db,
      [{ type: 'PREFERRED', code: `preferred:${chickenId}` }],
      manifest,
    );
    const withoutPreference = await candidatesForRestrictions(db, [], manifest);
    const preferredChicken = withPreference.find((f) => f.id === chickenId);
    const plainChicken = withoutPreference.find((f) => f.id === chickenId);
    expect(preferredChicken?.rankScore ?? 0).toBeGreaterThan(plainChicken?.rankScore ?? 0);
  });
});
