'use client';

import { Circle, Svg } from 'react-native-svg';
import { Text, useTheme, YStack } from 'tamagui';
import { Muted } from '@gymos/ui';

export const ProgressRing = ({
  value,
  max = 100,
  size = 120,
  strokeWidth = 8,
  label,
  tone = 'primary',
}: {
  value: number;
  max?: number;
  size?: number;
  strokeWidth?: number;
  label?: string;
  tone?: 'primary' | 'success' | 'danger' | 'warning';
}) => {
  const theme = useTheme();
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const pct = Math.min(Math.max(value / max, 0), 1);
  const offset = circumference * (1 - pct);

  const toneColors: Record<string, string> = {
    primary: String(theme.primary?.val ?? '#1D4ED8'),
    success: String(theme.success?.val ?? '#0EA600'),
    danger: String(theme.danger?.val ?? '#EF4444'),
    warning: String(theme.warning?.val ?? '#F59E0B'),
  };
  const strokeColor = toneColors[tone] ?? toneColors.primary ?? '#1D4ED8';
  const trackColor = String(theme.track?.val ?? '#E4E4E7');

  return (
    <YStack alignItems="center" justifyContent="center" width={size} height={size}>
      <Svg width={size} height={size}>
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={trackColor}
          strokeWidth={strokeWidth}
          fill="none"
        />
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={strokeColor}
          strokeWidth={strokeWidth}
          fill="none"
          strokeDasharray={`${circumference} ${circumference}`}
          strokeDashoffset={offset}
          strokeLinecap="round"
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </Svg>
      <YStack position="absolute" alignItems="center" gap={2}>
        <Text
          fontFamily="$mono"
          fontSize={size > 100 ? 24 : 18}
          fontWeight="700"
          color="$color"
          letterSpacing={-0.5}
        >
          {Math.round(pct * 100)}%
        </Text>
        {label ? (
          <Muted fontSize={10} textTransform="uppercase" letterSpacing={0.8}>
            {label}
          </Muted>
        ) : null}
      </YStack>
    </YStack>
  );
};
