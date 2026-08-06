import { PGlite } from '@electric-sql/pglite';
import { count, eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/pglite';
import { migrate } from 'drizzle-orm/pglite/migrator';
import { beforeAll, describe, expect, it } from 'vitest';
import { type Db } from './client';
import * as s from './schema';
import { seed, type SeedResult } from './seed';

/**
 * Schema + seed smoke test against a real (WASM) Postgres via PGlite,
 * applying the actual committed migrations — proves migrations are valid
 * and the seed produces a coherent, queryable pilot dataset.
 */
let db: Db;
let seeded: SeedResult;

beforeAll(async () => {
  const client = new PGlite();
  const pglite = drizzle(client, { schema: s });
  await migrate(pglite, { migrationsFolder: './migrations' });
  db = pglite as unknown as Db;
  seeded = await seed(db);
});

describe('migrations + seed', () => {
  it('seeds the pilot org, outlet and coach with both roles', async () => {
    const roles = await db
      .select({ role: s.memberships.role })
      .from(s.memberships)
      .where(eq(s.memberships.userId, seeded.coachUserId));
    expect(roles.map((r) => r.role).sort()).toEqual(['COACH', 'ORG_ADMIN']);
  });

  it('seeds the starter food set with serving units', async () => {
    const [foodCount] = await db.select({ n: count() }).from(s.foods);
    expect(foodCount?.n).toBeGreaterThanOrEqual(26);
    const [unitCount] = await db.select({ n: count() }).from(s.foodServingUnits);
    expect(unitCount?.n).toBeGreaterThanOrEqual(26);
  });

  it('gives the demo client 8 weeks of vitals history', async () => {
    const rows = await db
      .select({ w: s.vitals.weightKg, at: s.vitals.recordedAt })
      .from(s.vitals)
      .where(eq(s.vitals.clientId, seeded.demoClientId));
    expect(rows.length).toBe(16);
    const weights = rows.map((r) => r.w ?? 0);
    // Trend is downward ≈ −0.45 kg/week over 7.5 weeks.
    expect(Math.min(...weights)).toBeLessThan(86);
    expect(Math.max(...weights)).toBeLessThanOrEqual(88.2);
  });

  it('has one ACTIVE goal and exactly one DUE check-in for the demo client', async () => {
    const goals = await db
      .select()
      .from(s.clientGoals)
      .where(eq(s.clientGoals.clientId, seeded.demoClientId));
    expect(goals.filter((g) => g.status === 'ACTIVE')).toHaveLength(1);
    const due = await db.select().from(s.checkIns).where(eq(s.checkIns.status, 'DUE'));
    expect(due).toHaveLength(1);
  });

  it('stores the dietary profile with severe-allergy and religious codes', async () => {
    const restrictions = await db
      .select({ type: s.dietaryRestrictions.type, code: s.dietaryRestrictions.code })
      .from(s.dietaryRestrictions);
    expect(restrictions).toContainEqual({ type: 'ALLERGY_SEVERE', code: 'allergen:peanut' });
    expect(restrictions).toContainEqual({ type: 'RELIGIOUS', code: 'religious:halal' });
  });

  it('refuses to double-seed', async () => {
    await expect(seed(db)).rejects.toThrow(/already seeded/);
  });

  it('enforces the one-PUBLISHED-plan-per-client partial unique index', async () => {
    const [coach] = await db.select().from(s.coaches).limit(1);
    if (!coach) throw new Error('missing coach');
    const base = {
      clientId: seeded.demoClientId,
      coachId: coach.id,
      outletId: seeded.outletId,
      targets: { kcal: 2000, proteinG: 170, fatG: 70, carbsG: 175, fiberG: 28 },
    };
    await db.insert(s.mealPlans).values({ ...base, version: 1, status: 'PUBLISHED' });
    await expect(
      db.insert(s.mealPlans).values({ ...base, version: 2, status: 'PUBLISHED' }),
    ).rejects.toThrow();
  });
});
