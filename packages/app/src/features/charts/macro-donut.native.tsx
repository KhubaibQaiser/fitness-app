'use client';

import type { DonutChartConfig } from 'expo-skia-charts';
import { DonutChart } from 'expo-skia-charts';
import { useMemo } from 'react';
import { View } from 'react-native';
import { useTheme, YStack } from 'tamagui';
import { Muted } from '@gymos/ui';

export const MacroDonut = ({
  proteinG,
  carbsG,
  fatG,
  height = 200,
}: {
  proteinG: number;
  carbsG: number;
  fatG: number;
  height?: number;
}) => {
  const theme = useTheme();

  const config = useMemo((): DonutChartConfig => {
    const primary = String(theme.primary?.val ?? '#00D68F');
    const accent = String(theme.accent?.val ?? '#479AC2');
    const warning = String(theme.warning?.val ?? '#FFDE00');

    return {
      data: [
        { label: `P ${proteinG}g`, value: proteinG },
        { label: `C ${carbsG}g`, value: carbsG },
        { label: `F ${fatG}g`, value: fatG },
      ],
      colors: [primary, accent, warning],
      strokeWidth: 20,
      gap: 4,
      centerValues: {
        enabled: true,
      },
    };
  }, [proteinG, carbsG, fatG, theme]);

  if (proteinG === 0 && carbsG === 0 && fatG === 0) {
    return (
      <YStack height={height} alignItems="center" justifyContent="center">
        <Muted>No macro data</Muted>
      </YStack>
    );
  }

  return (
    <View style={{ height, width: '100%' }}>
      <DonutChart config={config} />
    </View>
  );
};
