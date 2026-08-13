'use client';

import type { Client, DietaryProfile, Goal } from '@gymos/contracts';
import { formatRestrictionLabel } from '@gymos/core/nutrition';
import { formatWeight } from '@gymos/core/units';
import { AlertBanner, Card, Muted, ShieldAlert, Stat, Text, XStack, YStack } from '@gymos/ui';
import { useMe, usePublicConfig } from '../../api';
import { unitPrefsFrom } from '../../lib/unit-prefs';
import { ProgressRing, WeightTrendChart } from '../charts';

type WeightPoint = { t: number; weightKg: number };

type Props = {
  client: Client;
  goal: Goal | null;
  latestWeightKg: number | null;
  goalProgressPct: number | null;
  dietaryProfile: DietaryProfile;
  weighIns: WeightPoint[];
  signed: boolean;
};

const computeBmi = (heightCm: number | null, weightKg: number | null): number | null => {
  if (heightCm === null || heightCm <= 0 || weightKg === null || weightKg <= 0) return null;
  const meters = heightCm / 100;
  return weightKg / (meters * meters);
};

const paceDisplay = (
  goal: Goal | null,
  weightUnit: string,
): { value: string; unit?: string; hint: string } => {
  if (goal === null) return { value: '—', hint: 'No goal' };
  const abs = Math.abs(goal.expectedWeeklyDeltaKg);
  if (abs > 0) {
    const shown = formatWeight(abs, weightUnit === 'lb' ? 'lb' : 'kg', 2);
    return { value: String(shown.value), unit: `${shown.unit}/wk`, hint: goal.preset };
  }
  const rate = goal.rate === 'CONSERVATIVE' ? '0.25' : goal.rate === 'AGGRESSIVE' ? '0.75' : '0.5';
  return { value: rate, unit: `${weightUnit}/wk`, hint: goal.preset };
};

