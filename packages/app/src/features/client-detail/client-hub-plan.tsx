'use client';

import { Link } from 'solito/link';
import type { Client, DietaryProfile, Goal, PlanSummary } from '@gymos/contracts';
import {
  AlertBanner,
  Badge,
  Body,
  Card,
  GhostButton,
  Muted,
  PrimaryButton,
  Row,
  Text,
  XStack,
  YStack,
} from '@gymos/ui';

const PLAN_TONE = {
  PUBLISHED: 'success',
  DRAFT: 'warning',
  NEEDS_REVIEW: 'danger',
  SUPERSEDED: 'neutral',
  ARCHIVED: 'neutral',
} as const;

const GOAL_LABEL: Record<Goal['preset'], string> = {
  LOSE: 'Weight loss',
  GAIN: 'Weight gain',
  MAINTAIN: 'Maintenance',
  RECOMP: 'Recomp',
};

const PACE_LABEL: Record<Goal['rate'], string> = {
  CONSERVATIVE: 'Conservative',
  STANDARD: 'Standard',
  AGGRESSIVE: 'Aggressive',
};

const ACTIVITY_LABEL: Record<number, string> = {
  1.2: 'Sedentary',
  1.375: 'Lightly active',
  1.55: 'Moderately active',
  1.725: 'Active',
  1.9: 'Very active',
};

type Props = {
  clientId: string;
  client: Client;
  goal: Goal | null;
  latestWeightKg: number | null;
  dietaryProfile: DietaryProfile;
  currentPlan: PlanSummary | undefined;
};

