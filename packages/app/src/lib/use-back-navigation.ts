'use client';

import { useCallback } from 'react';
// solito's own navigation hook: React Navigation's navigation object on native, undefined on web.
// solito's public router has no canGoBack, and this keeps packages/app off a direct
// @react-navigation dependency.
import { useNavigation } from 'solito/build/router/use-navigation';
import { useRouter } from 'solito/navigation';
import { backOrReplace } from './back-navigation';

type Navigation = { canGoBack: () => boolean } | undefined;

/**
 * A Cancel or Back press: goes back when the app has a screen to return to, otherwise replaces to
 * `parentHref`. Native stacks can have no history (a deep link, or Expo Router 58, whose link
 * pushes no longer add a stack entry), and there `router.back()` did nothing. Web keeps the
 * browser back it had: solito gives no navigation object there, so it always goes back.
 */
export const useBackOr = (parentHref: string) => {
  const router = useRouter();
  const navigation = useNavigation() as Navigation;
  return useCallback(
    () =>
      backOrReplace(
        {
          canGoBack: () => navigation?.canGoBack() ?? true,
          back: router.back,
          replace: router.replace,
        },
        parentHref,
      ),
    [navigation, parentHref, router],
  );
};
