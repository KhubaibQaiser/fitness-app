import { clampToSafeKcal } from './floors';
import { FIBER_G_PER_1000_KCAL, KCAL_PER_G, KCAL_PER_KG } from './layer1';
import { type GoalPreset, type GoalRate, type MacroTargets, type Sex } from './types';

/**
 * Adaptive progress engine — the deterministic heart of weekly check-ins.
 * Compares the smoothed weight trend against the goal's expected rate and
 * produces a typed, auditable recommendation. LLMs narrate this output;
 * they never compute it. All constants are exported for tests and tuning.
 */
export const ADAPTIVE = {
  /** EMA smoothing factor for trend weight (kills water-weight noise). */
  emaAlpha: 0.25,
  /** Analysis window in days. */
  windowDays: 21,
  /** Minimum weigh-ins and minimum span before we trust a verdict. */
  minWeighIns: 4,
  minSpanDays: 10,
  /** |actual − expected| below this (kg/week) counts as on-track. */
  holdBandKgPerWeek: 0.15,
  /** Mean adherence below this → fix adherence, not targets. */
  adherenceFocusBelow: 3.5,
  /** Fraction of the observed energy gap applied per adjustment (damping). */
  dampingFactor: 0.5,
  /** Max kcal/day moved in a single adjustment step. */
  maxStepKcalPerDay: 200,
  /** Plateau: trend moved less than this fraction of body weight over the window. */
  plateauFractionOfBw: 0.002,
  /** Plateau requires at least this adherence. */
  plateauMinAdherence: 4,
  /** Red flag: sustained loss faster than this % of body weight per week. */
  rapidLossPctPerWeek: 1.5,
  /** Red flag: resting HR this many bpm above baseline. */
  rhrSpikeBpm: 15,
  /** Red flags: blood pressure thresholds. */
  bpCrisisSystolic: 180,
  bpCrisisDiastolic: 120,
  bpElevatedSystolic: 140,
  bpElevatedDiastolic: 90,
  fatGPerKgMin: 0.8,
} as const;

export type WeighIn = { readonly t: number; readonly weightKg: number };

export type AdaptiveInput = {
  readonly sex: Sex;
  readonly weightKg: number;
  readonly goal: {
    readonly preset: GoalPreset;
    readonly rate: GoalRate;
    readonly expectedWeeklyDeltaKg: number;
  };
  readonly currentTargets: MacroTargets;
  readonly tdeeEstimate: number;
  readonly weighIns: readonly WeighIn[];
  readonly adherenceRatings: readonly number[];
  readonly hasMedicalFlags: boolean;
  readonly vitals?: {
    readonly bpSystolic?: number;
    readonly bpDiastolic?: number;
    readonly restingHr?: number;
    readonly baselineRestingHr?: number;
  };
  readonly now: number;
};

export type RedFlag = 'BP_CRISIS' | 'BP_ELEVATED_WITH_MEDICAL' | 'RHR_SPIKE' | 'RAPID_LOSS';

type VerdictBase = {
  readonly actualWeeklyDeltaKg: number;
  readonly expectedWeeklyDeltaKg: number;
  readonly observedTdeeEstimate: number;
  readonly confidence: number;
  readonly reasons: readonly string[];
};

export type AdjustmentRecommendation =
  | {
      readonly type: 'INSUFFICIENT_DATA';
      readonly reasons: readonly string[];
      readonly confidence: number;
    }
  | ({ readonly type: 'REFER_REVIEW'; readonly flags: readonly RedFlag[] } & VerdictBase)
  | ({ readonly type: 'HOLD' } & VerdictBase)
  | ({ readonly type: 'ADHERENCE_FOCUS'; readonly meanAdherence: number } & VerdictBase)
  | ({ readonly type: 'PLATEAU_PROTOCOL' } & VerdictBase)
  | ({
      readonly type: 'ADJUST_TARGETS';
      readonly deltaKcalPerDay: number;
      readonly newTargets: MacroTargets;
      readonly clampedBySafety: boolean;
    } & VerdictBase);

const MS_PER_DAY = 86_400_000;

/** Exponential moving average over chronologically sorted weigh-ins. */
export const trendWeights = (weighIns: readonly WeighIn[], alpha: number): WeighIn[] => {
  const sorted = [...weighIns].sort((a, b) => a.t - b.t);
  const out: WeighIn[] = [];
  let ema: number | undefined;
  for (const w of sorted) {
    ema = ema === undefined ? w.weightKg : alpha * w.weightKg + (1 - alpha) * ema;
    out.push({ t: w.t, weightKg: ema });
  }
  return out;
};

