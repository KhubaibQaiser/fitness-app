'use client';

import type { ReactNode } from 'react';
import { XStack } from '@gymos/ui';
import { AuthFormColumn } from './auth-form-column';
import { AuthHeroColumn } from './auth-hero-column';
import { useAuthPanelSlide } from './use-auth-panel-slide';

/** RN DimensionValue has no dvh or overflowY. This shell is web-only. */
const fullViewport = { height: '100dvh', minHeight: '100dvh' } as unknown as {
  height: '100%';
  minHeight: '100%';
};

type AuthSplitLayoutProps = {
  children: ReactNode;
};

export const AuthSplitLayout = ({ children }: AuthSplitLayoutProps) => {
  const { enterClass, pathname, setPanel } = useAuthPanelSlide();

  return (
    <XStack width="100%" backgroundColor="$screenBg" overflow="hidden" style={fullViewport}>
      <AuthHeroColumn />
      <AuthFormColumn pathname={pathname} enterClass={enterClass} setPanel={setPanel}>
        {children}
      </AuthFormColumn>
    </XStack>
  );
};
