'use client';

import type { ReactNode } from 'react';
import { Text, XStack, YStack } from 'tamagui';
import { Muted } from './typography';

/**
 * Kit page header. `strip` = full-bleed card band (parent Screen must be
 * horizontally flush — paddingHorizontal={0} — so strip width matches body).
 * Strip and body both use $5 / $8 inset for perfect edge alignment.
 */
export const PageHeader = ({
  title,
  subtitle,
  action,
  leading,
  eyebrow,
  strip = false,
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
  leading?: ReactNode;
  eyebrow?: string;
  /** Full-bleed card strip; pair with flush Screen horizontal padding. */
  strip?: boolean;
}) => {
  const inner = (
    <XStack alignItems="flex-start" justifyContent="space-between" gap="$3" width="100%">
      <XStack flex={1} gap="$3" alignItems="center" minWidth={0}>
        {leading}
        <YStack flex={1} gap={2} minWidth={0}>
          {eyebrow ? (
            <Muted fontSize={12} fontWeight="500">
              {eyebrow}
            </Muted>
          ) : null}
          <Text
            fontFamily="$heading"
            fontWeight="700"
            fontSize={strip ? 22 : 20}
            color="$color"
            letterSpacing={-0.3}
            numberOfLines={2}
          >
            {title}
          </Text>
          {subtitle ? (
            <Muted fontSize={13} marginTop={2}>
              {subtitle}
            </Muted>
          ) : null}
        </YStack>
      </XStack>
      {action}
    </XStack>
  );

  if (!strip) return inner;

  return (
    <YStack
      backgroundColor="$cardBg"
      borderBottomWidth={1}
      borderBottomColor="$borderColor"
      paddingHorizontal="$5"
      paddingTop="$6"
      paddingBottom="$5"
      width="100%"
      alignSelf="stretch"
      $md={{ paddingHorizontal: '$8', paddingTop: '$7' }}
    >
      {inner}
    </YStack>
  );
};