/** Least-squares slope over trend points, expressed as kg per week. */
export const weeklySlope = (trend: readonly WeighIn[]): number => {
  const first = trend.at(0);
  if (first === undefined || trend.length < 2) return 0;
  const n = trend.length;
  const dayOf = (p: WeighIn): number => (p.t - first.t) / MS_PER_DAY;
  const meanX = trend.reduce((sum, p) => sum + dayOf(p), 0) / n;
  const meanY = trend.reduce((sum, p) => sum + p.weightKg, 0) / n;
  let num = 0;
  let den = 0;
  for (const p of trend) {
    const dx = dayOf(p) - meanX;
    num += dx * (p.weightKg - meanY);
    den += dx * dx;
  }
  if (den === 0) return 0;
  return (num / den) * 7;
};

/** Net absolute movement of the trend across the window (0 for empty input). */
export const netTrendChangeKg = (trend: readonly WeighIn[]): number => {
  const first = trend.at(0);
  const last = trend.at(-1);
  return first !== undefined && last !== undefined ? Math.abs(last.weightKg - first.weightKg) : 0;
};

const round2 = (v: number): number => Number(v.toFixed(2));

const mean = (values: readonly number[]): number =>
  values.reduce((a, b) => a + b, 0) / values.length;

/** Redistribute a kcal change into macros: protein untouched, carbs first, then fat to its floor. */
export const retargetMacros = (
  current: MacroTargets,
  newKcal: number,
  weightKg: number,
): MacroTargets => {
  const proteinG = current.proteinG;
  const fatMinG = Math.round(ADAPTIVE.fatGPerKgMin * weightKg);
  let fatG = current.fatG;
  let carbsKcal = newKcal - proteinG * KCAL_PER_G.protein - fatG * KCAL_PER_G.fat;
  if (carbsKcal < 0) {
    fatG = Math.max(
      fatMinG,
      Math.floor((newKcal - proteinG * KCAL_PER_G.protein) / KCAL_PER_G.fat),
    );
    carbsKcal = Math.max(0, newKcal - proteinG * KCAL_PER_G.protein - fatG * KCAL_PER_G.fat);
  }
  return {
    kcal: newKcal,
    proteinG,
    fatG,
    carbsG: Math.round(carbsKcal / KCAL_PER_G.carbs),
    fiberG: Math.round((FIBER_G_PER_1000_KCAL * newKcal) / 1000),
  };
};

const detectRedFlags = (
  input: AdaptiveInput,
  actualWeeklyDeltaKg: number,
  spanDays: number,
): RedFlag[] => {
  const flags: RedFlag[] = [];
  const v = input.vitals;
  if (v?.bpSystolic !== undefined && v.bpDiastolic !== undefined) {
    if (v.bpSystolic >= ADAPTIVE.bpCrisisSystolic || v.bpDiastolic >= ADAPTIVE.bpCrisisDiastolic) {
      flags.push('BP_CRISIS');
    } else if (
      input.hasMedicalFlags &&
      (v.bpSystolic >= ADAPTIVE.bpElevatedSystolic || v.bpDiastolic >= ADAPTIVE.bpElevatedDiastolic)
    ) {
      flags.push('BP_ELEVATED_WITH_MEDICAL');
    }
  }
  if (
    v?.restingHr !== undefined &&
    v.baselineRestingHr !== undefined &&
    v.restingHr - v.baselineRestingHr >= ADAPTIVE.rhrSpikeBpm
  ) {
    flags.push('RHR_SPIKE');
  }
  const lossPctPerWeek = (-actualWeeklyDeltaKg / input.weightKg) * 100;
  if (spanDays >= 14 && lossPctPerWeek > ADAPTIVE.rapidLossPctPerWeek) {
    flags.push('RAPID_LOSS');
  }
  return flags;
};

const confidenceScore = (
  weighInCount: number,
  spanDays: number,
  adherenceRatings: readonly number[],
): number => {
  const dataDensity = Math.min(1, weighInCount / 8);
  const spanFactor = Math.min(1, spanDays / ADAPTIVE.windowDays);
  const adherenceFactor =
    adherenceRatings.length > 0 ? Math.min(1, mean(adherenceRatings) / 5) : 0.5;
  return round2(0.4 * dataDensity + 0.3 * spanFactor + 0.3 * adherenceFactor);
};

/**
 * The weekly verdict. Deterministic; every branch is covered by tests.
 * Order matters: data sufficiency → red flags → hold → plateau →
 * adherence gate → damped target adjustment (clamped into the safe band).
 */
