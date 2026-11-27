import { Slot } from 'expo-router';
import { act, renderRouter, screen } from 'expo-router/testing-library';
import { type ReactNode } from 'react';
import { Text } from 'react-native';
import { setSessionPresence } from '@gymos/app/features/shell/session-presence';
import RootLayout from '../../app/_layout';

// Expo Router 58 turns a failed Stack.Protected guard into a redirect. These cover the three
// moments the coach guard fails: a signed-out launch, a signed-in launch before the session
// hydrates, and sign-out from a coach screen.

let mockStoredSession = false;

jest.mock('react-native-gesture-handler', () => ({}));
jest.mock('expo-splash-screen', () => ({
  preventAutoHideAsync: () => Promise.resolve(true),
  hideAsync: () => Promise.resolve(true),
}));
jest.mock('@gymos/platform', () => {
  const values = new Map<string, string>();
  return {
    hydrateStorage: () => Promise.resolve(),
    storage: {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => {
        values.set(key, value);
      },
      removeItem: (key: string) => {
        values.delete(key);
      },
    },
  };
});
jest.mock('../configure-mobile-api', () => ({
  configureMobileApiClient: () => undefined,
  hasStoredMobileSession: () => Promise.resolve(mockStoredSession),
}));
jest.mock('../mobile-providers', () => ({
  MobileProviders: ({ children }: { children: ReactNode }) => children,
}));

const routes = {
  _layout: RootLayout,
  '(coach)/_layout': () => <Slot />,
  '(coach)/index': () => <Text>Home</Text>,
  '(auth)/_layout': () => <Slot />,
  '(auth)/login': () => <Text>Sign in</Text>,
  '+not-found': () => <Text>Not found</Text>,
};

describe('root layout session guards', () => {
  // beforeEach, not afterEach: the previous tree is unmounted by then, so no update lands outside act.
  beforeEach(() => {
    mockStoredSession = false;
    setSessionPresence(false);
  });

  it('opens Sign in on a signed-out launch', async () => {
    await renderRouter(routes, { initialUrl: '/' });

    expect(await screen.findByText('Sign in')).toBeTruthy();
  });

  it('opens Home on a signed-in launch once the session hydrates', async () => {
    mockStoredSession = true;

    await renderRouter(routes, { initialUrl: '/' });

    expect(await screen.findByText('Home')).toBeTruthy();
  });

  it('returns to Sign in when the session ends on a coach screen', async () => {
    mockStoredSession = true;
    setSessionPresence(true);
    await renderRouter(routes, { initialUrl: '/' });
    expect(await screen.findByText('Home')).toBeTruthy();

    mockStoredSession = false;
    await act(() => {
      setSessionPresence(false);
    });

    expect(await screen.findByText('Sign in')).toBeTruthy();
  });
});
