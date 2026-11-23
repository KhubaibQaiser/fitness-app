'use client';

import type { ReactNode } from 'react';
import { YStack } from 'tamagui';

type Props = {
  header: ReactNode;
  /** Renders the scrolling screen. Put `stickyHeader` first in its scroll content (null on native). */
  children: (stickyHeader: ReactNode) => ReactNode;
};

/** Web: the header rides at the top of the scroll content and sticks there. Native: see `.native.tsx`. */
export const StickyHeader = ({ header, children }: Props) =>
  children(
    <YStack position="sticky" top={0} zIndex={20} width="100%">
      {header}
    </YStack>,
  );
