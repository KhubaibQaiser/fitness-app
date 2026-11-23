import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { PGlite } from '@electric-sql/pglite';
import { eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/pglite';
import { migrate } from 'drizzle-orm/pglite/migrator';
import { beforeAll, describe, expect, it } from 'vitest';
import { schema as s, seed, type Db } from '@gymos/db';
import { publishPlan } from './plans';

const migrationsFolder = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../../../db/migrations',
);

let db: Db;
let seeded: Awaited<ReturnType<typeof seed>>;

beforeAll(async () => {
  const pglite = drizzle(new PGlite(), { schema: s });
  await migrate(pglite, { migrationsFolder });
  db = pglite as unknown as Db;
  seeded = await seed(db, {});
});

describe('publishPlan', () => {
  it('refuses a NEEDS_REVIEW plan with no items and leaves its status (B2)', async () => {
    const [plan] = await db
      .insert(s.mealPlans)
      .values({
        clientId: seeded.demoClientId,
        coachId: seeded.coachId,
        outletId: seeded.outletId,
        version: 1,
        status: 'NEEDS_REVIEW',
        targets: { kcal: 2000, proteinG: 150, fatG: 70, carbsG: 200, fiberG: 30 },
      })
      .returning();
    if (!plan) throw new Error('plan insert failed');

    const result = await publishPlan(
      db,
      { userId: seeded.coachUserId, coachId: seeded.coachId },
      plan.id,
      { reviewed: true, acknowledgeDrift: true },
      { kcalTolerancePct: 5, macroTolerancePct: 10 },
    );

    expect(result).toEqual({ ok: false, error: { code: 'PLAN_EMPTY' } });
    const [after] = await db
      .select({ status: s.mealPlans.status })
      .from(s.mealPlans)
      .where(eq(s.mealPlans.id, plan.id));
    expect(after?.status).toBe('NEEDS_REVIEW');
  });
});