/** Plan tab — denser goal summary, dietary chips, meal plan card. */
export const ClientHubPlan = ({
  clientId,
  client,
  goal,
  latestWeightKg,
  dietaryProfile,
  currentPlan,
}: Props) => {
  const severe = (dietaryProfile?.restrictions ?? []).filter((r) => r.type === 'ALLERGY_SEVERE');
  const other = (dietaryProfile?.restrictions ?? []).filter((r) => r.type !== 'ALLERGY_SEVERE');
  const remaining =
    goal?.targetWeightKg != null && latestWeightKg !== null
      ? Math.abs(latestWeightKg - goal.targetWeightKg)
      : null;

  return (
    <YStack gap="$4">
      {goal === null ? (
        <Card gap="$3">
          <Body>Set a goal first — targets and plans are computed from it.</Body>
          <Link href={`/clients/${clientId}/goal/new`}>
            <PrimaryButton>Set a goal</PrimaryButton>
          </Link>
        </Card>
      ) : (
        <Card gap="$4" padding="$4">
          <Row>
            <Text fontFamily="$heading" fontWeight="700" fontSize={13} color="$color">
              Active goal
            </Text>
            <Link href={`/clients/${clientId}/goal/new`}>
              <GhostButton>Edit goal</GhostButton>
            </Link>
          </Row>
          <XStack flexWrap="wrap" gap="$4">
            {(
              [
                { label: 'Objective', value: GOAL_LABEL[goal.preset] },
                {
                  label: 'Pace',
                  value: `${PACE_LABEL[goal.rate]}${
                    Math.abs(goal.expectedWeeklyDeltaKg) > 0
                      ? ` · ${Math.abs(goal.expectedWeeklyDeltaKg)} kg/wk`
                      : ''
                  }`,
                },
                {
                  label: 'Activity',
                  value:
                    client.activityLevel != null
                      ? (ACTIVITY_LABEL[client.activityLevel] ?? String(client.activityLevel))
                      : '—',
                },
                { label: 'Start weight', value: `${goal.startWeightKg} kg` },
                {
                  label: 'Target weight',
                  value: goal.targetWeightKg != null ? `${goal.targetWeightKg} kg` : '—',
                },
                {
                  label: 'Remaining',
                  value: remaining !== null ? `${remaining.toFixed(1)} kg` : '—',
                },
              ] as const
            ).map((row) => (
              <YStack key={row.label} width="45%" $md={{ width: '30%' }} gap={2}>
                <Muted fontSize={11}>{row.label}</Muted>
                <Text fontFamily="$body" fontWeight="600" fontSize={13.5} color="$color">
                  {row.value}
                </Text>
              </YStack>
            ))}
          </XStack>
        </Card>
      )}

      <Card gap="$3" padding="$4">
        <Row>
          <Text fontFamily="$heading" fontWeight="700" fontSize={13} color="$color">
            Dietary profile
          </Text>
          <Link href={`/clients/${clientId}/dietary`}>
            <GhostButton>Edit</GhostButton>
          </Link>
        </Row>

        {severe.length > 0 ? (
          <YStack gap="$2">
            <Muted fontSize={11} fontWeight="700" color="$danger" textTransform="uppercase">
              Severe allergens — excluded from all plans
            </Muted>
            <XStack gap="$2" flexWrap="wrap">
              {severe.map((r) => (
                <Badge
                  key={`${r.type}:${r.code}`}
                  tone="danger"
                  label={r.code.split(':')[1] ?? r.code}
                />
              ))}
            </XStack>
          </YStack>
        ) : null}

        {other.length > 0 ? (
          <YStack gap="$2">
            <Muted fontSize={11} fontWeight="600">
              Preferences & restrictions
            </Muted>
            <XStack gap="$2" flexWrap="wrap">
              {other.map((r) => (
                <Badge
                  key={`${r.type}:${r.code}`}
                  tone="neutral"
                  label={r.code.split(':')[1] ?? r.code}
                />
              ))}
            </XStack>
          </YStack>
        ) : null}

        {dietaryProfile === null || dietaryProfile.restrictions.length === 0 ? (
          <Link href={`/clients/${clientId}/dietary`}>
            <Body>No restrictions recorded — tap to add.</Body>
          </Link>
        ) : null}
      </Card>

      {currentPlan === undefined ? (
        goal !== null ? (
          <Card gap="$3" padding="$5" alignItems="center">
            <Body fontWeight="700">No meal plan yet</Body>
            <Muted textAlign="center" fontSize={12}>
              Generate a 7-day plan from the goal targets and dietary profile.
            </Muted>
            <Link href={`/clients/${clientId}/plan`}>
              <PrimaryButton>Generate meal plan</PrimaryButton>
            </Link>
          </Card>
        ) : null
      ) : (
        <Link href={`/clients/${clientId}/plan`}>
          <Card interactive gap="$3" padding="$4">
            <Row>
              <YStack gap={2} flex={1} minWidth={0}>
                <Text fontFamily="$heading" fontWeight="700" fontSize={13} color="$color">
                  Meal plan
                </Text>
                <Muted fontSize={11}>
                  v{currentPlan.version}
                  {currentPlan.publishedAt
                    ? ` · Published ${currentPlan.publishedAt.slice(0, 10)}`
                    : ' · Draft'}
                </Muted>
              </YStack>
              <Badge tone={PLAN_TONE[currentPlan.status]} label={currentPlan.status} />
            </Row>

            <XStack
              gap="$2"
              backgroundColor="$elevatedBg"
              borderRadius="$radiusCard"
              padding="$3"
              justifyContent="space-between"
            >
              {(
                [
                  { label: 'kcal', value: String(currentPlan.targets.kcal) },
                  { label: 'Protein', value: `${currentPlan.targets.proteinG}g` },
                  { label: 'Carbs', value: `${currentPlan.targets.carbsG}g` },
                  { label: 'Fat', value: `${currentPlan.targets.fatG}g` },
                  { label: 'Fiber', value: `${currentPlan.targets.fiberG}g` },
                ] as const
              ).map((m) => (
                <YStack key={m.label} alignItems="center" flex={1} gap={4}>
                  <Text fontFamily="$mono" fontWeight="700" fontSize={15} color="$color">
                    {m.value}
                  </Text>
                  <Muted fontSize={10}>{m.label}</Muted>
                </YStack>
              ))}
            </XStack>

            {currentPlan.status === 'NEEDS_REVIEW' ? (
              <AlertBanner tone="danger" title="Plan needs review">
                Dietary profile changed — plan blocked pending your review.
              </AlertBanner>
            ) : null}
          </Card>
        </Link>
      )}
    </YStack>
  );
};
