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

/** Map a pointer's clientX onto 0..1 given the track's viewport box. */
export const tFromClientX = (clientX: number, left: number, width: number): number => {
  if (width <= 0) return 0.5;
  return Math.min(1, Math.max(0, (clientX - left) / width));
};

export type PositionedTick = {
  value: number;
  label: string;
  t: number;
};

/** Place named ticks on the track. Collapsed kcal values become a single mark. */
export const positionedTicks = (
  ticks: readonly { value: number; label: string }[],
  min: number,
  max: number,
  invert: boolean,
): PositionedTick[] => {
  const uniqueValues = new Set(ticks.map((tick) => tick.value));
  if (uniqueValues.size <= 1) {
    const preferred = ticks[Math.floor(ticks.length / 2)] ?? ticks[0];
    if (preferred === undefined) return [];
    return [
      {
        value: preferred.value,
        label: preferred.label,
        t: kcalToT(preferred.value, min, max, invert),
      },
    ];
  }
  return ticks.map((tick) => ({
    value: tick.value,
    label: tick.label,
    t: kcalToT(tick.value, min, max, invert),
  }));
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
