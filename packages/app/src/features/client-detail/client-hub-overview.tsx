'use client';

import type { Client, DietaryProfile, Goal } from '@gymos/contracts';
import { formatRestrictionLabel } from '@gymos/core/nutrition';
import { formatWeight } from '@gymos/core/units';
import {
  AlertBanner,
  Card,
  GradientRing,
  Muted,
  ShieldAlert,
  StatPill,
  Text,
  XStack,
  YStack,
} from '@gymos/ui';
import { useMe, usePublicConfig } from '../../api';
import { unitPrefsFrom } from '../../lib/unit-prefs';

type Props = {
  client: Client;
  goal: Goal | null;
  latestWeightKg: number | null;
  goalProgressPct: number | null;
  dietaryProfile: DietaryProfile;
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

/** Overview tab — alerts, stats, and goal ring. */
export const ClientHubOverview = ({
  client,
  goal,
  latestWeightKg,
  goalProgressPct,
  dietaryProfile,
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
        <YStack flexBasis="47%" flexGrow={1} minWidth={140} $md={{ flexBasis: 0, flex: 1 }}>
          <StatPill
            label="Current weight"
            value={currentShown !== null ? String(currentShown.value) : '—'}
            suffix={currentShown !== null ? ` ${currentShown.unit}` : ''}
          />
        </YStack>
        <YStack flexBasis="47%" flexGrow={1} minWidth={140} $md={{ flexBasis: 0, flex: 1 }}>
          <StatPill
            label="Goal progress"
            value={goalProgressPct !== null ? String(goalProgressPct) : '—'}
            suffix={goalProgressPct !== null ? '%' : ''}
          />
        </YStack>
        <YStack flexBasis="47%" flexGrow={1} minWidth={140} $md={{ flexBasis: 0, flex: 1 }}>
          <StatPill label="BMI" value={bmi !== null ? bmi.toFixed(1) : '—'} />
        </YStack>
        <YStack flexBasis="47%" flexGrow={1} minWidth={140} $md={{ flexBasis: 0, flex: 1 }}>
          <StatPill
            label="Pace"
            value={pace.value}
            suffix={pace.unit !== undefined ? ` ${pace.unit}` : ''}
          />
        </YStack>
      </XStack>

      {goalProgressPct !== null && goal !== null ? (
        <Card gap="$3" padding="$5" alignItems="center">
          <Muted fontSize={14} fontWeight="500">
            Goal progress
          </Muted>
          <GradientRing
            id="client-goal-progress"
            value={goalProgressPct}
            size={92}
            stroke={8}
            role="coach"
          />
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
    </YStack>
  );
};
