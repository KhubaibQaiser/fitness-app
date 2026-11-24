import { render, screen, userEvent } from '@testing-library/react-native';
import { Linking } from 'react-native';
import { IconButton, tamaguiConfig, TamaguiProvider } from '@gymos/ui';
import { ClientHubMoreMenu } from '../../../../packages/app/src/features/client-detail/client-hub-more-menu';
import { RosterRow } from '../../../../packages/app/src/features/roster/roster-row';
import { Link } from '../../../../packages/app/src/lib/link';

/**
 * One press owner per control (U3 blocker). solito's native Link wraps its child in a Pressable,
 * and a Tamagui child with pressStyle owns its press too. RNTL's press goes to the innermost
 * owner, like the tap on Expo SDK 58, so with two owners the Link never navigated.
 */

const mockPush = jest.fn();

// solito's useLink and Link navigate through this router; its native default needs a navigator.
jest.mock('solito/build/router', () => ({
  useRouter: () => ({ push: mockPush, replace: jest.fn(), parseNextPath: (href: string) => href }),
}));

type Instance = ReturnType<typeof screen.getByText>;

/** Host views from `node` up to the root that would take the touch (claim the responder). */
const pressOwners = (node: Instance) => {
  let owners = 0;
  for (let current: Instance | null = node; current !== null; current = current.parent) {
    if (typeof current.type === 'string' && current.props.onStartShouldSetResponder) owners += 1;
  }
  return owners;
};

const renderWithTheme = (ui: React.ReactElement) =>
  render(
    <TamaguiProvider config={tamaguiConfig} defaultTheme="light">
      {ui}
    </TamaguiProvider>,
  );

beforeEach(() => {
  mockPush.mockClear();
});

describe('one press owner per control', () => {
  it('a roster row card owns its press and opens the client once', async () => {
    const user = userEvent.setup();
    renderWithTheme(
      <RosterRow
        desktop={false}
        client={{
          id: 'client-1',
          name: 'Adnan (Demo)',
          status: 'active',
          attentionScore: 0,
          attentionReasons: [],
          latestWeightKg: null,
          goalPreset: null,
        }}
      />,
    );

    const name = screen.getByText('Adnan (Demo)');
    expect(pressOwners(name)).toBe(1);
    expect(screen.getByRole('link')).toBeTruthy();

    await user.press(name);
    expect(mockPush).toHaveBeenCalledTimes(1);
    expect(mockPush).toHaveBeenCalledWith('/clients/client-1', undefined, expect.anything());
  });

  it('the hub more-menu button opens the menu, and a menu row closes it and navigates once', async () => {
    const user = userEvent.setup();
    renderWithTheme(
      <ClientHubMoreMenu clientId="client-1" signed pdfPending={false} onDownloadPdf={jest.fn()} />,
    );

    const more = screen.getByLabelText('More actions');
    expect(pressOwners(more)).toBe(1);
    await user.press(more);
    expect(screen.getByLabelText('More actions').props['aria-expanded']).toBe(true);

    const logCheckIn = await screen.findByText('Log check-in');
    expect(pressOwners(logCheckIn)).toBe(1);
    await user.press(logCheckIn);
    expect(mockPush).toHaveBeenCalledTimes(1);
    expect(mockPush).toHaveBeenCalledWith(
      '/clients/client-1/check-in',
      undefined,
      expect.anything(),
    );
    // The row's own onPress (close the menu) still runs before the navigation.
    expect(screen.getByLabelText('More actions').props['aria-expanded']).toBe(false);
  });

  it('an external link opens the URL instead of pushing a route', async () => {
    const openURL = jest.spyOn(Linking, 'openURL').mockResolvedValue(true);
    const user = userEvent.setup();
    renderWithTheme(
      <Link href="https://wa.me/923001234567" target="_blank">
        <IconButton aria-label="Open WhatsApp" />
      </Link>,
    );

    const button = screen.getByLabelText('Open WhatsApp');
    expect(pressOwners(button)).toBe(1);
    await user.press(button);
    expect(openURL).toHaveBeenCalledWith('https://wa.me/923001234567');
    expect(mockPush).not.toHaveBeenCalled();
    openURL.mockRestore();
  });
});
