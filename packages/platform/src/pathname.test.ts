import type * as React from 'react';
import type { ReactElement } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PathnameProvider, usePathname } from './pathname';

const env = vi.hoisted(() => ({ isWeb: false, mounted: new Map<unknown, unknown>() }));

vi.mock('./is-web', () => ({
  get isWeb() {
    return env.isWeb;
  },
}));

// This package has no React renderer (no react-dom or test renderer), so the test stands in for
// React's context lookup: useContext returns the value of a provider the test mounted for that
// exact context, and the context's default otherwise.
vi.mock('react', async (importOriginal) => {
  const react = await importOriginal<typeof React>();
  return {
    ...react,
    useContext: (context: { _currentValue: unknown }) =>
      env.mounted.has(context) ? env.mounted.get(context) : context._currentValue,
  };
});

/** Mounts what PathnameProvider renders: its value, keyed by the context it provides. */
const mountProvider = (pathname: string) => {
  const element = PathnameProvider({ pathname, children: null }) as ReactElement<{
    value: unknown;
  }>;
  // The stub keys values by context, so this relies on React 19 making a context its own Provider.
  const context = element.type as unknown as { $$typeof: symbol; Provider: unknown };
  expect(context.$$typeof, 'PathnameProvider should render the context itself').toBe(
    Symbol.for('react.context'),
  );
  expect(context.Provider, 'the context should be its own Provider (React 19)').toBe(context);
  env.mounted.set(context, element.props.value);
};

describe('pathname façade', () => {
  beforeEach(() => {
    env.mounted.clear();
  });

  it('throws on native when no provider is mounted', () => {
    env.isWeb = false;
    expect(() => usePathname()).toThrow('no PathnameProvider');
  });

  it('returns null on web when no provider is mounted', () => {
    env.isWeb = true;
    expect(usePathname()).toBeNull();
  });

  it.each([false, true])('returns the mounted provider’s path (web: %s)', (web) => {
    env.isWeb = web;
    mountProvider('/clients/c1/check-in');
    expect(usePathname()).toBe('/clients/c1/check-in');
  });
});
