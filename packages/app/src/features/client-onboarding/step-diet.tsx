'use client';

import { type Restriction } from '@gymos/contracts';
import { Body, Card, SectionTitle, YStack } from '@gymos/ui';
import { DietaryChips } from '../dietary/dietary-chips';
import type { OnboardingDraft } from './onboarding-types';

export const StepDiet = ({
  draft,
  onPatch,
}: {
  draft: OnboardingDraft;
  onPatch: (partial: Partial<OnboardingDraft>) => void;
}) => {
  const selection = new Map(draft.dietary.map((r) => [r.code, r]));

  const onToggle = (code: string, type: Restriction['type']) => {
    const next = draft.dietary.some((r) => r.code === code)
      ? draft.dietary.filter((r) => r.code !== code)
      : [...draft.dietary, { type, code }];
    onPatch({ dietary: next });
  };

  return (
    <YStack gap="$4">
      <Body fontSize={13} color="$textMuted">
        Optional: Severe allergies hard-block foods in the meal engine.
      </Body>
      <YStack gap="$2">
        <SectionTitle>Severe allergies</SectionTitle>
        <Card>
          <DietaryChips kind="allergens" selection={selection} onToggle={onToggle} />
        </Card>
      </YStack>
      <YStack gap="$2">
        <SectionTitle>Religious / lifestyle</SectionTitle>
        <Card>
          <DietaryChips kind="religious" selection={selection} onToggle={onToggle} />
        </Card>
      </YStack>
    </YStack>
  );
};
