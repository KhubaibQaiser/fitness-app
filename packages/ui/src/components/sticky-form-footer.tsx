'use client';

import type { ReactNode } from 'react';
import { XStack, YStack } from 'tamagui';

/**
 * Kit-style sticky form footer (Cancel / Primary).
 * Safe-area padding works on web PWA; native can pass extra bottomInset later.
 */
export const StickyFormFooter = ({
  children,
  bottomInset = 0,
}: {
  children: ReactNode;
  /** Extra bottom padding (e.g. mobile tab bar clearance). */
  bottomInset?: number;
}) => (
  <YStack
    position="sticky"
    bottom={0}
    zIndex={20}
    backgroundColor="$cardBg"
    borderTopWidth={1}
    borderTopColor="$borderColor"
    paddingHorizontal="$5"
    paddingTop="$3"
    paddingBottom={Math.max(12, bottomInset)}
    width="100%"
  >
    <XStack gap="$3" width="100%" maxWidth={560} alignSelf="center">
      {children}
    </XStack>
  </YStack>
);
