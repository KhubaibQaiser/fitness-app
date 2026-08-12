'use client';

import type { LineChartConfig } from 'expo-skia-charts';
import { LineChart } from 'expo-skia-charts';
import { useMemo } from 'react';
import { View } from 'react-native';
import { useTheme, YStack } from 'tamagui';
import { Muted } from '@gymos/ui';

export type WeightTrendPoint = { t: number; weightKg: number };

export const WeightTrendChart = ({
  points,
  height = 220,
}: {
  points: WeightTrendPoint[];
  goalWeightKg?: number | null;
  height?: number;
}) => {
  const theme = useTheme();

  const config = useMemo((): LineChartConfig | null => {
    if (points.length < 2) return null;

    const sorted = [...points].sort((a, b) => a.t - b.t);
    const data = sorted.map((p) => ({ x: p.t, y: p.weightKg }));

    const primaryColor = String(theme.primary?.val ?? '#00D68F');
    const mutedColor = String(theme.textMuted?.val ?? '#808080');
    const cardBg = String(theme.cardBg?.val ?? '#111111');

    return {
      data,
      colors: {
        highlightColor: primaryColor,
        lineBase: mutedColor,
        dotBase: primaryColor,
        areaFill: {
          type: 'gradient',
          startColor: `${primaryColor}40`,
          endColor: `${primaryColor}05`,
        },
      },
      xAxis: {
        enabled: true,
        isTimeData: true,
        formatter: (value: number) => {
          const d = new Date(value);
          return `${d.getDate()}/${d.getMonth() + 1}`;
        },
        color: mutedColor,
      },
      yAxis: {
        enabled: true,
        showGridLines: true,
        gridLineColor: cardBg,
        color: mutedColor,
        formatter: (value: number) => value.toFixed(1),
      },
      hover: {
        enabled: true,
        showDot: true,
        highlightLine: true,
      },
      smoothing: 0.2,
    };
  }, [points, theme]);

  if (!config) {
    return (
      <YStack
        height={height}
        alignItems="center"
        justifyContent="center"
        backgroundColor="$cardBg"
        borderRadius="$radiusCard"
      >
        <Muted fontSize={13}>Need at least 2 weigh-ins to show trend</Muted>
      </YStack>
    );
  }

  return (
    <View style={{ height, width: '100%' }}>
      <LineChart config={config} />
    </View>
  );
};
