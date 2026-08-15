'use client';

import { useRouter } from 'solito/navigation';
import type { OnboardClientInput } from '@gymos/contracts';
import { Body, Card, PageHeader, YStack } from '@gymos/ui';
import { useMe, useOnboardClient, usePublicConfig } from '../../api';
import { defaultCountryFrom, unitPrefsFrom } from '../../lib/unit-prefs';
import { AppScreen } from '../shell/app-screen';
import { OnboardingFooter } from './onboarding-footer';
import { buildOnboardingPreview } from './onboarding-preview';
import { OnboardingProgress } from './onboarding-progress';
import { STEP_META } from './onboarding-types';
import { StepBody } from './step-body';
import { StepContact } from './step-contact';
import { StepDiet } from './step-diet';
import { StepGoal } from './step-goal';
import { StepHeight } from './step-height';
import { StepIdentity } from './step-identity';
import { StepMedical } from './step-medical';
import { StepSign } from './step-sign';
import { useOnboardingDraft } from './use-onboarding-draft';
import {
  parseConditions,
  resolveHeightCm,
  resolveLengthCm,
  resolvePhoneE164,
  resolveWeightKg,
  validateStep,
} from './validate-step';

/** Full-screen multi-step client onboarding wizard. */
export const ClientOnboardingScreen = () => {
  const router = useRouter();
  const onboard = useOnboardClient();
  const me = useMe();
  const config = usePublicConfig();
  const { draft, patch, stepIndex, setStepIndex, errors, setErrors, clearError } =
    useOnboardingDraft();

  const prefs = unitPrefsFrom(me.data, config.data);
  const defaultCountry = defaultCountryFrom(me.data, config.data);
  const isLast = stepIndex === STEP_META.length - 1;
  const meta = STEP_META[stepIndex];
  const stepId = meta?.id;
  const preview = buildOnboardingPreview(draft, prefs, config.data);
  const previewBlocked = preview?.safetyIssue !== null;
  const goalStepIndex = STEP_META.findIndex((step) => step.id === 'goal');

  const goNext = () => {
    if (stepId === undefined) return;
    if (isLast && previewBlocked) return;
    const nextErrors = validateStep(stepId, draft, prefs, defaultCountry);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    if (!isLast) {
      setStepIndex((i) => i + 1);
      return;
    }

    if (onboard.isPending) return;
    const heightCm = resolveHeightCm(draft, prefs);
    const weightKg = resolveWeightKg(draft.weightKg, prefs);
    const startWeightKg = resolveWeightKg(draft.startWeightKg, prefs) ?? weightKg;
    const targetWeightKg = resolveWeightKg(draft.targetWeightKg, prefs);
    const phone = resolvePhoneE164(draft.phone, defaultCountry);
    if (
      heightCm === null ||
      weightKg === null ||
      startWeightKg === null ||
      targetWeightKg === null
    ) {
      return;
    }
    if (phone === null) return;
    if (draft.signaturePngBase64 === null) return;

    const conditions = parseConditions(draft.medicalConditions);
    const optionalCm = (raw: string): number | undefined => {
      const n = resolveLengthCm(raw, prefs);
      return n ?? undefined;
    };

    const payload: OnboardClientInput = {
      client: {
        name: draft.name.trim(),
        sex: draft.sex,
        ...(draft.dob.trim() !== '' ? { dob: draft.dob.trim() } : {}),
        phone,
        ...(draft.email.trim() !== '' ? { email: draft.email.trim() } : {}),
        heightCm,
        activityLevel: Number(draft.activityLevel) as OnboardClientInput['client']['activityLevel'],
        medicalFlags: {
          physicianClearanceRequired: draft.physicianClearanceRequired,
          ...(conditions.length > 0 ? { conditions } : {}),
          ...(draft.sex === 'F' && draft.pregnant ? { pregnant: true } : {}),
        },
        intake: {
          signaturePngBase64: draft.signaturePngBase64,
          signedAt: new Date().toISOString(),
          heightDisplayUnit: prefs.height,
        },
      },
      vitals: {
        weightKg,
        ...(() => {
          const measures: {
            waistCm?: number;
            chestCm?: number;
            hipCm?: number;
            armLeftCm?: number;
            armRightCm?: number;
            thighLeftCm?: number;
            thighRightCm?: number;
          } = {};
          const waistCm = optionalCm(draft.waistCm);
          const chestCm = optionalCm(draft.chestCm);
          const hipCm = optionalCm(draft.hipCm);
          const armLeftCm = optionalCm(draft.armLeftCm);
          const armRightCm = optionalCm(draft.armRightCm);
          const thighLeftCm = optionalCm(draft.thighLeftCm);
          const thighRightCm = optionalCm(draft.thighRightCm);
          if (waistCm !== undefined) measures.waistCm = waistCm;
          if (chestCm !== undefined) measures.chestCm = chestCm;
          if (hipCm !== undefined) measures.hipCm = hipCm;
          if (armLeftCm !== undefined) measures.armLeftCm = armLeftCm;
          if (armRightCm !== undefined) measures.armRightCm = armRightCm;
          if (thighLeftCm !== undefined) measures.thighLeftCm = thighLeftCm;
          if (thighRightCm !== undefined) measures.thighRightCm = thighRightCm;
          return measures;
        })(),
      },
      goal: {
        preset: draft.goalPreset,
        rate: draft.goalRate,
        startWeightKg,
        targetWeightKg,
      },
      ...(draft.dietary.length > 0 ? { dietary: draft.dietary } : {}),
    };

    onboard.mutate(payload, {
      onSuccess: (result) => router.replace(`/clients/${result.client.id}`),
    });
  };

  return (
    <AppScreen
      footer={
        <OnboardingFooter
          canGoBack={stepIndex > 0}
          isLast={isLast}
          pending={onboard.isPending}
          nextDisabled={isLast && previewBlocked}
          onBack={() => {
            setErrors({});
            if (isLast && previewBlocked) {
              setStepIndex(goalStepIndex);
              return;
            }
            setStepIndex((i) => Math.max(0, i - 1));
          }}
          onNext={goNext}
        />
      }
    >
      <PageHeader title={meta?.title ?? 'Onboarding'} subtitle="New client" />
      <OnboardingProgress stepIndex={stepIndex} />

      {stepId === 'sign' ? (
        <YStack gap="$4">
          <StepSign
            draft={draft}
            errors={errors}
            prefs={prefs}
            preview={preview}
            onPatch={patch}
            onClearError={clearError}
          />
          {onboard.isError ? (
            <Body color="$danger" role="alert">
              {onboard.error.message}
            </Body>
          ) : null}
        </YStack>
      ) : (
        <Card gap="$4">
          {stepId === 'identity' ? (
            <StepIdentity draft={draft} errors={errors} onPatch={patch} onClearError={clearError} />
          ) : null}
          {stepId === 'height' ? (
            <StepHeight
              draft={draft}
              errors={errors}
              prefs={prefs}
              onPatch={patch}
              onClearError={clearError}
            />
          ) : null}
          {stepId === 'contact' ? (
            <StepContact
              draft={draft}
              errors={errors}
              defaultCountry={defaultCountry}
              onPatch={patch}
              onClearError={clearError}
            />
          ) : null}
          {stepId === 'body' ? (
            <StepBody
              draft={draft}
              errors={errors}
              prefs={prefs}
              onPatch={patch}
              onClearError={clearError}
            />
          ) : null}
          {stepId === 'goal' ? (
            <StepGoal
              draft={draft}
              errors={errors}
              prefs={prefs}
              onPatch={patch}
              onClearError={clearError}
            />
          ) : null}
          {stepId === 'medical' ? <StepMedical draft={draft} onPatch={patch} /> : null}
          {stepId === 'diet' ? <StepDiet draft={draft} onPatch={patch} /> : null}
          {onboard.isError ? (
            <Body color="$danger" role="alert">
              {onboard.error.message}
            </Body>
          ) : null}
        </Card>
      )}
    </AppScreen>
  );
};
