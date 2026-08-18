'use client';

import type { ComponentProps, ReactNode } from 'react';
import { FormKeyboardRoot, ScrollView, Screen as UiScreen, YStack } from '@gymos/ui';
import { useAppChrome } from './use-app-chrome';

type Props = Omit<ComponentProps<typeof UiScreen>, 'chrome'> & {
  children: ReactNode;
  footer?: ReactNode;
  /** iOS keyboard avoidance. Defaults on when a sticky footer is present. */
  avoidKeyboard?: boolean;
};

/**
 * Screen bound to responsive chrome (tab clearance vs desktop padding).
 * Always scrolls internally — AppShell bounds the viewport height and clips
 * overflow, so every screen (with or without a footer) must own its scroll.
 */
export const AppScreen = ({ children, footer, avoidKeyboard, ...rest }: Props) => {
  const { allowMobileTabBar } = useAppChrome();
  const avoid = avoidKeyboard ?? footer !== undefined;
  const chrome = allowMobileTabBar ? 'mobile' : 'bare';

  return (
    <FormKeyboardRoot fill avoidKeyboard={avoid}>
      <YStack flex={1} minHeight={0} width="100%" backgroundColor="$coachCanvas">
        <ScrollView
          flex={1}
          minHeight={0}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="interactive"
        >
          <UiScreen
            chrome={chrome}
            flex={0}
            {...(footer !== undefined ? { paddingBottom: '$4' } : {})}
            {...rest}
          >
            {children}
          </UiScreen>
        </ScrollView>
        {footer}
      </YStack>
    </FormKeyboardRoot>
  );
};
