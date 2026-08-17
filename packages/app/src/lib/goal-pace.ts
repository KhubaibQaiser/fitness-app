import type { PublicConfig } from '@gymos/contracts';
import {
  resolvePaceEnergy,
  resolveWeeklyDeltaKg,
  type GoalPreset,
  type GoalRate,
  type Sex,
} from '@gymos/core/nutrition';

export const weeklyDeltaKgFromPublicConfig = (
  config: PublicConfig | undefined,
  preset: GoalPreset,
  rate: GoalRate,
): number | undefined => resolveWeeklyDeltaKg(config?.nutrition?.weeklyDeltaKg, preset, rate);

/** Target kcal from TDEE: tenant kg/week is intent only; result is always clamped. */
export const targetKcalFromPace = (
  tdeeKcal: number,
  preset: GoalPreset,
  rate: GoalRate,
  opts: { sex: Sex; weightKg: number; config?: PublicConfig },
): {
  targetKcal: number;
  requestedKcal: number;
  weeklyDeltaKg: number;
  clamped: boolean;
  mode: 'weekly_kg' | 'tdee_fraction';
} => {
  const weeklyOverride = weeklyDeltaKgFromPublicConfig(opts.config, preset, rate);
  const energy = resolvePaceEnergy(tdeeKcal, preset, rate, {
    sex: opts.sex,
    weightKg: opts.weightKg,
    ...(weeklyOverride !== undefined ? { weeklyDeltaKg: weeklyOverride } : {}),
  });
  return {
    targetKcal: energy.targetKcal,
    requestedKcal: energy.requestedKcal,
    weeklyDeltaKg: energy.expectedWeeklyDeltaKg,
    clamped: energy.clamped,
    mode: weeklyOverride !== undefined ? 'weekly_kg' : 'tdee_fraction',
  };
};

export const formatPaceKgPerWeek = (weeklyDeltaKg: number): string => {
  if (weeklyDeltaKg === 0) return '0 kg/wk';
  const abs = Math.abs(weeklyDeltaKg);
  const formatted = Number.isInteger(abs) ? String(abs) : abs.toFixed(2).replace(/\.?0+$/, '');
  return `${weeklyDeltaKg < 0 ? '−' : '+'}${formatted} kg/wk`;
};

export const formatPacePct = (fraction: number): string => {
  if (fraction === 0) return '0%';
  const pct = Math.round(fraction * 100);
  return pct > 0 ? `+${pct}%` : `−${Math.abs(pct)}%`;
};
