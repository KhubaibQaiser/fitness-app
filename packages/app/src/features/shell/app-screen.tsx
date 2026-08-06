'use client';

import type { ComponentProps, ReactNode } from 'react';
import { Screen as UiScreen } from '@gymos/ui';
import { useAppChrome } from './use-app-chrome';

type Props = Omit<ComponentProps<typeof UiScreen>, 'chrome'> & {
  children: ReactNode;
};

/** Screen bound to responsive chrome (tab clearance vs desktop padding). */
export const AppScreen = ({ children, ...rest }: Props) => {
  const { screenChrome } = useAppChrome();
  return (
    <UiScreen chrome={screenChrome} {...rest}>
      {children}
    </UiScreen>
  );
};
