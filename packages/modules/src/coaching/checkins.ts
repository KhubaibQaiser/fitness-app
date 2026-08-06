import { and, desc, eq } from 'drizzle-orm';
import { DateTime } from 'luxon';
import { err, ok, type Result } from '@gymos/core';
import {
  evaluateProgress,
  type AdjustmentRecommendation,
  type WeighIn,
} from '@gymos/core/nutrition';
import { isoDate, nowIso, schema as s, type Db } from '@gymos/db';
import { hasMedicalFlags } from '@gymos/db/schema';
import { notify } from '../notifications';
import { writeAudit } from '../shared/audit';
import { recordVitals, type RecordVitalsInput } from './vitals';

export type CompleteCheckInInput = {
  vitals?: RecordVitalsInput | undefined;
  adherenceRating?: 1 | 2 | 3 | 4 | 5 | undefined;
  coachNotes?: string | undefined;
};

export type CheckInError =
  { code: 'NO_DUE_CHECKIN' } | { code: 'NO_ACTIVE_GOAL' } | { code: 'CLIENT_NOT_FOUND' };

export type CompletedCheckIn = {
  checkInId: string;
  verdict: AdjustmentRecommendation;
  vitalsId: string | null;
};

export const completeCheckIn = async (
  db: Db,
  principal: { userId: string; coachId: string; outletId: string },
  clientId: string,
  input: CompleteCheckInInput,
): Promise<Result<CompletedCheckIn, CheckInError>> => {
  const [client] = await db.select().from(s.clients).where(eq(s.clients.id, clientId)).limit(1);
  if (!client) return err({ code: 'CLIENT_NOT_FOUND' });

  const [due] = await db
    .select()
    .from(s.checkIns)
    .where(and(eq(s.checkIns.clientId, clientId), eq(s.checkIns.status, 'DUE')))
    .orderBy(s.checkIns.scheduledFor)
    .limit(1);
  if (!due) return err({ code: 'NO_DUE_CHECKIN' });

  const [goal] = await db
    .select()
    .from(s.clientGoals)
    .where(and(eq(s.clientGoals.id, due.goalId), eq(s.clientGoals.status, 'ACTIVE')))
    .limit(1);
  if (!goal) return err({ code: 'NO_ACTIVE_GOAL' });

  // 1. Record the new vitals (if provided) so they join the analysis window.
  let vitalsId: string | null = null;
  if (input.vitals) {
    const row = await recordVitals(db, principal, clientId, input.vitals);
    vitalsId = row.id;
  }

  // 2. Assemble the adaptive-engine input.
  const history = await db
    .select({
      recordedAt: s.vitals.recordedAt,
      weightKg: s.vitals.weightKg,
      restingHr: s.vitals.restingHr,
    })
    .from(s.vitals)
    .where(eq(s.vitals.clientId, clientId))
    .orderBy(s.vitals.recordedAt);

  const weighIns: WeighIn[] = history.flatMap((v) =>
    v.weightKg === null
      ? []
      : [{ t: DateTime.fromISO(v.recordedAt).toMillis(), weightKg: v.weightKg }],
  );
  const baselineRestingHr = history.find((v) => v.restingHr !== null)?.restingHr ?? undefined;

  const pastRatings = await db
    .select({ rating: s.checkIns.adherenceRating })
    .from(s.checkIns)
    .where(and(eq(s.checkIns.clientId, clientId), eq(s.checkIns.status, 'COMPLETED')))
    .orderBy(desc(s.checkIns.scheduledFor))
    .limit(3);
  const adherenceRatings = [
    ...(input.adherenceRating !== undefined ? [input.adherenceRating] : []),
    ...pastRatings.flatMap((r) => (r.rating === null ? [] : [r.rating])),
  ];

  const [publishedPlan] = await db
    .select({ targets: s.mealPlans.targets })
    .from(s.mealPlans)
    .where(and(eq(s.mealPlans.clientId, clientId), eq(s.mealPlans.status, 'PUBLISHED')))
    .limit(1);
  const currentTargets = publishedPlan?.targets ??
    goal.initialTargets ?? { kcal: 2000, proteinG: 150, fatG: 65, carbsG: 180, fiberG: 28 };

  const latestWeight = [...weighIns].sort((a, b) => b.t - a.t)[0]?.weightKg ?? goal.startWeightKg;

  const verdict = evaluateProgress({
    sex: client.sex,
    weightKg: latestWeight,
    goal: {
      preset: goal.preset,
      rate: goal.rate,
      expectedWeeklyDeltaKg: goal.expectedWeeklyDeltaKg,
    },
    currentTargets,
    tdeeEstimate: goal.tdeeEstimate ?? Math.round(currentTargets.kcal * 1.2),
    weighIns,
    adherenceRatings,
    hasMedicalFlags: hasMedicalFlags(client.medicalFlags),
    ...(input.vitals?.bpSystolic !== undefined || input.vitals?.restingHr !== undefined
      ? {
          vitals: {
            ...(input.vitals.bpSystolic !== undefined
              ? { bpSystolic: input.vitals.bpSystolic }
              : {}),
            ...(input.vitals.bpDiastolic !== undefined
              ? { bpDiastolic: input.vitals.bpDiastolic }
              : {}),
            ...(input.vitals.restingHr !== undefined ? { restingHr: input.vitals.restingHr } : {}),
            ...(baselineRestingHr !== undefined ? { baselineRestingHr } : {}),
          },
        }
      : {}),
    now: DateTime.utc().toMillis(),
  });

  // 3. Persist: complete this check-in, schedule the next one.
  await db.transaction(async (tx) => {
    await tx
      .update(s.checkIns)
      .set({
        completedAt: nowIso(),
        vitalsId,
        adherenceRating: input.adherenceRating ?? null,
        coachNotes: input.coachNotes ?? null,
        engineOutput: verdict,
        status: 'COMPLETED',
      })
      .where(eq(s.checkIns.id, due.id));

    const nextDate = DateTime.fromISO(due.scheduledFor).plus({ weeks: 1 });
    await tx.insert(s.checkIns).values({
      clientId,
      goalId: goal.id,
      scheduledFor: isoDate(nextDate),
      status: 'DUE',
    });

    // Attention: check-in handled; flag off-track/red-flag states instead.
    const reasons =
      verdict.type === 'REFER_REVIEW'
        ? [{ code: 'RED_FLAG', weight: 100, since: nowIso() }]
        : verdict.type === 'ADJUST_TARGETS' || verdict.type === 'ADHERENCE_FOCUS'
          ? [{ code: 'OFF_TRACK', weight: 60, since: nowIso() }]
          : [];
    await tx
      .insert(s.clientAttention)
      .values({
        clientId,
        score: reasons[0]?.weight ?? 0,
        reasons,
        computedAt: nowIso(),
      })
      .onConflictDoUpdate({
        target: s.clientAttention.clientId,
        set: { score: reasons[0]?.weight ?? 0, reasons, computedAt: nowIso() },
      });

    await writeAudit(tx, {
      actorUserId: principal.userId,
      actorRole: 'COACH',
      action: 'checkin.complete',
      resourceType: 'check_in',
      resourceId: due.id,
      after: { verdict: verdict.type },
    });
  });

  if (verdict.type === 'REFER_REVIEW') {
    await notify(db, {
      recipientUserId: principal.userId,
      type: 'RED_FLAG',
      priority: 'HIGH',
      payload: { clientId, clientName: client.name, flags: verdict.flags },
      deepLink: `/clients/${clientId}`,
    });
  } else if (verdict.type === 'ADJUST_TARGETS' || verdict.type === 'ADHERENCE_FOCUS') {
    await notify(db, {
      recipientUserId: principal.userId,
      type: 'OFF_TRACK',
      payload: { clientId, clientName: client.name, verdict: verdict.type },
      deepLink: `/clients/${clientId}`,
    });
  }

  return ok({ checkInId: due.id, verdict, vitalsId });
};

export const listCheckIns = async (db: Db, clientId: string, limit = 50) =>
  db
    .select()
    .from(s.checkIns)
    .where(eq(s.checkIns.clientId, clientId))
    .orderBy(desc(s.checkIns.scheduledFor))
    .limit(limit);

export const getCheckIn = async (db: Db, checkInId: string) => {
  const [row] = await db.select().from(s.checkIns).where(eq(s.checkIns.id, checkInId)).limit(1);
  return row ?? null;
};