/** Overview tab — alerts, stats, large goal ring, weight trend last. */
export const ClientHubOverview = ({
  client,
  goal,
  latestWeightKg,
  goalProgressPct,
  dietaryProfile,
  weighIns,
  signed,
}: Props) => {
  const me = useMe();
  const config = usePublicConfig();
  const prefs = unitPrefsFrom(me.data, config.data);
  const weightUnit = prefs.weight;

  const severeAllergies = (dietaryProfile?.restrictions ?? []).filter(
    (r) => r.type === 'ALLERGY_SEVERE',
  );
  const medicalParts = [
    client.medicalFlags?.pregnant === true ? 'Pregnant' : null,
    client.medicalFlags?.physicianClearanceRequired === true
      ? 'Physician clearance required'
      : null,
    ...(client.medicalFlags?.conditions ?? []),
  ].filter((p): p is string => typeof p === 'string' && p.length > 0);

  const bmi = computeBmi(client.heightCm, latestWeightKg);
  const pace = paceDisplay(goal, weightUnit);

  const startKg = goal?.startWeightKg ?? null;
  const weightDelta = startKg !== null && latestWeightKg !== null ? startKg - latestWeightKg : null;
  const loseGoal = goal?.preset === 'LOSE' || goal?.preset === 'RECOMP';
  const deltaGood =
    weightDelta === null
      ? null
      : loseGoal
        ? weightDelta > 0
          ? 'success'
          : weightDelta < 0
            ? 'danger'
            : 'muted'
        : goal?.preset === 'GAIN'
          ? weightDelta < 0
            ? 'success'
            : weightDelta > 0
              ? 'danger'
              : 'muted'
          : 'muted';
  const deltaShown = weightDelta !== null ? formatWeight(Math.abs(weightDelta), weightUnit) : null;
  const deltaText =
    deltaShown !== null
      ? `${deltaShown.value} ${deltaShown.unit} ${weightDelta !== null && weightDelta >= 0 ? '↓' : '↑'}`
      : undefined;

  const currentShown = latestWeightKg !== null ? formatWeight(latestWeightKg, weightUnit) : null;
  const startShown = startKg !== null ? formatWeight(startKg, weightUnit) : null;
  const targetShown =
    goal?.targetWeightKg != null ? formatWeight(goal.targetWeightKg, weightUnit) : null;

  return (
    <YStack gap="$5" width="100%">
      {!signed ? (
        <AlertBanner tone="warning" title="Onboarding incomplete">
          Complete intake to unlock meal planning, check-ins, and credential PDF.
        </AlertBanner>
      ) : null}

      {medicalParts.length > 0 ? (
        <AlertBanner
          tone="danger"
          title="Medical note"
          icon={<ShieldAlert size={18} color="$danger" />}
        >
          {medicalParts.join(' · ')}
        </AlertBanner>
      ) : null}

      {severeAllergies.length > 0 ? (
        <AlertBanner
          tone="danger"
          title="Severe allergies"
          icon={<ShieldAlert size={18} color="$danger" />}
        >
          {severeAllergies.map((r) => formatRestrictionLabel(r.code)).join(', ')}
        </AlertBanner>
      ) : null}

      <XStack flexWrap="wrap" gap="$3" width="100%">
        <Card
          flexBasis="47%"
          flexGrow={1}
          flexShrink={1}
          minWidth={140}
          $md={{ flexBasis: 0, flex: 1 }}
          padding="$4"
        >
          <Stat
            label="Current weight"
            value={currentShown !== null ? String(currentShown.value) : '—'}
            unit={currentShown?.unit ?? weightUnit}
            {...(deltaText !== undefined
              ? { delta: deltaText, deltaTone: deltaGood ?? 'muted' }
              : {})}
            {...(startShown !== null
              ? { hint: `Start: ${startShown.value} ${startShown.unit}` }
              : {})}
          />
        </Card>
        <Card
          flexBasis="47%"
          flexGrow={1}
          flexShrink={1}
          minWidth={140}
          $md={{ flexBasis: 0, flex: 1 }}
          padding="$4"
        >
          <Stat
            label="Goal progress"
            value={goalProgressPct !== null ? String(goalProgressPct) : '—'}
            unit="%"
            hint={
              targetShown !== null
                ? `Target: ${targetShown.value} ${targetShown.unit}`
                : (goal?.preset ?? 'No goal')
            }
          />
        </Card>
        <Card
          flexBasis="47%"
          flexGrow={1}
          flexShrink={1}
          minWidth={140}
          $md={{ flexBasis: 0, flex: 1 }}
          padding="$4"
        >
          <Stat
            label="BMI"
            value={bmi !== null ? bmi.toFixed(1) : '—'}
            hint={client.heightCm !== null ? `${client.heightCm} cm` : 'Needs height + weight'}
          />
        </Card>
        <Card
          flexBasis="47%"
          flexGrow={1}
          flexShrink={1}
          minWidth={140}
          $md={{ flexBasis: 0, flex: 1 }}
          padding="$4"
        >
          <Stat
            label="Pace"
            value={pace.value}
            {...(pace.unit !== undefined ? { unit: pace.unit } : {})}
            hint={pace.hint}
          />
        </Card>
      </XStack>

      {goalProgressPct !== null && goal !== null ? (
        <Card gap="$3" padding="$5" alignItems="center">
          <Muted fontSize={11} fontWeight="600" textTransform="uppercase" letterSpacing={0.8}>
            Goal progress
          </Muted>
          <ProgressRing value={goalProgressPct} size={180} strokeWidth={12} label="progress" />
          <XStack gap="$6">
            <YStack alignItems="center">
              <Muted fontSize={11}>Start</Muted>
              <Text fontFamily="$mono" fontWeight="700">
                {startShown !== null ? `${startShown.value} ${startShown.unit}` : '—'}
              </Text>
            </YStack>
            <YStack alignItems="center">
              <Muted fontSize={11}>Target</Muted>
              <Text fontFamily="$mono" fontWeight="700">
                {targetShown !== null ? `${targetShown.value} ${targetShown.unit}` : '—'}
              </Text>
            </YStack>
          </XStack>
        </Card>
      ) : null}

      <Card flex={1} minWidth={0} padding="$5" gap="$4">
        <XStack alignItems="flex-start" justifyContent="space-between" gap="$3">
          <YStack gap={2}>
            <Text fontFamily="$heading" fontWeight="600" fontSize={13} color="$color">
              Weight trend
            </Text>
            <Muted fontSize={11}>
              {weighIns.length > 0 ? `${weighIns.length} data points` : 'No weigh-ins yet'}
            </Muted>
          </YStack>
        </XStack>
        {weighIns.length >= 2 ? (
          <WeightTrendChart
            points={weighIns}
            goalWeightKg={goal?.targetWeightKg ?? null}
            height={200}
          />
        ) : (
          <YStack minHeight={160} alignItems="center" justifyContent="center">
            <Muted fontSize={13}>No weight data recorded yet.</Muted>
          </YStack>
        )}
      </Card>
    </YStack>
  );
};
