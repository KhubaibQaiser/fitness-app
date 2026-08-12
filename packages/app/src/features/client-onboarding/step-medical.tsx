'use client';

import { Body, FormField, IosSwitch, XStack, YStack } from '@gymos/ui';
import type { OnboardingDraft } from './onboarding-types';

export const StepMedical = ({
  draft,
  onPatch,
}: {
  draft: OnboardingDraft;
  onPatch: (partial: Partial<OnboardingDraft>) => void;
}) => (
  <YStack gap="$4">
    <FormField
      label="Medical conditions / diseases"
      value={draft.medicalConditions}
      onChangeText={(t) => onPatch({ medicalConditions: t })}
      placeholder="e.g. hypertension, asthma"
      multiline
      numberOfLines={4}
      hint="Optional — one per line or comma-separated"
    />

    <XStack alignItems="center" justifyContent="space-between" minHeight={48} gap="$3">
      <Body flex={1}>Physician clearance required?</Body>
      <IosSwitch
        checked={draft.physicianClearanceRequired}
        onCheckedChange={(v) => onPatch({ physicianClearanceRequired: v })}
        aria-label="Physician clearance required"
      />
    </XStack>

    {draft.sex === 'F' ? (
      <XStack alignItems="center" justifyContent="space-between" minHeight={48} gap="$3">
        <Body flex={1}>Currently pregnant</Body>
        <IosSwitch
          checked={draft.pregnant}
          onCheckedChange={(v) => onPatch({ pregnant: v })}
          aria-label="Currently pregnant"
        />
      </XStack>
    ) : null}
  </YStack>
);
