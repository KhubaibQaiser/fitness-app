export type PrimaryNavHref = '/' | '/clients' | '/tools' | '/notifications' | '/settings';

export type PrimaryNavItem = {
  href: PrimaryNavHref;
  label: string;
};

/** Bottom-tab / side-nav destinations. Chrome policy derives primary routes from this list. */
export const PRIMARY_NAV: readonly PrimaryNavItem[] = [
  { href: '/', label: 'Home' },
  { href: '/clients', label: 'Clients' },
  { href: '/tools', label: 'Tools' },
  { href: '/notifications', label: 'Alerts' },
  { href: '/settings', label: 'Settings' },
];

export const PRIMARY_NAV_PATHS: ReadonlySet<string> = new Set(PRIMARY_NAV.map((item) => item.href));
