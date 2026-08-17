'use client';

import { usePathname } from 'solito/navigation';
import { useIsDesktop } from '@gymos/platform';
import { isClientHubPath } from '../client-detail/client-hub-tabs';

type ScreenChrome = 'mobile' | 'desktop' | 'bare';

/**
 * Subflows hide the bottom tab bar on phone (more canvas for forms).
 * Desktop keeps the side nav always.
 */
export const useAppChrome = () => {
  const isDesktop = useIsDesktop();
  const pathname = usePathname() ?? '/';

  const isClientHub = isClientHubPath(pathname);

  const isPrimary =
    pathname === '/' ||
    pathname === '/clients' ||
    pathname === '/tools' ||
    pathname === '/notifications' ||
    pathname === '/settings' ||
    isClientHub;

  const showMobileTabBar = !isDesktop && isPrimary;
  const screenChrome: ScreenChrome = isDesktop ? 'desktop' : showMobileTabBar ? 'mobile' : 'bare';

  return {
    isDesktop,
    showMobileTabBar,
    showSideNav: isDesktop,
    screenChrome,
    pathname,
  };
};
