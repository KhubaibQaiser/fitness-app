'use client';

import { Link } from 'solito/link';
import type { Client, DietaryProfile, Goal } from '@gymos/contracts';
import {
  AlertBanner,
  Body,
  Card,
  GhostButton,
  Muted,
  ShieldAlert,
  Stat,
  Text,
  WeightChart,
  XStack,
  YStack,
} from '@gymos/ui';

type WeightPoint = { t: number; weightKg: number };

type Props = {
  clientId: string;
  client: Client;
  goal: Goal | null;
  latestWeightKg: number | null;
  goalProgressPct: number | null;
  dietaryProfile: DietaryProfile;
  weighIns: WeightPoint[];
  weeklyDelta: number;
  signed: boolean;
  pdfError: string | null;
  pdfPending: boolean;
  onDownloadPdf: () => void;
};

const computeBmi = (heightCm: number | null, weightKg: number | null): number | null => {
  if (heightCm === null || heightCm <= 0 || weightKg === null || weightKg <= 0) return null;
  const meters = heightCm / 100;
  return weightKg / (meters * meters);
};

const paceDisplay = (goal: Goal | null): { value: string; unit?: string; hint: string } => {
  if (goal === null) return { value: '—', hint: 'No goal' };
  const abs = Math.abs(goal.expectedWeeklyDeltaKg);
  if (abs > 0) {
    return { value: String(Number(abs.toFixed(2))), unit: 'kg/wk', hint: goal.preset };
  }
  const rate = goal.rate === 'CONSERVATIVE' ? '0.25' : goal.rate === 'AGGRESSIVE' ? '0.75' : '0.5';
  return { value: rate, unit: 'kg/wk', hint: goal.preset };
};

