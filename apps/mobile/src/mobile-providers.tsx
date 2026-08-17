'use client';

import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  Inter_800ExtraBold,
} from '@expo-google-fonts/inter';
import {
  RobotoMono_400Regular,
  RobotoMono_500Medium,
  RobotoMono_600SemiBold,
  RobotoMono_700Bold,
} from '@expo-google-fonts/roboto-mono';
import { useFonts } from 'expo-font';
import { type ReactNode } from 'react';
import { TamaguiProvider } from 'tamagui';
import { AppProviders } from '@gymos/app/provider';
import { ThemeModeProvider } from '@gymos/platform';
import { LoadingState, tamaguiConfig } from '@gymos/ui';

export const MobileProviders = ({ children }: { children: ReactNode }) => {
  const [loaded] = useFonts({
    Inter: Inter_400Regular,
    'Inter-Medium': Inter_500Medium,
    'Inter-SemiBold': Inter_600SemiBold,
    'Inter-Bold': Inter_700Bold,
    'Inter-ExtraBold': Inter_800ExtraBold,
    RobotoMono: RobotoMono_400Regular,
    'RobotoMono-Medium': RobotoMono_500Medium,
    'RobotoMono-SemiBold': RobotoMono_600SemiBold,
    'RobotoMono-Bold': RobotoMono_700Bold,
  });

  if (!loaded) {
    return <LoadingState label="Loading…" />;
  }

  return (
    <TamaguiProvider config={tamaguiConfig} defaultTheme="dark">
      <ThemeModeProvider>
        <AppProviders>{children}</AppProviders>
      </ThemeModeProvider>
    </TamaguiProvider>
  );
};
