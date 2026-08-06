'use client';

import { Link } from 'solito/link';
import {
  Badge,
  Body,
  Card,
  DeltaChip,
  ErrorState,
  GhostButton,
  LoadingState,
  Muted,
  PrimaryButton,
  Row,
  Screen,
  SectionTitle,
  Title,
  WeightChart,
  XStack,
  YStack,
} from '@gymos/ui';
import { useClientDetail, useVitals } from '../../api';

const PLAN_TONE = {
  PUBLISHED: 'success',
  DRAFT: 'warning',
  NEEDS_REVIEW: 'danger',
  SUPERSEDED: 'neutral',
  ARCHIVED: 'neutral',
} as const;

/** Client hub: trend, goal, plan, dietary safety, check-ins — one screen. */
export const ClientDetailScreen = ({ clientId }: { clientId: string }) => {
  const detail = useClientDetail(clientId);
  const vitals = useVitals(clientId);

  if (detail.isPending) return <LoadingState />;
  if (detail.isError) {
    return (
      <Screen>
        <ErrorState message="Could not load this client." retry={() => void detail.refetch()} />
      </Screen>
    );
  }

  const { client, goal, latestWeightKg, goalProgressPct, dietaryProfile, plans, recentCheckIns } =
    detail.data;

  const weighIns = (vitals.data?.items ?? [])
    .filter((v) => v.weightKg !== null)
    .map((v) => ({ t: Date.parse(v.recordedAt), weightKg: v.weightKg ?? 0 }));

  const severeAllergies = (dietaryProfile?.restrictions ?? []).filter(
    (r) => r.type === 'ALLERGY_SEVERE',
  );
  const currentPlan =
    plans.find((p) => p.status === 'NEEDS_REVIEW') ??
    plans.find((p) => p.status === 'DRAFT') ??
    plans.find((p) => p.status === 'PUBLISHED');
  const weeklyDelta =
    weighIns.length >= 2 ? (weighIns[0]?.weightKg ?? 0) - (weighIns[1]?.weightKg ?? 0) : 0;

  return (
    <Screen>
      <Row>
        <YStack>
          <Title>{client.name}</Title>
          <Muted>
            {client.sex === 'M' ? 'Male' : 'Female'}
            {client.heightCm !== null ? ` · ${client.heightCm} cm` : ''}
            {latestWeightKg !== null ? ` · ${latestWeightKg} kg` : ''}
          </Muted>
        </YStack>
        {client.phone ? (
          <Link href={`https://wa.me/${client.phone.replace(/[^\d]/g, '')}`} target="_blank">
            <GhostButton size="$3">WhatsApp</GhostButton>
          </Link>
        ) : null}
      </Row>

      {/* Safety surface — severe allergies pinned, never collapsible. */}
      {severeAllergies.length > 0 ? (
        <Card borderColor="$danger" borderWidth={2} backgroundColor="$cardBg">
          <Row>
            <Body fontWeight="800" color="$danger">
              ⚠ Severe allergies
            </Body>
            <Link href={`/clients/${clientId}/dietary`}>
              <Muted textDecorationLine="underline">Edit</Muted>
            </Link>
          </Row>
          <XStack gap="$2" flexWrap="wrap">
            {severeAllergies.map((r) => (
              <Badge key={r.code} tone="danger" label={r.code.replace('allergen:', '')} />
            ))}
          </XStack>
        </Card>
      ) : null}

      <SectionTitle>Progress</SectionTitle>
      <Card>
        <WeightChart points={weighIns} goalWeightKg={goal?.targetWeightKg ?? null} />
        <Row>
          <YStack>
            <Muted>Goal</Muted>
            <Body fontWeight="700">
              {goal
                ? `${goal.preset} · ${goal.rate.toLowerCase()}${goal.targetWeightKg !== null ? ` → ${goal.targetWeightKg} kg` : ''}`
                : 'No active goal'}
            </Body>
          </YStack>
          {goal && weighIns.length >= 2 ? (
            <DeltaChip
              delta={weeklyDelta}
              goodDirection={goal.preset === 'GAIN' ? 'up' : 'down'}
              unit="kg"
            />
          ) : null}
        </Row>
        {goalProgressPct !== null ? (
          <YStack gap="$1">
            <Row>
              <Muted>Progress to target</Muted>
              <Muted>{goalProgressPct}%</Muted>
            </Row>
            <YStack height={8} backgroundColor="$screenBg" borderRadius={999} overflow="hidden">
              <YStack
                height="100%"
                width={`${Math.min(100, goalProgressPct)}%`}
                backgroundColor="$primary"
              />
            </YStack>
          </YStack>
        ) : null}
      </Card>

      <XStack gap="$2">
        <Link href={`/clients/${clientId}/vitals/new`} style={{ flex: 1 }}>
          <PrimaryButton width="100%">+ Vitals</PrimaryButton>
        </Link>
        <Link href={`/clients/${clientId}/check-in`} style={{ flex: 1 }}>
          <PrimaryButton width="100%" backgroundColor="$accent" color="#3b2503">
            Check-in
          </PrimaryButton>
        </Link>
      </XStack>

      <SectionTitle>Meal plan</SectionTitle>
      {goal === null ? (
        <Card gap="$3">
          <Body>Set a goal first — targets and plans are computed from it.</Body>
          <Link href={`/clients/${clientId}/goal/new`}>
            <PrimaryButton>Set a goal</PrimaryButton>
          </Link>
        </Card>
      ) : currentPlan === undefined ? (
        <Card gap="$3">
          <Body>No plan yet. Generate a 7-day plan from the goal targets.</Body>
          <Link href={`/clients/${clientId}/plan`}>
            <PrimaryButton>Generate plan</PrimaryButton>
          </Link>
        </Card>
      ) : (
        <Link href={`/clients/${clientId}/plan`}>
          <Card pressStyle={{ opacity: 0.9 }}>
            <Row>
              <Body fontWeight="700">
                v{currentPlan.version} · {currentPlan.targets.kcal} kcal
              </Body>
              <Badge tone={PLAN_TONE[currentPlan.status]} label={currentPlan.status} />
            </Row>
            <Muted>
              P {currentPlan.targets.proteinG}g · F {currentPlan.targets.fatG}g · C{' '}
              {currentPlan.targets.carbsG}g · fiber {currentPlan.targets.fiberG}g
            </Muted>
            {currentPlan.status === 'NEEDS_REVIEW' ? (
              <Body color="$danger" fontWeight="700">
                Dietary profile changed — plan blocked pending your review.
              </Body>
            ) : null}
          </Card>
        </Link>
      )}

      <SectionTitle>Recent check-ins</SectionTitle>
      {recentCheckIns.length === 0 ? (
        <Muted>No check-ins yet.</Muted>
      ) : (
        recentCheckIns.slice(0, 5).map((checkIn) => (
          <Card key={checkIn.id}>
            <Row>
              <Body fontWeight="600">{checkIn.scheduledFor}</Body>
              <Badge
                tone={
                  checkIn.status === 'DUE'
                    ? 'warning'
                    : checkIn.engineOutput?.type === 'REFER_REVIEW'
                      ? 'danger'
                      : 'neutral'
                }
                label={
                  checkIn.status === 'COMPLETED'
                    ? (checkIn.engineOutput?.type ?? 'DONE')
                    : checkIn.status
                }
              />
            </Row>
            {checkIn.adherenceRating !== null ? (
              <Muted>Adherence {checkIn.adherenceRating}/5</Muted>
            ) : null}
          </Card>
        ))
      )}

      <SectionTitle>Dietary profile</SectionTitle>
      <Link href={`/clients/${clientId}/dietary`}>
        <Card pressStyle={{ opacity: 0.9 }}>
          {dietaryProfile === null || dietaryProfile.restrictions.length === 0 ? (
            <Body>No restrictions recorded — tap to add.</Body>
          ) : (
            <XStack gap="$2" flexWrap="wrap">
              {dietaryProfile.restrictions.map((r) => (
                <Badge
                  key={`${r.type}:${r.code}`}
                  tone={r.type === 'ALLERGY_SEVERE' ? 'danger' : 'neutral'}
                  label={r.code.split(':')[1] ?? r.code}
                />
              ))}
            </XStack>
          )}
        </Card>
      </Link>
    </Screen>
  );
};
