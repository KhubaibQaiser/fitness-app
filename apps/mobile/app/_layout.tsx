import 'react-native-gesture-handler';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { setSessionPresence } from '@gymos/app/features/shell/session-presence';
import { useSessionPresence } from '@gymos/app/features/shell/use-session-presence';
import { hydrateStorage } from '@gymos/platform';
import { configureMobileApiClient, hasStoredMobileSession } from '../src/configure-mobile-api';
import { MobileProviders } from '../src/mobile-providers';

void SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const signedIn = useSessionPresence();

  useEffect(() => {
    let cancelled = false;
    const boot = async () => {
      await hydrateStorage();
      configureMobileApiClient(() => {
        setSessionPresence(false);
      });
      const hasSession = await hasStoredMobileSession();
      setSessionPresence(hasSession);
      if (!cancelled) {
        await SplashScreen.hideAsync();
      }
    };
    void boot();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <SafeAreaProvider>
      <MobileProviders>
        <StatusBar style="auto" />
        <Stack screenOptions={{ headerShown: false, animation: 'none' }}>
          <Stack.Protected guard={signedIn}>
            <Stack.Screen name="(coach)" />
          </Stack.Protected>
          <Stack.Protected guard={!signedIn}>
            <Stack.Screen name="(auth)" />
          </Stack.Protected>
        </Stack>
      </MobileProviders>
    </SafeAreaProvider>
  );
}
