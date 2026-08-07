'use client';

import { useState } from 'react';
import { Link } from 'solito/link';
import { useRouter } from 'solito/navigation';
import { ApiError } from '@gymos/contracts';
import {
  Body,
  Card,
  FormField,
  GhostButton,
  Muted,
  PageHeader,
  PrimaryButton,
  SegmentedControl,
  YStack,
} from '@gymos/ui';
import { useClientDetail, useCreateGoal } from '../../api';
import { AppScreen } from '../shell/app-screen';

const PRESETS = [
  { value: 'LOSE', label: 'Lose fat' },
  { value: 'RECOMP', label: 'Recomp' },
  { value: 'MAINTAIN', label: 'Maintain' },
  { value: 'GAIN', label: 'Gain' },
] as const;

const RATES = [
  { value: 'CONSERVATIVE', label: 'Gentle' },
  { value: 'STANDARD', label: 'Standard' },
  { value: 'AGGRESSIVE', label: 'Aggressive' },
] as const;

/** Goal setup — presets in, deterministic Layer-1 targets out. */
export const GoalFormScreen = ({ clientId }: { clientId: string }) => {
  const router = useRouter();
  const detail = useClientDetail(clientId);
  const create = useCreateGoal(clientId);
  const [preset, setPreset] = useState<(typeof PRESETS)[number]['value']>('LOSE');
  const [rate, setRate] = useState<(typeof RATES)[number]['value']>('STANDARD');
  const [startWeight, setStartWeight] = useState('');
  const [targetWeight, setTargetWeight] = useState('');
  const [errors, setErrors] = useState<{ start?: string; target?: string; form?: string }>({});

  const latest = detail.data?.latestWeightKg;
  const effectiveStart =
    startWeight !== '' ? startWeight : latest !== null ? String(latest ?? '') : '';

  const submit = () => {
    const next: typeof errors = {};
    if (effectiveStart === '' || Number(effectiveStart) <= 0) {
      next.start = 'Enter a starting weight greater than zero';
    }
    if (targetWeight !== '' && Number(targetWeight) <= 0) {
      next.target = 'Target must be greater than zero';
    }
    if (Object.keys(next).length > 0) {
      setErrors(next);
      return;
    }
    if (create.isPending) return;
    setErrors({});
    create.mutate(
      {
        preset,
        rate,
        startWeightKg: Number(effectiveStart),
        ...(targetWeight !== '' ? { targetWeightKg: Number(targetWeight) } : {}),
      },
      {
        onSuccess: () => router.replace(`/clients/${clientId}`),
        onError: (e) => {
          setErrors({
            form:
              e instanceof ApiError && e.code === 'NUTRITION_REFUSAL'
                ? 'These settings would breach the calorie safety floor. Choose a gentler rate.'
                : e instanceof ApiError && e.code === 'CLIENT_PROFILE_INCOMPLETE'
                  ? 'Complete the client profile first (height, activity).'
                  : e.message,
          });
        },
      },
    );
  };

  return (
    <AppScreen>
      <PageHeader
        title="Set goal"
        subtitle="Targets come from Mifflin–St Jeor with hard floors"
        action={
          <Link href="/settings/nutrition">
            <GhostButton>How it works</GhostButton>
          </Link>
        }
      />
      <Card gap="$4">
        <YStack gap="$2">
          <Body fontFamily="$heading" fontWeight="700" fontSize={13}>
            Goal
          </Body>
          <SegmentedControl
            ariaLabel="Goal preset"
            options={[...PRESETS]}
            value={preset}
            onChange={setPreset}
          />
        </YStack>

        <YStack gap="$2">
          <Body fontFamily="$heading" fontWeight="700" fontSize={13}>
            Pace
          </Body>
          <SegmentedControl ariaLabel="Pace" options={[...RATES]} value={rate} onChange={setRate} />
        </YStack>

        <FormField
          label="Starting weight (kg)"
          value={effectiveStart}
          onChangeText={(t) => {
            setStartWeight(t);
            setErrors(({ start: _removed, ...rest }) => rest);
          }}
          placeholder={latest !== null && latest !== undefined ? String(latest) : '80'}
          inputMode="decimal"
          required
          error={errors.start ?? null}
        />

        <FormField
          label="Target weight (kg)"
          value={targetWeight}
          onChangeText={(t) => {
            setTargetWeight(t);
            setErrors(({ target: _removed, ...rest }) => rest);
          }}
          placeholder="Optional"
          inputMode="decimal"
          error={errors.target ?? null}
        />

        {errors.form ? (
          <Body color="$danger" role="alert">
            {errors.form}
          </Body>
        ) : null}

        <PrimaryButton disabled={create.isPending} onPress={submit}>
          {create.isPending ? 'Computing targets…' : 'Create goal'}
        </PrimaryButton>
        <GhostButton onPress={() => router.back()}>Cancel</GhostButton>
        <Muted fontSize={12}>
          The AI never invents numbers. Weekly check-ins keep the plan adaptive.
        </Muted>
      </Card>
    </AppScreen>
  );
};
