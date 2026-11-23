'use client';

import { createContext, useContext, type ReactNode } from 'react';
import { isWeb } from './is-web';

const PathnameContext = createContext<string | null>(null);

/**
 * Supplies the current route path to shared chrome. The native coach layout mounts it with
 * Expo Router's `usePathname()`, so this package takes no router dependency.
 */
export const PathnameProvider = ({
  pathname,
  children,
}: {
  pathname: string;
  children: ReactNode;
}) => <PathnameContext.Provider value={pathname}>{children}</PathnameContext.Provider>;

/**
 * Path from the nearest `PathnameProvider`. Web mounts none yet and gets `null`, so the caller
 * keeps reading Next's pathname. Native must mount one: Solito's pathname there is the layout's
 * own route, which is how every native tab ended up reading "/".
 */
export const usePathname = (): string | null => {
  const pathname = useContext(PathnameContext);
  if (pathname === null && !isWeb) {
    throw new Error('usePathname: no PathnameProvider above this native screen');
  }
  return pathname;
};
