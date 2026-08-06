'use client';

import { Body, Card, Muted, YStack } from '@gymos/ui';
import type { OnboardingDraft } from './onboarding-types';
import { SignaturePad } from './signature-pad';

export const StepSign = ({
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
    <Card gap="$2">
      <Body fontWeight="800">{draft.name || 'Client'}</Body>
      <Muted>
        {draft.sex === 'M' ? 'Male' : 'Female'}
        {draft.dob ? ` · DOB ${draft.dob}` : ' · DOB not set (age 30 assumed)'}
      </Muted>
      <Muted>
        Height{' '}
        {draft.heightUnit === 'cm'
          ? `${draft.heightCm} cm`
          : `${draft.heightFt}'${draft.heightIn}"`}{' '}
        · {draft.weightKg} kg
      </Muted>
      <Muted>
        Goal {draft.goalPreset} / {draft.goalRate}
        {draft.targetWeightKg ? ` → ${draft.targetWeightKg} kg` : ''}
      </Muted>
      <Muted>
        Contact {draft.phone || '—'}
        {draft.email ? ` · ${draft.email}` : ''}
      </Muted>
    </Card>

    <SignaturePad
      onChange={(signaturePngBase64) => {
        onPatch({ signaturePngBase64 });
        onClearError('signature');
      }}
    />
    {errors.signature ? (
      <Body color="$danger" role="alert">
        {errors.signature}
      </Body>
    ) : null}
  </YStack>
);
