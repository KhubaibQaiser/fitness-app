'use client';

import { useEffect, useRef, useState } from 'react';
import { Link } from 'solito/link';
import { useRouter } from 'solito/navigation';
import { ApiError } from '@gymos/contracts';
import { formatWeight } from '@gymos/core/units';
import {
  AlertBanner,
  Body,
  Card,
  GhostButton,
  Muted,
  PageHeader,
  PrimaryButton,
  StickyFormFooter,
} from '@gymos/ui';
import { useClientDetail, useMe, usePublicConfig, useSaveActiveGoal } from '../../api';
import { ACTIVITY_LEVELS, type ActivityLevelValue } from '../../lib/activity-levels';
import { unitPrefsFrom } from '../../lib/unit-prefs';
import { resolveWeightKg } from '../client-onboarding/validate-step';
import { AppScreen } from '../shell/app-screen';
import { GoalFields, type GoalFieldsValue } from './goal-fields';

const activityLevelFrom = (value: number | null): ActivityLevelValue =>
  ACTIVITY_LEVELS.find((option) => Number(option.value) === value)?.value ?? '1.55';

/** Goal setup/edit — presets in, deterministic Layer-1 targets out. */
export const GoalFormScreen = ({ clientId }: { clientId: string }) => {
  const router = useRouter();
  const detail = useClientDetail(clientId);
  const me = useMe();
  const config = usePublicConfig();
  const save = useSaveActiveGoal(clientId);
  const initialized = useRef(false);
  const prefs = unitPrefsFrom(me.data, config.data);
  const [value, setValue] = useState<GoalFieldsValue>({
    activityLevel: '1.55',
    goalPreset: 'LOSE',
    goalRate: 'STANDARD',
    startWeightKg: '',
    targetWeightKg: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (
      initialized.current ||
      detail.data === undefined ||
      me.data === undefined ||
      config.data === undefined
    ) {
      return;
    }
    const goal = detail.data.goal;
    const latestWeightKg = detail.data.latestWeightKg;
    setValue({
      activityLevel: activityLevelFrom(detail.data.client.activityLevel),
      goalPreset: goal?.preset ?? 'LOSE',
      goalRate: goal?.rate ?? 'STANDARD',
      startWeightKg:
        goal !== null
          ? String(formatWeight(goal.startWeightKg, prefs.weight).value)
          : latestWeightKg !== null
            ? String(formatWeight(latestWeightKg, prefs.weight).value)
            : '',
      targetWeightKg:
        goal?.targetWeightKg !== null && goal?.targetWeightKg !== undefined
          ? String(formatWeight(goal.targetWeightKg, prefs.weight).value)
          : '',
    });
    initialized.current = true;
  }, [config.data, detail.data, me.data, prefs.weight]);

  const medicalFlags = detail.data?.client.medicalFlags ?? null;
  const medicalParts: string[] = [];
  if (medicalFlags?.pregnant === true) medicalParts.push('pregnancy noted');
  if (medicalFlags?.physicianClearanceRequired === true) {
    medicalParts.push('physician clearance required');
  }
  const conditions = medicalFlags?.conditions ?? [];
  if (conditions.length > 0) medicalParts.push(conditions.join(', '));
  const medicalSummary = medicalParts.length > 0 ? medicalParts.join(' · ') : null;
  const isEditing = detail.data?.goal !== null && detail.data?.goal !== undefined;

  const clearError = (key: string) => {
    setErrors((current) => {
      if (!(key in current)) return current;
      const { [key]: _removed, ...rest } = current;
      return rest;
    });
  };

  const submit = () => {
    const startWeightKg = resolveWeightKg(value.startWeightKg, prefs);
    const targetWeightKg = resolveWeightKg(value.targetWeightKg, prefs);
    const nextErrors: Record<string, string> = {};
    if (startWeightKg === null || startWeightKg < 20 || startWeightKg > 400) {
      nextErrors.startWeightKg = 'Enter a starting weight between 20 and 400 kg equivalent';
    }
    if (targetWeightKg === null || targetWeightKg < 20 || targetWeightKg > 400) {
      nextErrors.targetWeightKg = 'Enter a target weight between 20 and 400 kg equivalent';
    }
    if (Object.keys(nextErrors).length > 0 || startWeightKg === null || targetWeightKg === null) {
      setErrors(nextErrors);
      return;
    }
    if (save.isPending) return;
    setErrors({});
    save.mutate(
      {
        activityLevel: Number(value.activityLevel) as 1.2 | 1.375 | 1.55 | 1.725 | 1.9,
        preset: value.goalPreset,
        rate: value.goalRate,
        startWeightKg,
        targetWeightKg,
      },
      {
        onSuccess: () => router.replace(`/clients/${clientId}`),
        onError: (error) => {
          setErrors({
            form:
              error instanceof ApiError && error.code === 'NUTRITION_REFUSAL'
                ? 'These settings cannot fit minimum protein and fat at a safe calorie target. Choose a gentler rate or review body-weight inputs.'
                : error instanceof ApiError && error.code === 'CLIENT_PROFILE_INCOMPLETE'
                  ? 'Complete the client profile first (height and activity).'
                  : error.message,
          });
        },
      },
    );
  };

  return (
    <AppScreen
      footer={
        <StickyFormFooter>
          <GhostButton flex={1} onPress={() => router.back()}>
            Cancel
          </GhostButton>
          <PrimaryButton
            flex={1}
            disabled={!initialized.current || save.isPending}
            onPress={submit}
          >
            {save.isPending ? 'Computing targets…' : isEditing ? 'Save changes' : 'Create goal'}
          </PrimaryButton>
        </StickyFormFooter>
      }
    >
      <PageHeader
        title={isEditing ? 'Edit goal' : 'Set goal'}
        subtitle="Targets come from Mifflin–St Jeor with hard floors"
        action={
          <Link href="/settings/nutrition">
            <GhostButton>How it works</GhostButton>
          </Link>
        }
      />
      {medicalSummary !== null ? (
        <AlertBanner tone="warning" title="Medical flags on file">
          {medicalSummary}. Use clinical judgment — GymOS is not medical advice.
        </AlertBanner>
      ) : null}
      <Card gap="$4">
        <GoalFields
          value={value}
          errors={errors}
          prefs={prefs}
          onChange={(partial) => setValue((current) => ({ ...current, ...partial }))}
          onClearError={clearError}
        />

        {errors.form ? (
          <Body color="$danger" role="alert">
            {errors.form}
          </Body>
        ) : null}

        <Muted fontSize={12}>
          The AI never invents numbers. Weekly check-ins keep the plan adaptive.
        </Muted>
      </Card>
    </AppScreen>
  );
};
