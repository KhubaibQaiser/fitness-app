import { isClientHubPath } from '../client-detail/client-hub-tabs';
import { PRIMARY_NAV_PATHS } from './primary-nav';

export type AppRouteChromePolicy = {
  pathname: string;
  isPrimary: boolean;
  /** Route is eligible to show the mobile bottom tabs on phone-sized viewports. */
  allowMobileTabBar: boolean;
};

export const getAppRouteChromePolicy = (pathname: string): AppRouteChromePolicy => {
  const isPrimary = PRIMARY_NAV_PATHS.has(pathname) || isClientHubPath(pathname);

  return {
    pathname,
    isPrimary,
    allowMobileTabBar: isPrimary,
  };
};
