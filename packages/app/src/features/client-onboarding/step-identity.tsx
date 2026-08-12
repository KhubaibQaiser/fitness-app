'use client';

import { DateField, FormField, SegmentedControl, todayCalendarDate, YStack } from '@gymos/ui';
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

    <DateField
      label="Date of birth"
      value={draft.dob}
      onChange={(dob) => {
        onPatch({ dob });
        onClearError('dob');
      }}
      maxDate={todayCalendarDate()}
      error={errors.dob ?? null}
      hint="Optional — age 30 assumed for targets until set"
    />
  </YStack>
);
