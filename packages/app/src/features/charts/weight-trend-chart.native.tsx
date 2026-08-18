'use client';

import { WeightChart, type WeightChartProps } from '@gymos/ui';

export type WeightTrendPoint = WeightChartProps['points'][number];
export type WeightTrendChartProps = WeightChartProps;

/** Same SVG chart as web — journey overlays need one implementation. */
export const WeightTrendChart = (props: WeightTrendChartProps) => <WeightChart {...props} />;
