'use client';

import { useRouter } from 'solito/navigation';
import type { OnboardClientInput } from '@gymos/contracts';
import { Body, Card, PageHeader, YStack } from '@gymos/ui';
import { useOnboardClient } from '../../api';
import { AppScreen } from '../shell/app-screen';
import { parsePositive } from './height-units';
import { OnboardingFooter } from './onboarding-footer';
import { OnboardingProgress } from './onboarding-progress';
import { STEP_META } from './onboarding-types';
import { StepActivity } from './step-activity';
import { StepBody } from './step-body';
import { StepContact } from './step-contact';
import { StepGoal } from './step-goal';
import { StepHeight } from './step-height';
import { StepIdentity } from './step-identity';
import { StepMedical } from './step-medical';
import { StepSign } from './step-sign';
import { useOnboardingDraft } from './use-onboarding-draft';
import { parseConditions, resolveHeightCm, validateStep } from './validate-step';

/** Full-screen multi-step client onboarding wizard. */
export const ClientOnboardingScreen = () => {
  const router = useRouter();
  const onboard = useOnboardClient();
  const { draft, patch, stepIndex, setStepIndex, errors, setErrors, clearError } =
    useOnboardingDraft();

  const isLast = stepIndex === STEP_META.length - 1;
  const meta = STEP_META[stepIndex];

  const goNext = () => {
    const nextErrors = validateStep(stepIndex, draft);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    if (!isLast) {
      setStepIndex((i) => i + 1);
      return;
    }

    if (onboard.isPending) return;
    const heightCm = resolveHeightCm(draft);
    const weightKg = parsePositive(draft.weightKg);
    const startWeightKg = parsePositive(draft.startWeightKg) ?? weightKg;
    if (heightCm === null || weightKg === null || startWeightKg === null) return;
    if (draft.signaturePngBase64 === null) return;

    const conditions = parseConditions(draft.medicalConditions);
    const optionalCm = (raw: string): number | undefined => {
      const n = parsePositive(raw);
      return n ?? undefined;
    };

    const payload: OnboardClientInput = {
      client: {
        name: draft.name.trim(),
        sex: draft.sex,
        ...(draft.dob.trim() !== '' ? { dob: draft.dob.trim() } : {}),
        phone: draft.phone.trim(),
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
          heightDisplayUnit: draft.heightUnit,
        },
      },
      vitals: {
        weightKg,
        ...(() => {
          const measures: {
            waistCm?: number;
            chestCm?: number;
            hipCm?: number;
            armCm?: number;
            thighCm?: number;
          } = {};
          const waistCm = optionalCm(draft.waistCm);
          const chestCm = optionalCm(draft.chestCm);
          const hipCm = optionalCm(draft.hipCm);
          const armCm = optionalCm(draft.armCm);
          const thighCm = optionalCm(draft.thighCm);
          if (waistCm !== undefined) measures.waistCm = waistCm;
          if (chestCm !== undefined) measures.chestCm = chestCm;
          if (hipCm !== undefined) measures.hipCm = hipCm;
          if (armCm !== undefined) measures.armCm = armCm;
          if (thighCm !== undefined) measures.thighCm = thighCm;
          return measures;
        })(),
      },
      goal: {
        preset: draft.goalPreset,
        rate: draft.goalRate,
        startWeightKg,
        ...(() => {
          const target = parsePositive(draft.targetWeightKg);
          return target !== null ? { targetWeightKg: target } : {};
        })(),
      },
    };

    onboard.mutate(payload, {
      onSuccess: (result) => router.replace(`/clients/${result.client.id}`),
    });
  };

  return (
    <AppScreen>
      <PageHeader title={meta?.title ?? 'Onboarding'} subtitle="New client" />
      <OnboardingProgress stepIndex={stepIndex} />

      <Card gap="$4">
        {stepIndex === 0 ? (
          <StepIdentity draft={draft} errors={errors} onPatch={patch} onClearError={clearError} />
        ) : null}
        {stepIndex === 1 ? (
          <StepHeight draft={draft} errors={errors} onPatch={patch} onClearError={clearError} />
        ) : null}
        {stepIndex === 2 ? (
          <StepContact draft={draft} errors={errors} onPatch={patch} onClearError={clearError} />
        ) : null}
        {stepIndex === 3 ? <StepActivity draft={draft} onPatch={patch} /> : null}
        {stepIndex === 4 ? (
          <StepBody draft={draft} errors={errors} onPatch={patch} onClearError={clearError} />
        ) : null}
        {stepIndex === 5 ? (
          <StepGoal draft={draft} errors={errors} onPatch={patch} onClearError={clearError} />
        ) : null}
        {stepIndex === 6 ? <StepMedical draft={draft} onPatch={patch} /> : null}
        {stepIndex === 7 ? (
          <StepSign draft={draft} errors={errors} onPatch={patch} onClearError={clearError} />
        ) : null}

        {onboard.isError ? (
          <Body color="$danger" role="alert">
            {onboard.error.message}
          </Body>
        ) : null}

        <OnboardingFooter
          canGoBack={stepIndex > 0}
          isLast={isLast}
          pending={onboard.isPending}
          onBack={() => {
            setErrors({});
            setStepIndex((i) => Math.max(0, i - 1));
          }}
          onNext={goNext}
        />
      </Card>

      <YStack height={24} />
    </AppScreen>
  );
};
