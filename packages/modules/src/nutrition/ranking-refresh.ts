import { and, desc, eq, gte, inArray } from 'drizzle-orm';
import { DateTime } from 'luxon';
import { aggregateRankings, RANKING, type RankingSignal } from '@gymos/core/nutrition';
import { nowIso, schema as s, type Db } from '@gymos/db';

type FeedbackRow = {
  kind: string;
  payload: Record<string, unknown>;
  planId: string | null;
};

/** Build ranking signals from recent ai_feedback_events (+ plan foods for publish). */
export const collectRankingSignals = async (db: Db): Promise<RankingSignal[]> => {
  const since = DateTime.utc().minus({ days: RANKING.windowDays }).toISO()!;

  const events = await db
    .select({
      kind: s.aiFeedbackEvents.kind,
      payload: s.aiFeedbackEvents.payload,
      planId: s.aiFeedbackEvents.planId,
    })
    .from(s.aiFeedbackEvents)
    .where(gte(s.aiFeedbackEvents.createdAt, since));

  const planIds = [
    ...new Set(events.map((e) => e.planId).filter((id): id is string => typeof id === 'string')),
  ];
  const planMeta = new Map<string, { goal: string; clientId: string }>();
  if (planIds.length > 0) {
    const plans = await db
      .select({
        id: s.mealPlans.id,
        clientId: s.mealPlans.clientId,
      })
      .from(s.mealPlans)
      .where(inArray(s.mealPlans.id, planIds));
    for (const plan of plans) {
      const [goal] = await db
        .select({ preset: s.clientGoals.preset })
        .from(s.clientGoals)
        .where(and(eq(s.clientGoals.clientId, plan.clientId), eq(s.clientGoals.status, 'ACTIVE')))
        .orderBy(desc(s.clientGoals.createdAt))
        .limit(1);
      planMeta.set(plan.id, { clientId: plan.clientId, goal: goal?.preset ?? 'MAINTAIN' });
    }
  }

  const signals: RankingSignal[] = [];
  for (const event of events as FeedbackRow[]) {
    if (event.planId === null) continue;
    const meta = planMeta.get(event.planId);
    const goal = meta?.goal ?? 'MAINTAIN';

    if (event.kind === 'SWAP') {
      const from = event.payload.from;
      const to = event.payload.to;
      const slot = typeof event.payload.slot === 'string' ? event.payload.slot : 'lunch';
      if (typeof from === 'string') {
        signals.push({ foodId: from, slot, goal, kind: 'SWAP_AWAY' });
      }
      if (typeof to === 'string') {
        signals.push({ foodId: to, slot, goal, kind: 'SWAP_TOWARD' });
      }
    } else if (event.kind === 'PUBLISH_UNCHANGED') {
      const foods = event.payload.foods;
      if (Array.isArray(foods)) {
        for (const entry of foods) {
          if (
            entry &&
            typeof entry === 'object' &&
            'foodId' in entry &&
            'slot' in entry &&
            typeof (entry as { foodId: unknown }).foodId === 'string' &&
            typeof (entry as { slot: unknown }).slot === 'string'
          ) {
            signals.push({
              foodId: (entry as { foodId: string }).foodId,
              slot: (entry as { slot: string }).slot,
              goal,
              kind: 'PUBLISH_UNCHANGED',
            });
          }
        }
      }
    } else if (event.kind === 'EDIT' && event.payload.op === 'remove') {
      const foodId = event.payload.foodId;
      const slot = typeof event.payload.slot === 'string' ? event.payload.slot : 'lunch';
      if (typeof foodId === 'string') {
        signals.push({ foodId, slot, goal, kind: 'EDIT_REMOVE' });
      }
    } else if (event.kind === 'ADJUSTMENT_ACCEPTED') {
      const foods = event.payload.foods;
      if (Array.isArray(foods)) {
        for (const entry of foods) {
          if (
            entry &&
            typeof entry === 'object' &&
            typeof (entry as { foodId?: unknown }).foodId === 'string' &&
            typeof (entry as { slot?: unknown }).slot === 'string'
          ) {
            signals.push({
              foodId: (entry as { foodId: string }).foodId,
              slot: (entry as { slot: string }).slot,
              goal,
              kind: 'ADJUSTMENT_ACCEPTED',
            });
          }
        }
      }
    }
  }
  return signals;
};

/** Nightly upsert into food_rankings from feedback signals. */
export const refreshFoodRankings = async (db: Db): Promise<number> => {
  const signals = await collectRankingSignals(db);
  const rows = aggregateRankings(signals);
  const computedAt = nowIso();
  for (const row of rows) {
    await db
      .insert(s.foodRankings)
      .values({
        foodId: row.foodId,
        slot: row.slot as 'breakfast' | 'lunch' | 'dinner' | 'snack',
        goal: row.goal,
        score: row.score,
        samples: row.samples,
        computedAt,
      })
      .onConflictDoUpdate({
        target: [s.foodRankings.foodId, s.foodRankings.slot, s.foodRankings.goal],
        set: {
          score: row.score,
          samples: row.samples,
          computedAt,
        },
      });
  }
  return rows.length;
};
