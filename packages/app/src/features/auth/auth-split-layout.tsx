'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import { AccessibilityInfo } from 'react-native';
import { usePathname } from 'solito/navigation';
import { gymosSheetTransition, Image, Text, XStack, YStack } from '@gymos/ui';

/** RN DimensionValue has no dvh or overflowY. This shell is web-only. */
const fullViewport = { height: '100dvh', minHeight: '100dvh' } as unknown as {
  height: '100%';
  minHeight: '100%';
};

const panelScroll = { overflowY: 'auto' } as unknown as { overflow: 'scroll' };

const HERO_ALT = 'Illustrated mat, dumbbells, bottle, and progress phone';

type AuthSplitLayoutProps = {
  children: ReactNode;
};

export const AuthSplitLayout = ({ children }: AuthSplitLayoutProps) => {
  const pathname = usePathname() ?? '/';
  const initialPath = useRef(pathname);
  // null until AccessibilityInfo answers, so the first paint never starts a slide.
  const [reduceMotion, setReduceMotion] = useState<boolean | null>(null);
  const slideIn = reduceMotion === false && pathname !== initialPath.current;

  useEffect(() => {
    void AccessibilityInfo.isReduceMotionEnabled().then(setReduceMotion);
    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduceMotion);
    return () => subscription.remove();
  }, []);

  return (
    <XStack width="100%" backgroundColor="$screenBg" overflow="hidden" style={fullViewport}>
      <YStack
        display="none"
        flex={1}
        position="relative"
        overflow="hidden"
        $md={{ display: 'flex' }}
      >
        <Image
          source={{ uri: '/auth/hero.jpg' }}
          accessibilityLabel={HERO_ALT}
          resizeMode="cover"
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            width: '100%',
            height: '100%',
          }}
        />
        <YStack
          position="absolute"
          top={0}
          left={0}
          right={0}
          bottom={0}
          style={{
            experimental_backgroundImage:
              'linear-gradient(to top, rgba(10,10,10,0.78) 0%, rgba(10,10,10,0.5) 18%, rgba(10,10,10,0) 42%)',
          }}
        />
        <YStack position="absolute" left={0} right={0} bottom={0} padding="$8" gap="$2">
          <Text
            fontFamily="$heading"
            fontWeight="800"
            fontSize={40}
            color="$white"
            letterSpacing={-0.8}
          >
            GymOS
          </Text>
          <Text fontFamily="$body" fontSize={16} lineHeight={22} color="$white" maxWidth={360}>
            Coaching-first client management.
          </Text>
        </YStack>
      </YStack>
      <YStack
        flex={1}
        minHeight={0}
        overflow="hidden"
        backgroundColor="$screenBg"
        $md={{ maxWidth: 560 }}
      >
        <YStack
          key={pathname}
          flex={1}
          minHeight={0}
          width="100%"
          overflow="hidden"
          {...(slideIn
            ? { animation: gymosSheetTransition, enterStyle: { opacity: 0, x: 24 } }
            : {})}
        >
          <YStack flex={1} minHeight={0} style={panelScroll}>
            {children}
          </YStack>
        </YStack>
      </YStack>
    </XStack>
  );
};
