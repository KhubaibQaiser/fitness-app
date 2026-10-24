import type { ReactNode } from 'react';
import { XStack, YStack } from '@gymos/ui';
import { AuthThemeToggle } from './auth-theme-toggle';

const scrollStyle = { overflowY: 'auto' } as unknown as { overflow: 'scroll' };

type AuthFormColumnProps = {
  children: ReactNode;
  pathname: string;
  enterClass: string | undefined;
  setPanel: (node: unknown) => void;
};

export const AuthFormColumn = ({
  children,
  pathname,
  enterClass,
  setPanel,
}: AuthFormColumnProps) => (
  <YStack
    flex={1}
    minHeight={0}
    overflow="hidden"
    backgroundColor="$screenBg"
    $md={{ maxWidth: 560 }}
  >
    <XStack justifyContent="flex-end" paddingTop="$3" paddingRight="$3">
      <AuthThemeToggle />
    </XStack>
    <YStack flex={1} minHeight={0} overflow="hidden" position="relative">
      <YStack
        key={pathname}
        flex={1}
        minHeight={0}
        width="100%"
        {...(enterClass !== undefined ? { className: enterClass } : {})}
        ref={setPanel}
      >
        <YStack flex={1} minHeight={0} style={scrollStyle}>
          {children}
        </YStack>
      </YStack>
    </YStack>
  </YStack>
);
