'use client';

import type { ReactNode } from 'react';
import { YStack } from '@gymos/ui';

/**
 * Shared kit content inset ($5 / $8). Use under flush Screens so body edges
 * match strip headers (PageHeader strip, client hub header, home stats).
 */
export const ScreenBody = ({ children, gap = '5' }: { children: ReactNode; gap?: string }) => (
  <YStack
    width="100%"
    paddingHorizontal="16px md:24px"
    paddingTop="16px md:24px"
    paddingBottom="2"
    gap={gap}
  >
    {children}
  </YStack>
);
