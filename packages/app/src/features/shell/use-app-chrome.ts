'use client';

import { usePathname as useRouterPathname } from 'solito/navigation';
import { usePathname as useProvidedPathname } from '@gymos/platform';
import { getAppRouteChromePolicy, type AppRouteChromePolicy } from './route-chrome-policy';

/** Whether a primary nav destination owns the current path. */
export const isNavActive = (pathname: string, href: string): boolean =>
  href === '/' ? pathname === '/' : pathname === href || pathname.startsWith(`${href}/`);

/**
 * Route-only chrome policy (no viewport logic).
 * Viewport presentation (mobile vs desktop) is owned by shell styles so web
 * SSR + hydration do not swap structure.
 *
 * Native reads the path from the platform façade, which the coach layout feeds from Expo Router,
 * because Solito resolves to the layout's own route there. Web mounts no provider and keeps
 * reading Next's pathname through Solito.
 */
export const useAppChrome = (): AppRouteChromePolicy => {
  const providedPathname = useProvidedPathname();
  const routerPathname = useRouterPathname();
  return getAppRouteChromePolicy(providedPathname ?? routerPathname ?? '/');
};
