'use client';

import { useCallback } from 'react';
// Solito's own navigation hook: the React Navigation object that expo-router provides. Solito's
// public router has no canGoBack, and this keeps packages/app off expo-router and @react-navigation.
import { useNavigation } from 'solito/build/router/use-navigation';
import { useRouter } from 'solito/navigation';
import { backOrReplace } from './back-navigation';

type Navigation = { canGoBack: () => boolean };

/**
 * Native build: a Cancel or Back press goes back when the stack has a screen to return to,
 * otherwise replaces to `parentHref`. A deep link, or Expo Router 58 (whose link pushes add no
 * stack entry), leaves no history, and there `router.back()` did nothing. Web build:
 * `use-back-navigation.ts`.
 */
export const useBackOr = (parentHref: string) => {
  const router = useRouter();
  // Solito's native hook throws when there is no navigator, so this is never undefined here.
  const navigation = useNavigation() as Navigation;
  return useCallback(
    () =>
      backOrReplace(
        { canGoBack: () => navigation.canGoBack(), back: router.back, replace: router.replace },
        parentHref,
      ),
    [navigation, parentHref, router],
  );
};
