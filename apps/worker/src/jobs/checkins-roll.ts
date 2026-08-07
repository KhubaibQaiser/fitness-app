import { and, eq, lt, sql } from 'drizzle-orm';
import { DateTime } from 'luxon';
import { isoDate, nowIso, schema as s, type Db } from '@gymos/db';
import { notify } from '@gymos/modules/notifications';
import { purgeStaleAiArtifacts } from '@gymos/modules/nutrition';

/**
 * Nightly roll: every ACTIVE goal must always have exactly one upcoming DUE
 * check-in (the partial unique index enforces "at most one"; this job
 * guarantees "at least one"), and overdue check-ins escalate once at +3 days.
 */
export const rollCheckIns = async (db: Db, coachUserId: string, zone: string): Promise<void> => {
  const activeGoals = await db
    .select({
      id: s.clientGoals.id,
      clientId: s.clientGoals.clientId,
      weekday: s.clientGoals.checkinWeekday,
    })
    .from(s.clientGoals)
    .where(eq(s.clientGoals.status, 'ACTIVE'));

  for (const goal of activeGoals) {
    const [due] = await db
      .select({ id: s.checkIns.id, scheduledFor: s.checkIns.scheduledFor })
      .from(s.checkIns)
      .where(and(eq(s.checkIns.goalId, goal.id), eq(s.checkIns.status, 'DUE')))
      .limit(1);

    if (!due) {
      // Schedule the next occurrence of the goal's weekday (local to the outlet).
      let next = DateTime.now().setZone(zone).plus({ days: 1 });
      while (next.weekday % 7 !== goal.weekday) next = next.plus({ days: 1 });
      await db.insert(s.checkIns).values({
        clientId: goal.clientId,
        goalId: goal.id,
        scheduledFor: isoDate(next),
        status: 'DUE',
      });
      continue;
    }

    // Escalate overdue check-ins (once — dedupe on an existing OVERDUE notification today).
    const overdueDays = Math.floor(
      DateTime.now().setZone(zone).diff(DateTime.fromISO(due.scheduledFor), 'days').days,
    );
    if (overdueDays >= 3) {
      const [client] = await db
        .select({ name: s.clients.name })
        .from(s.clients)
        .where(eq(s.clients.id, goal.clientId))
        .limit(1);
      const [already] = await db
        .select({ id: s.notifications.id })
        .from(s.notifications)
        .where(
          and(
            eq(s.notifications.type, 'CHECKIN_OVERDUE'),
            sql`${s.notifications.payload}->>'checkInId' = ${due.id}`,
          ),
        )
        .limit(1);
      if (!already) {
        await notify(db, {
          recipientUserId: coachUserId,
          type: 'CHECKIN_OVERDUE',
          priority: 'HIGH',
          payload: {
            checkInId: due.id,
            clientId: goal.clientId,
            clientName: client?.name,
            overdueDays,
          },
          deepLink: `/clients/${goal.clientId}/check-in`,
        });
      }
    }
  }
};

/** Refresh the attention read model from current DUE/overdue state. */
export const refreshAttention = async (db: Db, zone: string): Promise<void> => {
  const dueRows = await db
    .select({ clientId: s.checkIns.clientId, scheduledFor: s.checkIns.scheduledFor })
    .from(s.checkIns)
    .where(eq(s.checkIns.status, 'DUE'));

  const today = DateTime.now().setZone(zone);
  for (const row of dueRows) {
    const overdue = today.diff(DateTime.fromISO(row.scheduledFor), 'days').days >= 1;
    const dueToday = today.toISODate() === row.scheduledFor;
    if (!overdue && !dueToday) continue;
    const reason = overdue
      ? { code: 'CHECKIN_OVERDUE', weight: 80, since: nowIso() }
      : { code: 'CHECKIN_DUE', weight: 60, since: nowIso() };
    await db
      .insert(s.clientAttention)
      .values({
        clientId: row.clientId,
        score: reason.weight,
        reasons: [reason],
        computedAt: nowIso(),
      })
      .onConflictDoUpdate({
        target: s.clientAttention.clientId,
        set: { score: reason.weight, reasons: [reason], computedAt: nowIso() },
      });
  }
};

/** Housekeeping: expired idempotency keys + old gate telemetry + AI retention. */
export const cleanupExpired = async (db: Db): Promise<void> => {
  await db.delete(s.idempotencyKeys).where(lt(s.idempotencyKeys.expiresAt, nowIso()));
  await db
    .delete(s.accessGateAttempts)
    .where(lt(s.accessGateAttempts.createdAt, isoDate(DateTime.utc().minus({ days: 30 }))));
  await purgeStaleAiArtifacts(db, 90);
};
