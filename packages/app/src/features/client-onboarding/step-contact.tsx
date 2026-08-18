'use client';

import { FormField, useFocusChain, YStack } from '@gymos/ui';
import type { OnboardingDraft } from './onboarding-types';
import { PhoneField } from './phone-field';

export const StepContact = ({
  draft,
  errors,
  defaultCountry,
  onPatch,
  onClearError,
  onComplete,
}: {
  draft: OnboardingDraft;
  errors: Record<string, string>;
  defaultCountry: string;
  onPatch: (partial: Partial<OnboardingDraft>) => void;
  onClearError: (key: string) => void;
  onComplete: () => void;
}) => {
  const chain = useFocusChain(['phone', 'email'], { onSubmit: onComplete });

  return (
    <YStack gap="$4">
      {chain.toolbar}
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
        field={chain.bind('phone')}
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
        {...chain.bind('email')}
      />
    </YStack>
  );
};
