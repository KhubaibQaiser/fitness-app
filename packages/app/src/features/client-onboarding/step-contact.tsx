'use client';

import { FormField, YStack } from '@gymos/ui';
import type { OnboardingDraft } from './onboarding-types';

export const StepContact = ({
  draft,
  errors,
  onPatch,
  onClearError,
}: {
  draft: OnboardingDraft;
  errors: Record<string, string>;
  onPatch: (partial: Partial<OnboardingDraft>) => void;
  onClearError: (key: string) => void;
}) => (
  <YStack gap="$4">
    <FormField
      label="WhatsApp number"
      value={draft.phone}
      onChangeText={(t) => {
        onPatch({ phone: t });
        onClearError('phone');
      }}
      placeholder="+92 3xx xxxxxxx"
      inputMode="tel"
      required
      error={errors.phone ?? null}
      hint="Preferred contact channel"
    />
    <FormField
      label="Email"
      value={draft.email}
      onChangeText={(t) => {
        onPatch({ email: t });
        onClearError('email');
      }}
      placeholder="optional@email.com"
      inputMode="email"
      autoCapitalize="none"
      error={errors.email ?? null}
      hint="Optional"
    />
  </YStack>
);
