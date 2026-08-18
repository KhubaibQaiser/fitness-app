'use client';

import { usePathname } from 'solito/navigation';
import { getAppRouteChromePolicy, type AppRouteChromePolicy } from './route-chrome-policy';

/**
 * Route-only chrome policy (no viewport logic).
 * Viewport presentation (mobile vs desktop) is owned by shell styles so web
 * SSR + hydration do not swap structure.
 */
export const useAppChrome = (): AppRouteChromePolicy => {
  const pathname = usePathname() ?? '/';
  return getAppRouteChromePolicy(pathname);
};
