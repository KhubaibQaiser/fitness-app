import 'react-native-gesture-handler';
import { Stack, useRouter } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AUTH_HINT_KEY } from '@gymos/app/features/shell/gate-guard';
import { hydrateStorage, storage } from '@gymos/platform';
import { LoadingState } from '@gymos/ui';
import { configureMobileApiClient } from '../src/configure-mobile-api';
import { MobileProviders } from '../src/mobile-providers';

void SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const router = useRouter();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const boot = async () => {
      await hydrateStorage();
      configureMobileApiClient(() => {
        storage.removeItem(AUTH_HINT_KEY);
        router.replace('/enter');
      });
      if (!cancelled) {
        setReady(true);
        await SplashScreen.hideAsync();
      }
    };
    void boot();
    return () => {
      cancelled = true;
    };
  }, [router]);

  if (!ready) {
    return (
      <SafeAreaProvider>
        <LoadingState label="Starting GymOS…" />
      </SafeAreaProvider>
    );
  }

  return (
    <SafeAreaProvider>
      <MobileProviders>
        <StatusBar style="auto" />
        <Stack screenOptions={{ headerShown: false, animation: 'fade' }} />
      </MobileProviders>
    </SafeAreaProvider>
  );
}
