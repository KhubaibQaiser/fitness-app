'use client';

import type { ReactNode } from 'react';

type Props = {
  header: ReactNode;
  /** Renders the scrolling screen. Put `stickyHeader` first in its scroll content (null on native). */
  children: (stickyHeader: ReactNode) => ReactNode;
};

/**
 * Native: React Native has no sticky positioning (Tamagui turns `sticky` into `absolute`, which
 * lifts the header out of the layout and over the content), so the header sits in flow above
 * the scroll view, as a sibling of the screen in the parent column.
 */
export const StickyHeader = ({ header, children }: Props) => (
  <>
    {header}
    {children(null)}
  </>
);
