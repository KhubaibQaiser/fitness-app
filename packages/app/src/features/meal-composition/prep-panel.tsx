'use client';

import { PREP_PREFERENCES } from '@gymos/core/nutrition';
import { Body, Card, Muted, YStack } from '@gymos/ui';

export const PrepPanel = () => (
  <YStack gap="$4">
    <Card gap="$3" tone="accent">
      <Body fontFamily="$heading" fontWeight="800" fontSize={16}>
        Prep defaults
      </Body>
      <Muted lineHeight={20}>{PREP_PREFERENCES.summary}</Muted>
      <Muted fontSize={13} lineHeight={19}>
        Shown on every meal plan screen and hinted in AI prep notes.
      </Muted>
    </Card>
  </YStack>
);
