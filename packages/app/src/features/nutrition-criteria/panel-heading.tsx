'use client';

import { Body, Muted, YStack } from '@gymos/ui';

/** Section heading inside a tab panel. */
export const PanelHeading = ({ title, subtitle }: { title: string; subtitle?: string }) => (
  <YStack gap="$1" marginBottom="$1">
    <Body fontFamily="$heading" fontWeight="800" fontSize={18} letterSpacing={-0.3}>
      {title}
    </Body>
    {subtitle ? (
      <Muted fontSize={13} lineHeight={19}>
        {subtitle}
      </Muted>
    ) : null}
  </YStack>
);