export const evaluateProgress = (input: AdaptiveInput): AdjustmentRecommendation => {
  const windowStart = input.now - ADAPTIVE.windowDays * MS_PER_DAY;
  const inWindow = input.weighIns.filter((w) => w.t >= windowStart && w.t <= input.now);
  const sorted = [...inWindow].sort((a, b) => a.t - b.t);
  const first = sorted.at(0);
  const last = sorted.at(-1);
  const spanDays = first !== undefined && last !== undefined ? (last.t - first.t) / MS_PER_DAY : 0;

  const confidence = confidenceScore(sorted.length, spanDays, input.adherenceRatings);

  if (sorted.length < ADAPTIVE.minWeighIns || spanDays < ADAPTIVE.minSpanDays) {
    return {
      type: 'INSUFFICIENT_DATA',
      confidence,
      reasons: [
        `need ≥${ADAPTIVE.minWeighIns} weigh-ins over ≥${ADAPTIVE.minSpanDays} days; ` +
          `have ${sorted.length} over ${round2(spanDays)}`,
      ],
    };
  }

  const trend = trendWeights(sorted, ADAPTIVE.emaAlpha);
  const actual = round2(weeklySlope(trend));
  const expected = input.goal.expectedWeeklyDeltaKg;
  const deviation = actual - expected;
  // What the body's actual expenditure looks like given intake ≈ current target.
  const observedTdee = Math.round(input.currentTargets.kcal - (actual * KCAL_PER_KG) / 7);

  const base = {
    actualWeeklyDeltaKg: actual,
    expectedWeeklyDeltaKg: expected,
    observedTdeeEstimate: observedTdee,
    confidence,
  };

  const flags = detectRedFlags(input, actual, spanDays);
  if (flags.length > 0) {
    return {
      type: 'REFER_REVIEW',
      flags,
      ...base,
      reasons: flags.map((f) => `red flag: ${f}`),
    };
  }

  if (Math.abs(deviation) <= ADAPTIVE.holdBandKgPerWeek) {
    return {
      type: 'HOLD',
      ...base,
      reasons: [
        `on track: actual ${actual} vs expected ${expected} kg/wk (band ±${ADAPTIVE.holdBandKgPerWeek})`,
      ],
    };
  }

  const meanAdherence =
    input.adherenceRatings.length > 0 ? round2(mean(input.adherenceRatings)) : undefined;

  const trendChangeKg = netTrendChangeKg(trend);
  if (
    input.goal.preset === 'LOSE' &&
    spanDays >= ADAPTIVE.windowDays - 1 &&
    trendChangeKg < ADAPTIVE.plateauFractionOfBw * input.weightKg &&
    meanAdherence !== undefined &&
    meanAdherence >= ADAPTIVE.plateauMinAdherence
  ) {
    return {
      type: 'PLATEAU_PROTOCOL',
      ...base,
      reasons: [
        `trend moved ${round2(trendChangeKg)} kg over ${round2(spanDays)} days with adherence ${meanAdherence} — diet-break/refeed protocol suggested`,
      ],
    };
  }

  if (meanAdherence !== undefined && meanAdherence < ADAPTIVE.adherenceFocusBelow) {
    return {
      type: 'ADHERENCE_FOCUS',
      meanAdherence,
      ...base,
      reasons: [
        `off track but mean adherence ${meanAdherence} < ${ADAPTIVE.adherenceFocusBelow} — changing targets a client isn't following helps nobody`,
      ],
    };
  }

  const gapKcalPerDay = (deviation * KCAL_PER_KG) / 7;
  const step = Math.max(
    -ADAPTIVE.maxStepKcalPerDay,
    Math.min(ADAPTIVE.maxStepKcalPerDay, ADAPTIVE.dampingFactor * gapKcalPerDay),
  );
  const proposedKcal = Math.round(input.currentTargets.kcal - step);
  const safeKcal = clampToSafeKcal(proposedKcal, input.tdeeEstimate, input.sex, {
    weightKg: input.weightKg,
    kcalPerKg: KCAL_PER_KG,
  });
  const clampedBySafety = safeKcal !== proposedKcal;

  return {
    type: 'ADJUST_TARGETS',
    deltaKcalPerDay: safeKcal - input.currentTargets.kcal,
    newTargets: retargetMacros(input.currentTargets, safeKcal, input.weightKg),
    clampedBySafety,
    ...base,
    reasons: [
      `deviation ${round2(deviation)} kg/wk ⇒ energy gap ${Math.round(gapKcalPerDay)} kcal/day; ` +
        `damped step ${Math.round(step)} kcal${clampedBySafety ? ' (clamped into the safety band)' : ''}`,
    ],
  };
};
