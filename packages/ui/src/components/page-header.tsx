'use client';

import type { ReactNode } from 'react';
import { Text, XStack, YStack } from 'tamagui';
import { Muted } from './typography';

const isPlainText = (value: ReactNode): value is string | number =>
  typeof value === 'string' || typeof value === 'number';

export const PageHeader = ({
  title,
  subtitle,
  action,
  leading,
  eyebrow,
  strip = false,
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  action?: ReactNode;
  leading?: ReactNode;
  eyebrow?: ReactNode;
  strip?: boolean;
}) => {
  const inner = (
    <XStack alignItems="flex-start" justifyContent="space-between" gap="$3" width="100%">
      <XStack flex={1} gap="$3" alignItems="center" minWidth={0}>
        {leading}
        <YStack flex={1} gap={2} minWidth={0}>
          {eyebrow ? (
            isPlainText(eyebrow) ? (
              <Muted fontSize={11} fontWeight="500" textTransform="uppercase" letterSpacing={1.2}>
                {eyebrow}
              </Muted>
            ) : (
              eyebrow
            )
          ) : null}
          {isPlainText(title) ? (
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
          ) : (
            title
          )}
          {subtitle ? (
            isPlainText(subtitle) ? (
              <Muted fontSize={13} marginTop={2}>
                {subtitle}
              </Muted>
            ) : (
              <YStack marginTop={2}>{subtitle}</YStack>
            )
          ) : null}
        </YStack>
      </XStack>
      {action}
    </XStack>
  );

  if (!strip) return inner;

  return (
    <YStack
      paddingHorizontal="$4"
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
