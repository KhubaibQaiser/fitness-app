'use client';

import type { ReactNode } from 'react';
import { XStack, YStack } from 'tamagui';

/** Footer sibling of a scrolling form body — not position:sticky. */
export const StickyFormFooter = ({
  children,
  bottomInset = 12,
}: {
  children: ReactNode;
  bottomInset?: number;
}) => (
  <YStack
    flexShrink={0}
    zIndex={20}
    backgroundColor="$elevatedBg"
    borderTopWidth={1}
    borderTopColor="$borderColor"
    paddingHorizontal="$4"
    paddingTop="$3"
    paddingBottom={Math.max(12, bottomInset)}
    width="100%"
  >
    <XStack gap="$3" width="100%" maxWidth={560} alignSelf="center">
      {children}
    </XStack>
  </YStack>
);
