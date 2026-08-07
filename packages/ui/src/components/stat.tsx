'use client';

import type { ReactNode } from 'react';
import { Text, XStack, YStack } from 'tamagui';
import { Muted } from './typography';

/**
 * Kit StatTile — label, mono value (+ optional unit / inline delta), hint.
 * Delta is baseline text beside the value (not a full-width chip).
 */
export const Stat = ({
  label,
  value,
  hint,
  unit,
  delta,
  deltaTone,
  tone,
}: {
  label: string;
  value: string;
  hint?: string;
  unit?: string;
  /** Inline change text, e.g. "1.2 kg ↓" */
  delta?: string;
  deltaTone?: 'danger' | 'success' | 'muted';
  tone?: 'danger' | 'success' | 'warning';
}) => {
  const valueColor =
    tone === 'danger'
      ? '$danger'
      : tone === 'success'
        ? '$success'
        : tone === 'warning'
          ? '$warning'
          : '$color';
  const deltaColor =
    deltaTone === 'danger' ? '$danger' : deltaTone === 'success' ? '$success' : '$textMuted';

  return (
    <YStack gap="$1" width="100%">
      <Muted fontSize={11} textTransform="uppercase" letterSpacing={1} fontWeight="500">
        {label}
      </Muted>
      <XStack alignItems="baseline" gap="$1.5" flexWrap="wrap">
        <Text
          fontFamily="$mono"
          fontSize={24}
          fontWeight="700"
          color={valueColor}
          letterSpacing={-0.4}
          lineHeight={28}
        >
          {value}
        </Text>
        {unit ? (
          <Text fontFamily="$body" fontSize={14} color="$textMuted">
            {unit}
          </Text>
        ) : null}
        {delta ? (
          <Text fontFamily="$body" fontSize={12} fontWeight="500" color={deltaColor}>
            {delta}
          </Text>
        ) : null}
      </XStack>
      {hint ? <Muted fontSize={12}>{hint}</Muted> : null}
    </YStack>
  );
};

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
      alignSelf="flex-start"
      backgroundColor={isGood ? '$successMuted' : '$dangerMuted'}
      borderRadius={999}
      paddingHorizontal="$2.5"
      paddingVertical="$1.5"
      accessibilityLabel={`Change ${arrow} ${Math.abs(delta).toFixed(1)} ${unit}`}
    >
      <Text
        color={isGood ? '$success' : '$danger'}
        fontSize={12}
        fontWeight="700"
        fontFamily="$mono"
      >
        {arrow} {Math.abs(delta).toFixed(1)} {unit}
      </Text>
    </XStack>
  );
};

/** Initials from letters only — "Adnan (Demo)" → "AD", not "A(". */
export const avatarInitials = (name: string): string =>
  name
    .split(/\s+/)
    .map((part) => part.replace(/[^\p{L}]/gu, ''))
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');

export const Avatar = ({
  name,
  size = 40,
  tone = 'primary',
}: {
  name: string;
  size?: number;
  tone?: 'primary' | 'accent';
}) => {
  const initials = avatarInitials(name);
  const bg = tone === 'accent' ? '$accent' : '$primary';
  const fg = tone === 'accent' ? '$accentFg' : '$primaryFg';
  return (
    <XStack
      width={size}
      height={size}
      borderRadius={999}
      backgroundColor={bg}
      alignItems="center"
      justifyContent="center"
      flexShrink={0}
      accessibilityLabel={`${name} avatar`}
    >
      <Text color={fg} fontFamily="$heading" fontWeight="700" fontSize={size * 0.32}>
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
      <Text fontFamily="$heading" fontWeight="700" fontSize={13.5} color="$color" numberOfLines={1}>
        {title}
      </Text>
      {subtitle ? (
        <Muted numberOfLines={2} fontSize={12}>
          {subtitle}
        </Muted>
      ) : null}
    </YStack>
    {trailing}
  </XStack>
);
