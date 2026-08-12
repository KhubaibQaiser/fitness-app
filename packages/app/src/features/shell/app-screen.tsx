'use client';

import type { ComponentProps, ReactNode } from 'react';
import { ScrollView, Screen as UiScreen, YStack } from '@gymos/ui';
import { useAppChrome } from './use-app-chrome';

type Props = Omit<ComponentProps<typeof UiScreen>, 'chrome'> & {
  children: ReactNode;
  footer?: ReactNode;
};

/** Screen bound to responsive chrome (tab clearance vs desktop padding). */
export const AppScreen = ({ children, footer, ...rest }: Props) => {
  const { screenChrome } = useAppChrome();

  if (footer === undefined) {
    return (
      <UiScreen chrome={screenChrome} {...rest}>
        {children}
      </UiScreen>
    );
  }

  return (
    <YStack flex={1} minHeight={0} width="100%" backgroundColor="$screenBg">
      <ScrollView flex={1} minHeight={0} keyboardShouldPersistTaps="handled">
        <UiScreen chrome={screenChrome} flex={0} paddingBottom="$4" {...rest}>
          {children}
        </UiScreen>
      </ScrollView>
      {footer}
    </YStack>
  );
};
