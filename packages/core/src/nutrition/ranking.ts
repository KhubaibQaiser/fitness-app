/**
 * Layer-4 ranking — deterministic preference aggregation for Layer-2 rankScore.
 */

export const RANKING = {
  windowDays: 90,
  prior: 1,
  priorStrength: 4,
  minScore: 0.1,
  maxScore: 3,
  weights: {
    PUBLISH_UNCHANGED: 1,
    SWAP_AWAY: -1.5,
    SWAP_TOWARD: 1.5,
    EDIT_REMOVE: -1,
    ADJUSTMENT_ACCEPTED: 0.5,
  },
} as const;

export type RankingSignalKind =
  'PUBLISH_UNCHANGED' | 'SWAP_AWAY' | 'SWAP_TOWARD' | 'EDIT_REMOVE' | 'ADJUSTMENT_ACCEPTED';

export type RankingSignal = {
  readonly foodId: string;
  readonly slot: string;
  readonly goal: string;
  readonly kind: RankingSignalKind;
};

export type FoodRankingRow = {
  readonly foodId: string;
  readonly slot: string;
  readonly goal: string;
  readonly score: number;
  readonly samples: number;
};

const keyOf = (foodId: string, slot: string, goal: string): string => `${foodId}|${slot}|${goal}`;

const weightFor = (kind: RankingSignalKind): number => {
  switch (kind) {
    case 'PUBLISH_UNCHANGED':
      return RANKING.weights.PUBLISH_UNCHANGED;
    case 'SWAP_AWAY':
      return RANKING.weights.SWAP_AWAY;
    case 'SWAP_TOWARD':
      return RANKING.weights.SWAP_TOWARD;
    case 'EDIT_REMOVE':
      return RANKING.weights.EDIT_REMOVE;
    case 'ADJUSTMENT_ACCEPTED':
      return RANKING.weights.ADJUSTMENT_ACCEPTED;
  }
};

/** Additive Bayesian-smoothed score in [minScore, maxScore]. */
export const scoreFromSignals = (
  signals: readonly RankingSignalKind[],
): {
  score: number;
  samples: number;
} => {
  const samples = signals.length;
  const weightedSum = signals.reduce((sum, kind) => sum + weightFor(kind), 0);
  const raw = RANKING.prior + weightedSum / RANKING.priorStrength;
  const score = Math.min(RANKING.maxScore, Math.max(RANKING.minScore, Number(raw.toFixed(4))));
  return { score, samples };
};

/** Aggregate signals into food_rankings rows. */
export const aggregateRankings = (signals: readonly RankingSignal[]): FoodRankingRow[] => {
  const buckets = new Map<
    string,
    { foodId: string; slot: string; goal: string; kinds: RankingSignalKind[] }
  >();
  for (const signal of signals) {
    const key = keyOf(signal.foodId, signal.slot, signal.goal);
    const bucket = buckets.get(key) ?? {
      foodId: signal.foodId,
      slot: signal.slot,
      goal: signal.goal,
      kinds: [],
    };
    bucket.kinds.push(signal.kind);
    buckets.set(key, bucket);
  }
  return [...buckets.values()].map((bucket) => {
    const { score, samples } = scoreFromSignals(bucket.kinds);
    return {
      foodId: bucket.foodId,
      slot: bucket.slot,
      goal: bucket.goal,
      score,
      samples,
    };
  });
};
