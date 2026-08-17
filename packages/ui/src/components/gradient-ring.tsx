'use client';

import type { ReactNode } from 'react';
import { Circle, Defs, LinearGradient, Stop, Svg } from 'react-native-svg';
import { Text, useTheme, YStack } from 'tamagui';

export type GradientRingRole = 'coach' | 'client' | 'milestone';

type GradientRingProps = {
  id: string;
  value: number;
  size?: number;
  stroke?: number;
  role?: GradientRingRole;
  children?: ReactNode;
};

const clampPct = (value: number): number => Math.min(Math.max(value, 0), 100);

export const GradientRing = ({
  id,
  value,
  size = 64,
  stroke = 6,
  role = 'coach',
  children,
}: GradientRingProps) => {
  const theme = useTheme();
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const pct = clampPct(value);
  const offset = circumference * (1 - pct / 100);
  const gradientId = `ring-${id}`;

  const start =
    role === 'milestone'
      ? String(theme.milestoneStroke1?.val ?? '#FBBF24')
      : role === 'client'
        ? String(theme.clientGradientStart?.val ?? '#FB923C')
        : String(theme.gradientStart?.val ?? '#0EA5E9');
  const end =
    role === 'milestone'
      ? String(theme.milestoneStroke2?.val ?? '#F59E0B')
      : role === 'client'
        ? String(theme.clientGradientEnd?.val ?? '#F43F5E')
        : String(theme.gradientEnd?.val ?? '#2563EB');
  const track = String(theme.track?.val ?? '#E4E4E7');

  return (
    <YStack width={size} height={size} alignItems="center" justifyContent="center" flexShrink={0}>
      <Svg width={size} height={size}>
        <Defs>
          <LinearGradient id={gradientId} x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0%" stopColor={start} />
            <Stop offset="100%" stopColor={end} />
          </LinearGradient>
        </Defs>
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={track}
          strokeWidth={stroke}
          fill="none"
        />
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={`url(#${gradientId})`}
          strokeWidth={stroke}
          fill="none"
          strokeDasharray={`${circumference} ${circumference}`}
          strokeDashoffset={offset}
          strokeLinecap="round"
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </Svg>
      <YStack position="absolute" alignItems="center" justifyContent="center">
        {children !== undefined ? (
          children
        ) : (
          <Text fontFamily="$mono" fontSize={size > 80 ? 18 : 14} fontWeight="600" color="$color">
            {Math.round(pct)}%
          </Text>
        )}
      </YStack>
    </YStack>
  );
};
