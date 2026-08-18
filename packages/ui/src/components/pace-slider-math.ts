export const clampKcal = (value: number, min: number, max: number): number => {
  const lo = Math.min(min, max);
  const hi = Math.max(min, max);
  return Math.min(hi, Math.max(lo, Math.round(value)));
};

/** Map kcal onto 0..1 along the track. `invert` puts higher kcal on the left (deficit). */
export const kcalToT = (kcal: number, min: number, max: number, invert: boolean): number => {
  if (max === min) return 0.5;
  const lo = Math.min(min, max);
  const hi = Math.max(min, max);
  const raw = (clampKcal(kcal, lo, hi) - lo) / (hi - lo);
  const t = invert ? 1 - raw : raw;
  return Math.min(1, Math.max(0, t));
};

export const tToKcal = (t: number, min: number, max: number, invert: boolean): number => {
  const lo = Math.min(min, max);
  const hi = Math.max(min, max);
  const clampedT = Math.min(1, Math.max(0, t));
  const raw = invert ? 1 - clampedT : clampedT;
  return Math.round(lo + raw * (hi - lo));
};

export const nearestTickLabel = (
  kcal: number,
  ticks: readonly { value: number; label: string }[],
): string => {
  const first = ticks[0];
  if (first === undefined) return '';
  let best = first;
  for (const tick of ticks) {
    if (Math.abs(tick.value - kcal) < Math.abs(best.value - kcal)) best = tick;
  }
  return best.label;
};

export const stepKcal = (
  kcal: number,
  min: number,
  max: number,
  invert: boolean,
  direction: -1 | 1,
  amount: number,
): number => {
  const delta = invert ? -direction * amount : direction * amount;
  return clampKcal(kcal + delta, min, max);
};
