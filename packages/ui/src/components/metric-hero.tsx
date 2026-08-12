'use client';

import type { ReactNode } from 'react';
import { Text, XStack, YStack } from 'tamagui';
import { Muted } from './typography';

export const MetricHero = ({
  label,
  value,
  unit,
  delta,
  tone,
}: {
  label: string;
  value: string;
  unit?: string;
  delta?: ReactNode;
  tone?: 'danger' | 'success' | 'warning' | 'primary';
}) => {
  const valueColor =
    tone === 'danger'
      ? '$danger'
      : tone === 'success'
        ? '$success'
        : tone === 'warning'
          ? '$warning'
          : tone === 'primary'
            ? '$primary'
            : '$color';

  return (
    <YStack gap="$1.5" alignItems="flex-start">
      <Muted fontSize={11} fontWeight="500" textTransform="uppercase" letterSpacing={1.2}>
        {label}
      </Muted>
      <XStack alignItems="baseline" gap="$2" flexWrap="wrap">
        <Text
          fontFamily="$mono"
          fontSize={38}
          fontWeight="700"
          color={valueColor}
          letterSpacing={-0.8}
          lineHeight={44}
        >
          {value}
        </Text>
        {unit ? (
          <Text fontFamily="$body" fontSize={16} color="$textMuted" fontWeight="400">
            {unit}
          </Text>
        ) : null}
      </XStack>
      {delta}
    </YStack>
  );
};
