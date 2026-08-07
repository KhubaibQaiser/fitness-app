'use client';

import { Link } from 'solito/link';
import { GhostButton, PrimaryButton, XStack, YStack } from '@gymos/ui';

/** Extra AppScreen bottom padding so content clears tab bar + this strip. */
export const CLIENT_HUB_MOBILE_CTA_SCREEN_PAD = 168;

/** Offset above mobile tab bar (~64–72px). */
const TAB_BAR_CLEARANCE = 68;

type Props = {
  clientId: string;
  /** When false, nothing renders (desktop uses header CTAs). */
  visible: boolean;
};

/**
 * Mobile dual CTAs fixed above the tab bar.
 * Pair with AppScreen `paddingBottom={CLIENT_HUB_MOBILE_CTA_SCREEN_PAD}` when visible.
 */
export const ClientHubMobileCtas = ({ clientId, visible }: Props) => {
  if (!visible) return null;

  return (
    <YStack
      position="fixed"
      bottom={TAB_BAR_CLEARANCE}
      left={0}
      right={0}
      zIndex={30}
      backgroundColor="$cardBg"
      borderTopWidth={1}
      borderTopColor="$borderColor"
      paddingHorizontal="$4"
      paddingVertical="$3"
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
