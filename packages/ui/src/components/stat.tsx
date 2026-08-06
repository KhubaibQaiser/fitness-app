'use client';

import type { ReactNode } from 'react';
import { Text, XStack, YStack } from 'tamagui';
import { Muted } from './typography';

export const Stat = ({ label, value, hint }: { label: string; value: string; hint?: string }) => (
  <YStack
    flex={1}
    minWidth={100}
    backgroundColor="$elevatedBg"
    borderRadius={14}
    padding="$3"
    gap="$1"
    borderWidth={1}
    borderColor="$borderColor"
  >
    <Muted fontSize={11} textTransform="uppercase" letterSpacing={0.8} fontWeight="700">
      {label}
    </Muted>
    <Text fontFamily="$heading" fontSize={22} fontWeight="800" color="$color" letterSpacing={-0.4}>
      {value}
    </Text>
    {hint ? <Muted fontSize={12}>{hint}</Muted> : null}
  </YStack>
);

export const DeltaChip = ({
  delta,
  goodDirection,
  unit,
}: {
  delta: number;
  goodDirection: 'down' | 'up';
  unit: string;
}) => {
  const isGood = goodDirection === 'down' ? delta <= 0 : delta >= 0;
  const arrow = delta === 0 ? '—' : delta > 0 ? '▲' : '▼';
  return (
    <XStack
      backgroundColor={isGood ? '$success' : '$danger'}
      borderRadius={999}
      paddingHorizontal="$2.5"
      paddingVertical="$1.5"
      accessibilityLabel={`Change ${arrow} ${Math.abs(delta).toFixed(1)} ${unit}`}
    >
      <Text
        color={isGood ? '$successFg' : '$dangerFg'}
        fontSize={12}
        fontWeight="800"
        fontFamily="$heading"
      >
        {arrow} {Math.abs(delta).toFixed(1)} {unit}
      </Text>
    </XStack>
  );
};

export const Avatar = ({ name, size = 40 }: { name: string; size?: number }) => {
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? '')
    .join('');
  return (
    <XStack
      width={size}
      height={size}
      borderRadius={999}
      backgroundColor="$primary"
      alignItems="center"
      justifyContent="center"
      accessibilityLabel={`${name} avatar`}
    >
      <Text color="$primaryFg" fontFamily="$heading" fontWeight="800" fontSize={size * 0.36}>
        {initials || '?'}
      </Text>
    </XStack>
  );
};

export const ListRow = ({
  title,
  subtitle,
  trailing,
  leading,
}: {
  title: string;
  subtitle?: string | null;
  trailing?: ReactNode;
  leading?: ReactNode;
}) => (
  <XStack alignItems="center" gap="$3" minHeight={56} width="100%">
    {leading}
    <YStack flex={1} gap={2} minWidth={0}>
      <Text fontFamily="$heading" fontWeight="700" fontSize={16} color="$color" numberOfLines={1}>
        {title}
      </Text>
      {subtitle ? <Muted numberOfLines={2}>{subtitle}</Muted> : null}
    </YStack>
    {trailing}
  </XStack>
);
