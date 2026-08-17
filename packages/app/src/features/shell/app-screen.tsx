'use client';

import type { ComponentProps, ReactNode } from 'react';
import { ScrollView, Screen as UiScreen, YStack } from '@gymos/ui';
import { useAppChrome } from './use-app-chrome';

type Props = Omit<ComponentProps<typeof UiScreen>, 'chrome'> & {
  children: ReactNode;
  footer?: ReactNode;
};

/**
 * Screen bound to responsive chrome (tab clearance vs desktop padding).
 * Always scrolls internally — AppShell bounds the viewport height and clips
 * overflow, so every screen (with or without a footer) must own its scroll.
 */
export const AppScreen = ({ children, footer, ...rest }: Props) => {
  const { screenChrome } = useAppChrome();

  return (
    <YStack flex={1} minHeight={0} width="100%" backgroundColor="$coachCanvas">
      <ScrollView flex={1} minHeight={0} keyboardShouldPersistTaps="handled">
        <UiScreen
          chrome={screenChrome}
          flex={0}
          {...(footer !== undefined ? { paddingBottom: '$4' } : {})}
          {...rest}
        >
          {children}
        </UiScreen>
      </ScrollView>
      {footer}
    </YStack>
  );
};
