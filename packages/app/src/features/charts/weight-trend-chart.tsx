'use client';

import { WeightChart, type WeightChartProps } from '@gymos/ui';

export type WeightTrendPoint = WeightChartProps['points'][number];
export type WeightTrendChartProps = WeightChartProps;

export const WeightTrendChart = (props: WeightTrendChartProps) => <WeightChart {...props} />;
