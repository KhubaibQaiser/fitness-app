import { render, screen } from '@testing-library/react-native';
import { useFonts } from 'expo-font';
import { type ReactNode } from 'react';
import { Text } from 'react-native';
import { MobileProviders } from '../mobile-providers';

jest.mock('expo-font', () => ({
  useFonts: jest.fn(),
}));

jest.mock('@gymos/app/provider', () => ({
  AppProviders: ({ children }: { children: ReactNode }) => children,
}));

jest.mock('@gymos/platform', () => ({
  ThemeModeProvider: ({ children }: { children: ReactNode }) => children,
}));

const mockedUseFonts = jest.mocked(useFonts);

describe('MobileProviders', () => {
  it('keeps Tamagui theme context while fonts load', () => {
    mockedUseFonts.mockReturnValue([false, null]);

    expect(() => {
      render(
        <MobileProviders>
          <Text>child</Text>
        </MobileProviders>,
      );
    }).not.toThrow();

    expect(screen.getByText('Loading…')).toBeTruthy();
    expect(screen.getByText('child')).toBeTruthy();
  });

  it('renders children after fonts load', () => {
    mockedUseFonts.mockReturnValue([true, null]);

    render(
      <MobileProviders>
        <Text>ready</Text>
      </MobileProviders>,
    );

    expect(screen.getByText('ready')).toBeTruthy();
  });
});
