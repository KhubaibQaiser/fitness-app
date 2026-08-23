'use client';

import { useState } from 'react';
import { type Food, type Restriction } from '@gymos/contracts';
import { formatRestrictionLabel } from '@gymos/core/nutrition';
import {
  Body,
  Card,
  GhostButton,
  IconButton,
  Muted,
  Row,
  SectionTitle,
  X,
  YStack,
} from '@gymos/ui';
import { DietaryChips } from '../dietary/dietary-chips';
import { PlanFoodPicker } from '../plan/plan-food-picker';
import type { OnboardingDraft } from './onboarding-types';

export const StepDiet = ({
  draft,
  onPatch,
}: {
  draft: OnboardingDraft;
  onPatch: (partial: Partial<OnboardingDraft>) => void;
}) => {
  const [addPreferredOpen, setAddPreferredOpen] = useState(false);
  const selection = new Map(draft.dietary.map((r) => [r.code, r]));
  const preferredEntries = draft.dietary.filter((r) => r.type === 'PREFERRED');

  const onToggle = (code: string, type: Restriction['type']) => {
    const next = draft.dietary.some((r) => r.code === code)
      ? draft.dietary.filter((r) => r.code !== code)
      : [...draft.dietary, { type, code }];
    onPatch({ dietary: next });
  };

  // ADR-0015 D6 — same convention as the dietary profile editor: `note`
  // caches the food's display name so the list never needs a lookup for a
  // code that is otherwise just an opaque `preferred:<uuid>`.
  const addPreferred = (food: Food) => {
    const code = `preferred:${food.id}`;
    const next = [
      ...draft.dietary.filter((r) => r.code !== code),
      { type: 'PREFERRED' as const, code, note: food.name },
    ];
    onPatch({ dietary: next });
    setAddPreferredOpen(false);
  };

  const removePreferred = (code: string) => {
    onPatch({ dietary: draft.dietary.filter((r) => r.code !== code) });
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
      <YStack gap="$2">
        <SectionTitle>Preferred foods</SectionTitle>
        <Card gap="$3">
          <Muted fontSize={12}>
            Boosts these foods&apos; odds of being picked by the AI planner.
          </Muted>
          {preferredEntries.length > 0 ? (
            <YStack gap="$1">
              {preferredEntries.map((r) => (
                <Row key={r.code} minHeight={44}>
                  <Body flex={1} minWidth={0}>
                    {r.note ?? formatRestrictionLabel(r.code)}
                  </Body>
                  <IconButton
                    aria-label={`Remove ${r.note ?? formatRestrictionLabel(r.code)} from preferred foods`}
                    icon={<X size={16} color="$color" />}
                    onPress={() => removePreferred(r.code)}
                  />
                </Row>
              ))}
            </YStack>
          ) : null}
          <GhostButton onPress={() => setAddPreferredOpen((open) => !open)}>
            {addPreferredOpen ? 'Cancel' : '+ Add preferred food'}
          </GhostButton>
          {addPreferredOpen ? <PlanFoodPicker busy={false} onSelect={addPreferred} /> : null}
        </Card>
      </YStack>
    </YStack>
  );
};
