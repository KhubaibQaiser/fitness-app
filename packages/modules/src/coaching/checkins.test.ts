import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { PGlite } from '@electric-sql/pglite';
import { and, count, eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/pglite';
import { migrate } from 'drizzle-orm/pglite/migrator';
import { beforeAll, describe, expect, it } from 'vitest';
import { nowIso, schema as s, seed, type Db, type SeedResult } from '@gymos/db';
import { listCheckIns, updateAndRerunCheckIn } from './checkins';

const migrationsFolder = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../../../db/migrations',
);

let db: Db;
let seeded: SeedResult;
let completedId: string;
let dueId: string;

beforeAll(async () => {
  const client = new PGlite();
  const pglite = drizzle(client, { schema: s });
  await migrate(pglite, { migrationsFolder });
  db = pglite as unknown as Db;
  seeded = await seed(db);

  const completed = await db
    .select()
    .from(s.checkIns)
    .where(and(eq(s.checkIns.clientId, seeded.demoClientId), eq(s.checkIns.status, 'COMPLETED')))
    .limit(1);
  const due = await db
    .select()
    .from(s.checkIns)
    .where(and(eq(s.checkIns.clientId, seeded.demoClientId), eq(s.checkIns.status, 'DUE')))
    .limit(1);

  const firstCompleted = completed[0];
  const firstDue = due[0];
  if (!firstCompleted || !firstDue) throw new Error('seed missing check-ins');
  completedId = firstCompleted.id;
  dueId = firstDue.id;
}, 60_000);

describe('updateAndRerunCheckIn', () => {
  const principal = () => ({
    userId: seeded.coachUserId,
    coachId: seeded.coachId,
    outletId: seeded.outletId,
  });

  it('rejects non-COMPLETED check-ins', async () => {
    const result = await updateAndRerunCheckIn(db, principal(), dueId, {
      adherenceRating: 4,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('NOT_COMPLETED');
  });

  it('updates engine output without inserting a new DUE', async () => {
    const [beforeDue] = await db
      .select({ n: count() })
      .from(s.checkIns)
      .where(and(eq(s.checkIns.clientId, seeded.demoClientId), eq(s.checkIns.status, 'DUE')));

    const result = await updateAndRerunCheckIn(db, principal(), completedId, {
      vitals: { weightKg: 84.5 },
      adherenceRating: 5,
      coachNotes: 'Re-run smoke test',
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.value.checkInId).toBe(completedId);
    expect(result.value.verdict.type).toBeTruthy();

    const [row] = await db.select().from(s.checkIns).where(eq(s.checkIns.id, completedId));
    expect(row?.coachNotes).toBe('Re-run smoke test');
    expect(row?.adherenceRating).toBe(5);
    expect(row?.status).toBe('COMPLETED');
    expect((row?.engineOutput as { type?: string } | null)?.type).toBe(result.value.verdict.type);

    const [afterDue] = await db
      .select({ n: count() })
      .from(s.checkIns)
      .where(and(eq(s.checkIns.clientId, seeded.demoClientId), eq(s.checkIns.status, 'DUE')));
    expect(afterDue?.n).toBe(beforeDue?.n);
  });
});

describe('listCheckIns', () => {
  it('returns linked weightKg for completed check-ins and null when unlinked', async () => {
    const [vital] = await db
      .insert(s.vitals)
      .values({
        clientId: seeded.demoClientId,
        outletId: seeded.outletId,
        recordedAt: nowIso(),
        recordedBy: seeded.coachUserId,
        source: 'coach',
        weightKg: 83.25,
      })
      .returning();
    if (!vital) throw new Error('vitals insert failed');

    await db.update(s.checkIns).set({ vitalsId: vital.id }).where(eq(s.checkIns.id, completedId));

    const items = await listCheckIns(db, seeded.demoClientId);
    const linked = items.find((row) => row.id === completedId);
    const due = items.find((row) => row.id === dueId);
    const unlinkedCompleted = items.find(
      (row) => row.status === 'COMPLETED' && row.id !== completedId,
    );

    expect(linked?.weightKg).toBe(83.25);
    expect(linked?.vitalsId).toBe(vital.id);
    expect(due?.status).toBe('DUE');
    expect(due?.weightKg).toBeNull();
    expect(due?.vitalsId).toBeNull();
    expect(unlinkedCompleted?.weightKg).toBeNull();
  });
});
