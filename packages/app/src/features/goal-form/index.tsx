'use client';

import { useState } from 'react';
import { useRouter } from 'solito/navigation';
import { ApiError } from '@gymos/contracts';
import {
  Body,
  Card,
  GhostButton,
  Input,
  Label,
  Muted,
  PrimaryButton,
  Screen,
  Title,
  XStack,
  YStack,
} from '@gymos/ui';
import { useClientDetail, useCreateGoal } from '../../api';

const PRESETS = [
  { value: 'LOSE', label: 'Lose fat' },
  { value: 'RECOMP', label: 'Recomp' },
  { value: 'MAINTAIN', label: 'Maintain' },
  { value: 'GAIN', label: 'Gain muscle' },
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
  const [error, setError] = useState<string | null>(null);

  const latest = detail.data?.latestWeightKg;
  const effectiveStart =
    startWeight !== '' ? startWeight : latest !== null ? String(latest ?? '') : '';
  const valid = effectiveStart !== '' && Number(effectiveStart) > 0;

  const submit = () => {
    if (!valid || create.isPending) return;
    setError(null);
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
          setError(
            e instanceof ApiError && e.code === 'NUTRITION_REFUSAL'
              ? 'These settings would breach the calorie safety floor. Choose a gentler rate.'
              : e instanceof ApiError && e.code === 'CLIENT_PROFILE_INCOMPLETE'
                ? 'Complete the client profile first (height, date of birth, activity).'
                : e.message,
          );
        },
      },
    );
  };

  return (
    <Screen>
      <Title>Set goal</Title>
      <Card gap="$3">
        <YStack gap="$1.5">
          <Label>Goal</Label>
          <XStack gap="$2" flexWrap="wrap">
            {PRESETS.map((p) => (
              <GhostButton
                key={p.value}
                size="$3"
                onPress={() => setPreset(p.value)}
                backgroundColor={preset === p.value ? '$primary' : 'transparent'}
                color={preset === p.value ? '$primaryFg' : '$color'}
              >
                {p.label}
              </GhostButton>
            ))}
          </XStack>
        </YStack>

        <YStack gap="$1.5">
          <Label>Pace</Label>
          <XStack gap="$2">
            {RATES.map((r) => (
              <GhostButton
                key={r.value}
                flex={1}
                size="$3"
                onPress={() => setRate(r.value)}
                backgroundColor={rate === r.value ? '$primary' : 'transparent'}
                color={rate === r.value ? '$primaryFg' : '$color'}
              >
                {r.label}
              </GhostButton>
            ))}
          </XStack>
        </YStack>

        <YStack gap="$1.5">
          <Label>Starting weight (kg)</Label>
          <Input
            value={effectiveStart}
            onChangeText={setStartWeight}
            placeholder={latest !== null && latest !== undefined ? String(latest) : '80'}
            inputMode="decimal"
            size="$4"
          />
        </YStack>

        <YStack gap="$1.5">
          <Label>Target weight (kg, optional)</Label>
          <Input
            value={targetWeight}
            onChangeText={setTargetWeight}
            placeholder="—"
            inputMode="decimal"
            size="$4"
          />
        </YStack>

        {error !== null ? <Body color="$danger">{error}</Body> : null}
        <PrimaryButton disabled={!valid || create.isPending} onPress={submit}>
          {create.isPending ? 'Computing targets…' : 'Create goal'}
        </PrimaryButton>
        <Muted fontSize={12}>
          Targets come from established formulas (Mifflin-St Jeor), with hard calorie floors — the
          AI never invents numbers. Weekly check-ins keep the plan adaptive.
        </Muted>
      </Card>
    </Screen>
  );
};
