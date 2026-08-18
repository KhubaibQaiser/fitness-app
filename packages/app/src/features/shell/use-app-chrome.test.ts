import { describe, expect, it } from 'vitest';
import { PRIMARY_NAV } from './primary-nav';
import { getAppRouteChromePolicy } from './route-chrome-policy';

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
