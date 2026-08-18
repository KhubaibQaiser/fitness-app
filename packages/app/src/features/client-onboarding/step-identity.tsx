'use client';

import {
  calendarDateYearsAgo,
  DateField,
  FormField,
  SegmentedControl,
  todayCalendarDate,
  useFocusChain,
  YStack,
} from '@gymos/ui';
import type { OnboardingDraft } from './onboarding-types';

export const StepIdentity = ({
  draft,
  errors,
  onPatch,
  onClearError,
  onComplete,
}: {
  draft: OnboardingDraft;
  errors: Record<string, string>;
  onPatch: (partial: Partial<OnboardingDraft>) => void;
  onClearError: (key: string) => void;
  onComplete: () => void;
}) => {
  const chain = useFocusChain(['name'], { onSubmit: onComplete });

  return (
    <YStack gap="$4">
      {chain.toolbar}
      <FormField
        label="Full name"
        value={draft.name}
        onChangeText={(t) => {
          onPatch({ name: t });
          onClearError('name');
        }}
        placeholder="e.g. Adnan Khan"
        autoComplete="name"
        autoCapitalize="words"
        required
        error={errors.name ?? null}
        {...chain.bind('name')}
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
        minDate={calendarDateYearsAgo(120)}
        error={errors.dob ?? null}
        hint="Optional — age 30 assumed for targets until set"
      />
    </YStack>
  );
};
