import { desc, eq } from 'drizzle-orm';
import { nowIso, schema as s, toStrictIso, type Db } from '@gymos/db';

export type RecordVitalsInput = {
  recordedAt?: string | undefined;
  weightKg?: number | undefined;
  bodyFatPct?: number | undefined;
  muscleMassKg?: number | undefined;
  chestCm?: number | undefined;
  waistCm?: number | undefined;
  hipCm?: number | undefined;
  armCm?: number | undefined;
  thighCm?: number | undefined;
  restingHr?: number | undefined;
  bpSystolic?: number | undefined;
  bpDiastolic?: number | undefined;
  notes?: string | undefined;
};

export const listVitals = async (db: Db, clientId: string, limit = 200) => {
  const rows = await db
    .select()
    .from(s.vitals)
    .where(eq(s.vitals.clientId, clientId))
    .orderBy(desc(s.vitals.recordedAt))
    .limit(limit);
  // Drivers emit SQL-format timestamps; clients get strict ISO, always.
  return rows.map((row) => ({ ...row, recordedAt: toStrictIso(row.recordedAt) }));
};

export const recordVitals = async (
  db: Db,
  principal: { userId: string; outletId: string },
  clientId: string,
  input: RecordVitalsInput,
) => {
  const [row] = await db
    .insert(s.vitals)
    .values({
      clientId,
      outletId: principal.outletId,
      recordedAt: input.recordedAt ?? nowIso(),
      recordedBy: principal.userId,
      source: 'coach',
      weightKg: input.weightKg ?? null,
      bodyFatPct: input.bodyFatPct ?? null,
      muscleMassKg: input.muscleMassKg ?? null,
      chestCm: input.chestCm ?? null,
      waistCm: input.waistCm ?? null,
      hipCm: input.hipCm ?? null,
      armCm: input.armCm ?? null,
      thighCm: input.thighCm ?? null,
      restingHr: input.restingHr ?? null,
      bpSystolic: input.bpSystolic ?? null,
      bpDiastolic: input.bpDiastolic ?? null,
      notes: input.notes ?? null,
    })
    .returning();
  if (!row) throw new Error('vitals insert failed');
  return row;
};

export const latestWeightKg = async (db: Db, clientId: string): Promise<number | null> => {
  const rows = await db
    .select({ weightKg: s.vitals.weightKg, recordedAt: s.vitals.recordedAt })
    .from(s.vitals)
    .where(eq(s.vitals.clientId, clientId))
    .orderBy(desc(s.vitals.recordedAt))
    .limit(50);
  for (const row of rows) {
    if (row.weightKg !== null) return row.weightKg;
  }
  return null;
};
