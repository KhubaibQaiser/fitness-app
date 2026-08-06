'use client';

import { useServerInsertedHTML } from 'next/navigation';
import { type ReactNode } from 'react';
import { StyleSheet } from 'react-native';
import { TamaguiProvider } from 'tamagui';
import { ThemeModeProvider } from '@gymos/platform';
import { tamaguiConfig } from '@gymos/ui';

/** react-native-web's getSheet() is not in the public RN types. */
const rnwStyleSheet = StyleSheet as unknown as {
  getSheet: () => { id: string; textContent: string };
};

/** Tamagui + react-native-web SSR style insertion (per the Tamagui Next guide). */
export const NextTamaguiProvider = ({ children }: { children: ReactNode }) => {
  useServerInsertedHTML(() => {
    const sheet = rnwStyleSheet.getSheet();
    return (
      <>
        <style dangerouslySetInnerHTML={{ __html: sheet.textContent }} id={sheet.id} />
        <style dangerouslySetInnerHTML={{ __html: tamaguiConfig.getCSS() }} id="tamagui-css" />
      </>
    );
  });

  return (
    <TamaguiProvider config={tamaguiConfig} defaultTheme="light" disableInjectCSS>
      <ThemeModeProvider>{children}</ThemeModeProvider>
    </TamaguiProvider>
  );
};
