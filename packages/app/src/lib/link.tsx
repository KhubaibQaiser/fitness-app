'use client';

import type { ReactElement } from 'react';
import { Link as SolitoLink } from 'solito/link';

type Props = { href: string; target?: '_blank'; children: ReactElement };

/**
 * Web: solito's Link is Next's Link, a real `<a href>` around the child (prefetch, keyboard,
 * cmd- and middle-click). The child's click bubbles to the anchor, so it has one navigation
 * owner and needs no change. Native: see `link.native.tsx`.
 */
export const Link = ({ href, target, children }: Props) => (
  <SolitoLink href={href} {...(target !== undefined ? { target } : {})}>
    {children}
  </SolitoLink>
);
