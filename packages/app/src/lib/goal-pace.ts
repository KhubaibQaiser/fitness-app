import type { PublicConfig } from '@gymos/contracts';
import {
  GOAL_DELTA,
  KCAL_PER_KG,
  resolveWeeklyDeltaKg,
  type GoalPreset,
  type GoalRate,
} from '@gymos/core/nutrition';

export const weeklyDeltaKgFromPublicConfig = (
  config: PublicConfig | undefined,
  preset: GoalPreset,
  rate: GoalRate,
): number | undefined => resolveWeeklyDeltaKg(config?.nutrition?.weeklyDeltaKg, preset, rate);

/** Target kcal from TDEE using tenant kg/week override when present, else GOAL_DELTA %. */
export const targetKcalFromPace = (
  tdeeKcal: number,
  preset: GoalPreset,
  rate: GoalRate,
  config?: PublicConfig,
): { targetKcal: number; weeklyDeltaKg: number; mode: 'weekly_kg' | 'tdee_fraction' } => {
  const weeklyOverride = weeklyDeltaKgFromPublicConfig(config, preset, rate);
  if (weeklyOverride !== undefined) {
    return {
      targetKcal: Math.round(tdeeKcal + (weeklyOverride * KCAL_PER_KG) / 7),
      weeklyDeltaKg: weeklyOverride,
      mode: 'weekly_kg',
    };
  }
  const fraction = GOAL_DELTA[preset][rate];
  const targetKcal = Math.round(tdeeKcal * (1 + fraction));
  return {
    targetKcal,
    weeklyDeltaKg: Number((((targetKcal - tdeeKcal) * 7) / KCAL_PER_KG).toFixed(2)),
    mode: 'tdee_fraction',
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
