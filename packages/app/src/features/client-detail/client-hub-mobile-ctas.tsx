'use client';

import { Link } from 'solito/link';
import { useSafeAreaInsets } from '@gymos/platform';
import { GhostButton, PrimaryButton, XStack, YStack } from '@gymos/ui';
import { useAppChrome } from '../shell/use-app-chrome';

/** Extra AppScreen bottom padding so content clears tab bar + this strip. */
export const CLIENT_HUB_MOBILE_CTA_SCREEN_PAD = 168;

type Props = {
  clientId: string;
  /** When false, nothing renders (desktop uses header CTAs). */
  visible: boolean;
};

/**
 * Mobile dual CTAs above the tab bar (flex sibling — not position:fixed).
 * Pair with AppScreen `paddingBottom={CLIENT_HUB_MOBILE_CTA_SCREEN_PAD}` when visible.
 */
export const ClientHubMobileCtas = ({ clientId, visible }: Props) => {
  const insets = useSafeAreaInsets();
  const { showMobileTabBar } = useAppChrome();
  if (!visible) return null;

  return (
    <YStack
      backgroundColor="$cardBg"
      borderTopWidth={1}
      borderTopColor="$borderColor"
      paddingHorizontal="$4"
      paddingTop="$3"
      paddingBottom={showMobileTabBar ? '$3' : Math.max(insets.bottom, 12)}
      width="100%"
    >
      <XStack gap="$2" width="100%" maxWidth={560} alignSelf="center">
        <Link href={`/clients/${clientId}/check-in`} style={{ flex: 1 }}>
          <GhostButton width="100%">Log check-in</GhostButton>
        </Link>
        <Link href={`/clients/${clientId}/vitals/new`} style={{ flex: 1 }}>
          <PrimaryButton width="100%">Log vitals</PrimaryButton>
        </Link>
      </XStack>
    </YStack>
  );
};
