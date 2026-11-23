import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PRIMARY_NAV, type PrimaryNavHref } from './primary-nav';
import { getAppRouteChromePolicy } from './route-chrome-policy';
import { isNavActive, useAppChrome } from './use-app-chrome';

// The two path sources the shell can read. Native: the platform façade, fed by Expo Router in the
// coach layout, while Solito resolves to the layout's own route and yields no path (N3). Web: no
// provider is mounted and Solito returns Next's pathname.
const source = vi.hoisted(() => ({
  provided: null as string | null,
  solito: undefined as string | undefined,
}));
vi.mock('@gymos/platform', () => ({ usePathname: () => source.provided }));
vi.mock('solito/navigation', () => ({ usePathname: () => source.solito }));

// Plain calls are safe here: both path hooks are mocked as plain functions.
const nativeChrome = (pathname: string) => {
  source.provided = pathname;
  source.solito = undefined;
  return useAppChrome();
};

const activeTabs = (pathname: string): PrimaryNavHref[] =>
  PRIMARY_NAV.filter(({ href }) => isNavActive(pathname, href)).map(({ href }) => href);

describe('app chrome route policy', () => {
  it('allows the mobile tab bar on every primary nav destination', () => {
    for (const { href } of PRIMARY_NAV) {
      expect(getAppRouteChromePolicy(href).allowMobileTabBar).toBe(true);
    }
  });

  it('allows the mobile tab bar on client hub tab routes', () => {
    expect(getAppRouteChromePolicy('/clients/c1').allowMobileTabBar).toBe(true);
    expect(getAppRouteChromePolicy('/clients/c1/journey').allowMobileTabBar).toBe(true);
    expect(getAppRouteChromePolicy('/clients/c1/meal-plan').allowMobileTabBar).toBe(true);
    expect(getAppRouteChromePolicy('/clients/c1/history').allowMobileTabBar).toBe(true);
  });

  it('hides the mobile tab bar on editor subflows', () => {
    expect(getAppRouteChromePolicy('/clients/new').allowMobileTabBar).toBe(false);
    expect(getAppRouteChromePolicy('/clients/c1/plan').allowMobileTabBar).toBe(false);
    expect(getAppRouteChromePolicy('/clients/c1/check-in').allowMobileTabBar).toBe(false);
    expect(getAppRouteChromePolicy('/clients/c1/vitals/new').allowMobileTabBar).toBe(false);
    expect(getAppRouteChromePolicy('/tools/meals').allowMobileTabBar).toBe(false);
  });
});

describe('app chrome on native paths', () => {
  beforeEach(() => {
    source.provided = null;
    source.solito = undefined;
  });

  // Every route file under apps/mobile/app/(coach)/, as Expo Router's usePathname() reports it.
  // settings/nutrition.tsx redirects, so it lands on /tools/targets.
  const tabRoutes: [string, PrimaryNavHref][] = [
    ['/', '/'],
    ['/clients', '/clients'],
    ['/clients/c1', '/clients'],
    ['/clients/c1/history', '/clients'],
    ['/clients/c1/journey', '/clients'],
    ['/clients/c1/meal-plan', '/clients'],
    ['/notifications', '/notifications'],
    ['/settings', '/settings'],
    ['/tools', '/tools'],
  ];
  const taskRoutes = [
    '/clients/new',
    '/clients/c1/plan',
    '/clients/c1/check-in',
    '/clients/c1/check-ins/k1',
    '/clients/c1/dietary',
    '/clients/c1/goal/new',
    '/clients/c1/vitals/new',
    '/tools/meals',
    '/tools/targets',
  ];

  it.each(tabRoutes)('shows the tab bar on %s with %s active', (pathname, tab) => {
    const chrome = nativeChrome(pathname);
    expect(chrome.pathname).toBe(pathname);
    expect(chrome.allowMobileTabBar).toBe(true);
    expect(activeTabs(chrome.pathname)).toEqual([tab]);
  });

  it.each(taskRoutes)('hides the tab bar on %s', (pathname) => {
    const chrome = nativeChrome(pathname);
    expect(chrome.pathname).toBe(pathname);
    expect(chrome.allowMobileTabBar).toBe(false);
  });

  it('keeps reading Next’s pathname through Solito on web, where no provider is mounted', () => {
    source.solito = '/clients/c1/check-in';
    expect(useAppChrome()).toEqual(getAppRouteChromePolicy('/clients/c1/check-in'));

    source.solito = undefined;
    expect(useAppChrome().pathname).toBe('/');
  });
});
