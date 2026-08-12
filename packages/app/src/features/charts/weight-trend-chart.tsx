'use client';

import { WeightChart } from '@gymos/ui';

export type WeightTrendPoint = { t: number; weightKg: number };

export const WeightTrendChart = ({
  points,
  goalWeightKg = null,
  height = 220,
}: {
  points: WeightTrendPoint[];
  goalWeightKg?: number | null;
  height?: number;
}) => <WeightChart points={points} goalWeightKg={goalWeightKg} height={height} />;
