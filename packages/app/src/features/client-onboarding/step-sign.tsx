'use client';

import type { UnitPrefs } from '@gymos/core/units';
import {
  AlertBanner,
  AlertTriangle,
  Body,
  SectionTitle,
  StaggerItem,
  Text,
  YStack,
} from '@gymos/ui';
import type { GoalPreview } from '../../lib/goal-preview';
import { buildPreviewJourney } from '../client-journey/client-journey';
import { ClientJourneyMap } from '../client-journey/client-journey-map';
import { GoalEnergySummary } from './goal-energy-summary';
import { OnboardingClientSummary } from './onboarding-client-summary';
import { OnboardingGoalSummary } from './onboarding-goal-summary';
import type { OnboardingDraft } from './onboarding-types';
import { SignaturePad } from './signature-pad';
import { resolveWeightKg } from './validate-step';

export const StepSign = ({
  draft,
  errors,
  prefs,
  preview,
  onPatch,
  onClearError,
}: {
  draft: OnboardingDraft;
  errors: Record<string, string>;
  prefs: UnitPrefs;
  preview: GoalPreview | null;
  onPatch: (partial: Partial<OnboardingDraft>) => void;
  onClearError: (key: string) => void;
}) => {
  const startWeightKg =
    resolveWeightKg(draft.startWeightKg, prefs) ?? resolveWeightKg(draft.weightKg, prefs);
  const targetWeightKg = resolveWeightKg(draft.targetWeightKg, prefs);
  const journey =
    preview !== null && startWeightKg !== null
      ? buildPreviewJourney({
          startDate: new Date().toISOString().slice(0, 10),
          startWeightKg,
          targetWeightKg,
          expectedWeeklyDeltaKg: preview.expectedWeeklyDeltaKg,
        })
      : [];

  return (
    <YStack gap="$7">
      {preview !== null ? (
        <>
          <StaggerItem index={0}>
            <OnboardingClientSummary draft={draft} prefs={prefs} ageYears={preview.ageYears} />
          </StaggerItem>
          <StaggerItem index={1}>
            <OnboardingGoalSummary draft={draft} prefs={prefs} preview={preview} />
          </StaggerItem>
          <StaggerItem index={2}>
            <GoalEnergySummary preview={preview} />
          </StaggerItem>
          <StaggerItem index={3}>
            <ClientJourneyMap
              nodes={journey}
              weightUnit={prefs.weight}
              title="Your expected journey"
              subtitle="A projection from today to the goal. Weekly check-ins keep this path honest and adaptable."
            />
          </StaggerItem>
          {preview.paceAdjustment !== null && !preview.kcalOverridden ? (
            <AlertBanner tone="warning" title={preview.paceAdjustment.title}>
              {preview.paceAdjustment.detail}
            </AlertBanner>
          ) : null}
          {preview.kcalOverridden || preview.beyondRecommended || preview.belowSexFloor ? (
            <AlertBanner
              tone={preview.belowSexFloor ? 'danger' : 'warning'}
              title={
                preview.belowSexFloor
                  ? 'Calorie target is below the sex floor'
                  : preview.beyondRecommended
                    ? 'Calorie target is beyond the recommended pace'
                    : 'Calorie target was overridden'
              }
              icon={preview.belowSexFloor ? <AlertTriangle size={18} color="$danger" /> : undefined}
            >
              {preview.belowSexFloor
                ? `Chosen ${preview.targetKcal.toLocaleString()} kcal is below the usual calorie floor (suggested ${preview.recommendedKcal.toLocaleString()} kcal). This may not be healthy. You can still create the client — targets stay estimates and are reviewed at every check-in.`
                : `Chosen ${preview.targetKcal.toLocaleString()} kcal differs from the suggested ${preview.recommendedKcal.toLocaleString()} kcal for this pace. This override may not be appropriate for every client. You can still create the client — targets stay estimates and are reviewed at every check-in.`}
            </AlertBanner>
          ) : null}
          {preview.safetyIssue !== null ? (
            <AlertBanner
              tone="danger"
              title={preview.safetyIssue.title}
              icon={<AlertTriangle size={18} color="$danger" />}
            >
              {preview.safetyIssue.detail}
            </AlertBanner>
          ) : null}
        </>
      ) : (
        <AlertBanner tone="warning" title="Plan preview is not available">
          Return to the body and goal steps to complete the information needed for calorie and
          timeline estimates.
        </AlertBanner>
      )}

      <YStack gap="$3" paddingTop="$2">
        <YStack gap="$1">
          <SectionTitle>Client consent</SectionTitle>
          <Text fontFamily="$heading" fontSize={22} fontWeight="800" color="$color">
            Review, then sign
          </Text>
          <Body color="$textMuted">
            The signature confirms the intake details and acknowledges that targets are estimates
            reviewed at every check-in.
          </Body>
        </YStack>
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
    </YStack>
  );
};
