'use client';

import { Body, FormField, SegmentedControl, YStack } from '@gymos/ui';
import type { OnboardingDraft } from './onboarding-types';

export const StepIdentity = ({
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
      label="Full name"
      value={draft.name}
      onChangeText={(t) => {
        onPatch({ name: t });
        onClearError('name');
      }}
      placeholder="e.g. Adnan Khan"
      required
      error={errors.name ?? null}
    />

    <YStack gap="$2">
      <Body fontFamily="$heading" fontWeight="700" fontSize={13}>
        Gender
      </Body>
      <SegmentedControl
        ariaLabel="Gender"
        options={[
          { value: 'M', label: 'Male' },
          { value: 'F', label: 'Female' },
        ]}
        value={draft.sex}
        onChange={(sex) => onPatch({ sex })}
      />
    </YStack>

    <FormField
      label="Date of birth"
      value={draft.dob}
      onChangeText={(t) => {
        onPatch({ dob: t });
        onClearError('dob');
      }}
      placeholder="YYYY-MM-DD"
      error={errors.dob ?? null}
      hint="Optional — age 30 assumed for targets until set"
    />
  </YStack>
);
