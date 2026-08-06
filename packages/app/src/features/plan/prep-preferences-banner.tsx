'use client';

import { PREP_PREFERENCES } from '@gymos/core/nutrition';
import { Body, Card, Muted } from '@gymos/ui';

/** Persistent coach callout — Stevia + olive oil defaults. */
export const PrepPreferencesBanner = () => (
  <Card gap="$2" tone="accent">
    <Body fontFamily="$heading" fontWeight="700" fontSize={14}>
      Prep defaults
    </Body>
    <Muted fontSize={13} lineHeight={19}>
      {PREP_PREFERENCES.summary}
    </Muted>
  </Card>
);
