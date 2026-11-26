import { render, screen } from '@testing-library/react-native';
import { StyleSheet, type StyleProp, type ViewStyle } from 'react-native';
import { ClientDetailScreen } from '@gymos/app/features/client-detail';
import { tamaguiConfig, TamaguiProvider } from '@gymos/ui';

/**
 * B5 (N2): the client hub header must take layout space on native. Tamagui turns the web-only
 * `position: sticky` into `absolute` on native, which lifted the header over the first rows.
 */

jest.mock('@react-native-async-storage/async-storage', () =>
  jest.requireActual<object>('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

// The charts load Skia's native code at import; the History tab under test renders none.
jest.mock('../../../../packages/app/src/features/charts', () => ({}));

jest.mock('solito/navigation', () => ({
  useRouter: () => ({ replace: jest.fn(), push: jest.fn(), back: jest.fn() }),
  usePathname: () => '/clients/client-1/history',
}));

// The chrome policy only picks the screen's bottom padding; keep the test off the pathname source.
jest.mock('@gymos/app/features/shell/use-app-chrome', () => ({
  useAppChrome: () => ({ allowMobileTabBar: true }),
}));

// Read at render time, so each test picks the loaded or the loading hub.
let mockDetailPending = false;

jest.mock('@gymos/app/api', () => ({
  useClientDetail: () =>
    mockDetailPending
      ? { isPending: true, isError: false }
      : {
          isPending: false,
          isError: false,
          data: {
            client: {
              id: 'client-1',
              name: 'Adnan (Demo)',
              phone: null,
              email: null,
              intake: null,
              medicalFlags: null,
            },
            goal: null,
            latestWeightKg: null,
            goalProgressPct: null,
            dietaryProfile: null,
            plans: [],
            recentCheckIns: [],
          },
        },
  useVitals: () => ({ isPending: false, data: { items: [] } }),
  useClientCheckIns: () => ({ isPending: false, isError: false, data: { items: [] } }),
  useDownloadCredentialsPdf: () => ({ isPending: false, mutate: jest.fn() }),
}));

type Instance = ReturnType<typeof screen.getByText>;

const ancestorsOf = (node: Instance): Instance[] => {
  const chain: Instance[] = [];
  for (let current = node.parent; current !== null; current = current.parent) chain.push(current);
  return chain;
};

// The header (found by `headerNode`) must not ride inside the page scroll view (found from `bodyNode`)
// or under any absolutely positioned host view.
const expectHeaderInLayout = (headerNode: Instance, bodyNode: Instance) => {
  const headerChain = ancestorsOf(headerNode);
  // RNTL 14's tree holds host views only, so ScrollView shows up as its host component.
  const pageScroll = ancestorsOf(bodyNode).find((node) => node.type === 'RCTScrollView');

  expect(pageScroll).toBeDefined();
  // Booleans, not the instances: a failing `toContain` would try to print the whole tree.
  const headerScrollsWithBody = headerChain.some((node) => node === pageScroll);
  expect(headerScrollsWithBody).toBe(false);
  const positions = headerChain
    .filter((node) => typeof node.type === 'string')
    // flatten() returns undefined for a node without a style, which its type leaves out.
    .map(
      (node) =>
        (StyleSheet.flatten(node.props.style as StyleProp<ViewStyle>) as ViewStyle | undefined)
          ?.position,
    );
  expect(positions).not.toContain('absolute');
};

const renderHub = (tab: 'overview' | 'history') =>
  render(
    <TamaguiProvider config={tamaguiConfig} defaultTheme="light">
      <ClientDetailScreen clientId="client-1" tab={tab} />
    </TamaguiProvider>,
  );

describe('client hub header on native (B5)', () => {
  it('sits in flow above the scroll view instead of floating over the first row', async () => {
    mockDetailPending = false;
    await renderHub('history');
    expectHeaderInLayout(
      screen.getByText('Adnan (Demo)'),
      screen.getByText('No check-ins logged yet.'),
    );
  });

  it('keeps the loading skeleton header off the skeleton cards too', async () => {
    mockDetailPending = true;
    await renderHub('overview');
    expectHeaderInLayout(screen.getByLabelText('More actions'), screen.getByText('Current weight'));
  });
});
