import { fireEvent, render, screen, userEvent, waitFor } from '@testing-library/react-native';
import { Alert, Linking } from 'react-native';
import { Card, IconButton, tamaguiConfig, TamaguiProvider, Text } from '@gymos/ui';
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

// Restores the Linking, Alert and console spies even when an assertion fails mid-test. Linking.openURL
// is already a jest mock in the preset, so spyOn returns it and its calls must be cleared too.
afterEach(() => {
  jest.restoreAllMocks();
  jest.clearAllMocks();
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
  });

  const encodedError = Object.assign(
    new Error('Unable to open URL: https%3A%2F%2Fwa.me%2F%2B92%20300%201234567'),
    { code: 'E_UNABLE_TO_OPEN' },
  );

  it.each([
    ['the URL', new Error('Unable to open URL: https://wa.me/923001234567'), {}],
    ['an encoded URL and a code', encodedError, { code: 'E_UNABLE_TO_OPEN' }],
  ])(
    'tells the coach when no app can open an external link; an error message with %s stays out of the log',
    async (_name, error, codeField) => {
      jest.spyOn(Linking, 'openURL').mockRejectedValue(error);
      const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => undefined);
      const warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
      const user = userEvent.setup();
      renderWithTheme(
        <Link href="https://wa.me/923001234567" target="_blank">
          <IconButton aria-label="Open WhatsApp" />
        </Link>,
      );

      await user.press(screen.getByLabelText('Open WhatsApp'));
      await waitFor(() => expect(alert).toHaveBeenCalledTimes(1));
      expect(alert).toHaveBeenCalledWith("Couldn't open the link", expect.any(String));
      expect(warn).toHaveBeenCalledWith(expect.stringContaining('link.openExternal'), {
        operation: 'link.openExternal',
        target: 'https://wa.me',
        cause: 'Error',
        ...codeField,
      });
      const logged = JSON.stringify(warn.mock.calls);
      for (const digits of ['923001234567', '1234567', '300']) expect(logged).not.toContain(digits);
    },
  );

  it("runs a plain card's own onPress first, then navigates once", async () => {
    const calls: string[] = [];
    mockPush.mockImplementation(() => calls.push('navigate'));
    const user = userEvent.setup();
    renderWithTheme(
      <Link href="/tools/targets">
        <Card interactive onPress={() => calls.push('card')}>
          <Text>How targets are calculated</Text>
        </Card>
      </Link>,
    );

    const label = screen.getByText('How targets are calculated');
    expect(pressOwners(label)).toBe(1);
    await user.press(label);
    expect(calls).toEqual(['card', 'navigate']);
    mockPush.mockReset();
  });

  it.each(['/tools/targets', 'https://wa.me/923001234567'])(
    'does not open %s when the child prevents the default',
    (href) => {
      const openURL = jest.spyOn(Linking, 'openURL').mockResolvedValue(true);
      renderWithTheme(
        <Link href={href}>
          <Card interactive onPress={(e) => e.preventDefault()}>
            <Text>How targets are calculated</Text>
          </Card>
        </Link>,
      );

      // The shape of RN's press event: preventDefault() sets defaultPrevented.
      const event = {
        defaultPrevented: false,
        preventDefault() {
          this.defaultPrevented = true;
        },
      };
      fireEvent.press(screen.getByText('How targets are calculated'), event);
      expect(event.defaultPrevented).toBe(true);
      expect(mockPush).not.toHaveBeenCalled();
      expect(openURL).not.toHaveBeenCalled();
    },
  );

  it.each([
    ['disabled', { disabled: true }],
    ['aria-disabled', { 'aria-disabled': true }],
  ])('does not navigate from a %s child', (_name, disabledProps) => {
    const onPress = jest.fn();
    renderWithTheme(
      <Link href="/clients/client-1/plan">
        <Card interactive onPress={onPress} {...disabledProps}>
          <Text>Open plan</Text>
        </Card>
      </Link>,
    );

    fireEvent.press(screen.getByText('Open plan'));
    expect(mockPush).not.toHaveBeenCalled();
  });
});