/** Overview tab — kit metrics grid + chart∥sidebar. */
export const ClientHubOverview = ({
  clientId,
  client,
  goal,
  latestWeightKg,
  goalProgressPct,
  dietaryProfile,
  weighIns,
  signed,
  pdfError,
  pdfPending,
  onDownloadPdf,
}: Props) => {
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
  const pace = paceDisplay(goal);

  // Kit: delta vs start weight (not last two weigh-ins)
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
  const deltaText =
    weightDelta !== null
      ? `${Math.abs(weightDelta).toFixed(1)} kg ${weightDelta >= 0 ? '↓' : '↑'}`
      : undefined;

  const kgToGoal =
    goal?.targetWeightKg != null && latestWeightKg !== null
      ? Math.abs(latestWeightKg - goal.targetWeightKg)
      : null;

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
          {severeAllergies.map((r) => r.code.replace('allergen:', '')).join(', ')}
        </AlertBanner>
      ) : null}

      {/* Kit: grid-cols-2 md:grid-cols-4 gap-3 — equal cards */}
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
            value={latestWeightKg !== null ? String(latestWeightKg) : '—'}
            unit="kg"
            {...(deltaText !== undefined
              ? { delta: deltaText, deltaTone: deltaGood ?? 'muted' }
              : {})}
            {...(startKg !== null ? { hint: `Start: ${startKg} kg` } : {})}
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
              goal?.targetWeightKg != null
                ? `Target: ${goal.targetWeightKg} kg`
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

      {/* Kit: md:grid-cols-[1fr_280px] — stretch so columns share height */}
      <YStack
        gap="$4"
        width="100%"
        $md={{ flexDirection: 'row', alignItems: 'stretch', gap: '$4' }}
      >
        <Card flex={1} minWidth={0} padding="$5" gap="$4" $md={{ flexGrow: 1 }}>
          <XStack alignItems="flex-start" justifyContent="space-between" gap="$3">
            <YStack gap={2}>
              <Text fontFamily="$heading" fontWeight="600" fontSize={13} color="$color">
                Weight trend
              </Text>
              <Muted fontSize={11}>
                {weighIns.length > 0 ? `${weighIns.length} data points` : 'No weigh-ins yet'}
              </Muted>
            </YStack>
            {weighIns.length >= 2 ? (
              <XStack gap="$3" alignItems="center" flexShrink={0}>
                <XStack alignItems="center" gap="$1.5">
                  <YStack width={16} height={2} backgroundColor="$primary" borderRadius={999} />
                  <Muted fontSize={11}>Actual</Muted>
                </XStack>
                {goal?.targetWeightKg != null ? (
                  <XStack alignItems="center" gap="$1.5">
                    <YStack
                      width={16}
                      height={2}
                      backgroundColor="$success"
                      opacity={0.8}
                      borderRadius={999}
                    />
                    <Muted fontSize={11}>Goal</Muted>
                  </XStack>
                ) : null}
              </XStack>
            ) : null}
          </XStack>
          {weighIns.length >= 2 ? (
            <WeightChart
              points={weighIns}
              goalWeightKg={goal?.targetWeightKg ?? null}
              height={200}
            />
          ) : (
            <YStack flex={1} minHeight={200} alignItems="center" justifyContent="center">
              <Muted fontSize={13}>No weight data recorded yet.</Muted>
            </YStack>
          )}
        </Card>

        <YStack
          gap="$3"
          width="100%"
          $md={{ width: 280, flexShrink: 0 }}
          justifyContent="flex-start"
        >
          {goalProgressPct !== null && goal !== null ? (
            <Card gap="$3" padding="$4">
              <Muted fontSize={11} fontWeight="600" textTransform="uppercase" letterSpacing={0.8}>
                Goal progress
              </Muted>
              <XStack alignItems="flex-end" justifyContent="space-between">
                <Muted fontSize={11}>{goal.startWeightKg} kg</Muted>
                <Text fontFamily="$mono" fontWeight="700" fontSize={22} color="$color">
                  {goalProgressPct}%
                </Text>
                <Muted fontSize={11}>{goal.targetWeightKg ?? '—'} kg</Muted>
              </XStack>
              <YStack
                height={10}
                backgroundColor="$elevatedBg"
                borderRadius={999}
                overflow="hidden"
                accessibilityRole="progressbar"
                aria-valuenow={goalProgressPct}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label="Goal progress"
              >
                <YStack
                  height="100%"
                  width={`${Math.min(100, Math.max(0, goalProgressPct))}%`}
                  backgroundColor="$primary"
                  borderRadius={999}
                />
              </YStack>
              {kgToGoal !== null ? (
                <Muted fontSize={11}>{kgToGoal.toFixed(1)} kg to goal</Muted>
              ) : null}
            </Card>
          ) : null}

          {severeAllergies.length > 0 ? (
            <YStack
              borderWidth={1}
              borderColor="$danger"
              backgroundColor="$dangerMuted"
              borderRadius="$radiusControl"
              paddingHorizontal="$3"
              paddingVertical="$2.5"
              gap="$1"
            >
              <Text fontFamily="$heading" fontSize={11} fontWeight="600" color="$danger">
                Allergens on file
              </Text>
              <Text fontSize={12} color="$danger">
                {severeAllergies.map((r) => r.code.replace('allergen:', '')).join(', ')}
              </Text>
              <Link href={`/clients/${clientId}/dietary`}>
                <Muted fontSize={11} textDecorationLine="underline" color="$danger">
                  Edit dietary profile
                </Muted>
              </Link>
            </YStack>
          ) : null}

          {signed ? (
            <Card gap="$3" padding="$4">
              <YStack gap={2}>
                <Body fontWeight="600" fontSize={13}>
                  Credentials PDF
                </Body>
                <Muted fontSize={11}>
                  Signed {client.intake?.signedAt ? client.intake.signedAt.slice(0, 10) : '—'}
                </Muted>
              </YStack>
              <GhostButton width="100%" onPress={onDownloadPdf} disabled={pdfPending}>
                {pdfPending ? 'Preparing…' : 'Download PDF'}
              </GhostButton>
              {pdfError ? (
                <Body color="$danger" role="alert" fontSize={12}>
                  {pdfError}
                </Body>
              ) : null}
            </Card>
          ) : (
            <Card gap="$2" padding="$4">
              <Muted fontSize={12}>Credentials PDF unlocks after e-signed intake.</Muted>
              <GhostButton width="100%" disabled>
                Download PDF
              </GhostButton>
            </Card>
          )}
        </YStack>
      </YStack>
    </YStack>
  );
};
