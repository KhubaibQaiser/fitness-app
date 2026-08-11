'use client';

import { Roboto_400Regular, Roboto_500Medium, Roboto_700Bold } from '@expo-google-fonts/roboto';
import { RobotoMono_400Regular, RobotoMono_500Medium } from '@expo-google-fonts/roboto-mono';
import { useFonts } from 'expo-font';
import { type ReactNode } from 'react';
import { TamaguiProvider } from 'tamagui';
import { AppProviders } from '@gymos/app/provider';
import { ThemeModeProvider } from '@gymos/platform';
import { LoadingState, tamaguiConfig } from '@gymos/ui';

/**
 * Native Tamagui + theme + React Query shell (mirrors apps/web NextTamaguiProvider).
 * Fonts map to packages/ui face names: Roboto / Roboto-Medium / Roboto-Bold / RobotoMono*.
 */
export const MobileProviders = ({ children }: { children: ReactNode }) => {
  const [loaded] = useFonts({
    Roboto: Roboto_400Regular,
    'Roboto-Medium': Roboto_500Medium,
    'Roboto-Bold': Roboto_700Bold,
    RobotoMono: RobotoMono_400Regular,
    'RobotoMono-Medium': RobotoMono_500Medium,
  });

  if (!loaded) {
    return <LoadingState label="Loading…" />;
  }

  return (
    <TamaguiProvider config={tamaguiConfig} defaultTheme="light">
      <ThemeModeProvider>
        <AppProviders>{children}</AppProviders>
      </ThemeModeProvider>
    </TamaguiProvider>
  );
};
