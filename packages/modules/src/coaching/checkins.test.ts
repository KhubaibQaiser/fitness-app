import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { PGlite } from '@electric-sql/pglite';
import { and, count, eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/pglite';
import { migrate } from 'drizzle-orm/pglite/migrator';
import { beforeAll, describe, expect, it } from 'vitest';
import { nowIso, schema as s, seed, type Db, type SeedResult } from '@gymos/db';
import { completeCheckIn, listCheckIns, updateAndRerunCheckIn } from './checkins';
import { createClient } from './clients';
import { createGoal } from './goals';
import { recordVitals } from './vitals';

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

describe('adaptive engine data sufficiency', () => {
  const principal = () => ({
    userId: seeded.coachUserId,
    coachId: seeded.coachId,
    outletId: seeded.outletId,
  });

  it('dates catch-up check-ins by scheduled week so later weeks are not INSUFFICIENT_DATA', async () => {
    const client = await createClient(db, principal(), {
      name: 'Catch-up Client',
      sex: 'M',
      dob: '1994-05-01',
      heightCm: 178,
      activityLevel: 1.55,
    });
    await recordVitals(db, principal(), client.id, { weightKg: 90 });
    const goal = await createGoal(db, principal(), client.id, {
      preset: 'LOSE',
      rate: 'CONSERVATIVE',
      startWeightKg: 90,
      targetWeightKg: 82,
    });
    expect(goal.ok).toBe(true);

    const types: string[] = [];
    for (let week = 0; week < 5; week += 1) {
      const result = await completeCheckIn(db, principal(), client.id, {
        vitals: { weightKg: 90 - week * 0.4 },
        adherenceRating: 4,
      });
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      types.push(result.value.verdict.type);
    }

    const later = types.slice(2);
    expect(later.length).toBeGreaterThan(0);
    for (const type of later) {
      expect(type).not.toBe('INSUFFICIENT_DATA');
    }
  });

  it('re-running every seeded completed check-in keeps later weeks off INSUFFICIENT_DATA', async () => {
    const completed = await db
      .select()
      .from(s.checkIns)
      .where(and(eq(s.checkIns.clientId, seeded.demoClientId), eq(s.checkIns.status, 'COMPLETED')))
      .orderBy(s.checkIns.scheduledFor);

    const verdicts: { scheduledFor: string; type: string; reasons: readonly string[] }[] = [];
    for (const row of completed) {
      const result = await updateAndRerunCheckIn(db, principal(), row.id, {});
      expect(result.ok).toBe(true);
      if (!result.ok) continue;
      verdicts.push({
        scheduledFor: row.scheduledFor,
        type: result.value.verdict.type,
        reasons: result.value.verdict.reasons,
      });
    }

    const later = verdicts.slice(2);
    expect(later.length).toBeGreaterThan(0);
    for (const row of later) {
      expect(row.type, JSON.stringify(row)).not.toBe('INSUFFICIENT_DATA');
    }
  });

  it('does not return INSUFFICIENT_DATA for the seeded client due check-in', async () => {
    const result = await completeCheckIn(db, principal(), seeded.demoClientId, {
      vitals: { weightKg: 84.0 },
      adherenceRating: 4,
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.verdict.type, JSON.stringify(result.value.verdict)).not.toBe(
      'INSUFFICIENT_DATA',
    );
  });
});
