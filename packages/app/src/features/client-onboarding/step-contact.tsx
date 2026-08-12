'use client';

import { FormField, YStack } from '@gymos/ui';
import type { OnboardingDraft } from './onboarding-types';
import { PhoneField } from './phone-field';

export const StepContact = ({
  draft,
  errors,
  defaultCountry,
  onPatch,
  onClearError,
}: {
  draft: OnboardingDraft;
  errors: Record<string, string>;
  defaultCountry: string;
  onPatch: (partial: Partial<OnboardingDraft>) => void;
  onClearError: (key: string) => void;
}) => (
  <YStack gap="$4">
    <PhoneField
      label="WhatsApp number"
      value={draft.phone}
      defaultCountry={defaultCountry}
      onChangeText={(t) => {
        onPatch({ phone: t });
        onClearError('phone');
      }}
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
