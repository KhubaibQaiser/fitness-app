'use client';

import { useMemo } from 'react';
import type { Goal, Vitals } from '@gymos/contracts';
import type { WeightUnit } from '@gymos/core/units';
import {
  Badge,
  Card,
  DeltaChip,
  Muted,
  Skeleton,
  Text,
  XStack,
  YStack,
  type BadgeTone,
} from '@gymos/ui';
import { WeightTrendChart } from '../charts';
import type { JourneyTrackStatus } from '../client-journey/client-journey';
import { buildJourneyChartModel } from '../client-journey/journey-chart-model';

const trackBadge = (status: JourneyTrackStatus): { tone: BadgeTone; label: string } => {
  if (status === 'ahead') return { tone: 'success', label: 'Ahead' };
  if (status === 'behind') return { tone: 'warning', label: 'Needs focus' };
  return { tone: 'primary', label: 'On track' };
};

export const ClientWeightJourneyChartSkeleton = () => (
  <Card padding="$4" gap="$3" width="100%">
    <XStack justifyContent="space-between" alignItems="flex-start" gap="$3">
      <YStack gap="$1.5" flex={1} minWidth={0}>
        <Skeleton width={96} height={12} />
        <Skeleton width={88} height={24} />
        <Skeleton width={72} height={22} borderRadius={999} />
      </YStack>
      <Skeleton width={88} height={22} borderRadius={999} />
    </XStack>
    <Skeleton width="100%" height={220} borderRadius={12} />
  </Card>
);

/** Overview weight path — actual weigh-ins vs expected pace and goal. */
export const ClientWeightJourneyChart = ({
  goal,
  vitals,
  latestWeightKg,
  weightUnit,
  pending = false,
}: {
  goal: Goal | null;
  vitals: Vitals[];
  latestWeightKg: number | null;
  weightUnit: WeightUnit;
  pending?: boolean;
}) => {
  const model = useMemo(
    () =>
      goal === null
        ? null
        : buildJourneyChartModel({
            goal,
            vitals,
            latestWeightKg,
            weightUnit,
          }),
    [goal, vitals, latestWeightKg, weightUnit],
  );

  if (goal === null) return null;
  if (pending) return <ClientWeightJourneyChartSkeleton />;
  if (model === null) return null;

  const badge = trackBadge(model.trackStatus);

  return (
    <Card padding="$4" gap="$3" width="100%">
      <XStack justifyContent="space-between" alignItems="flex-start" gap="$3">
        <YStack gap="$1.5" flex={1} minWidth={0}>
          <Muted fontSize={12} fontWeight="500" textTransform="uppercase" letterSpacing={1.2}>
            Weight journey
          </Muted>
          <XStack alignItems="baseline" gap="$2" flexWrap="wrap">
            <Text
              fontFamily="$mono"
              fontSize={20}
              lineHeight={26}
              fontWeight="600"
              color="$color"
              letterSpacing={-0.3}
            >
              {model.current.weightKg.toFixed(1)}
            </Text>
            <Text fontFamily="$body" fontSize={14} color="$textMuted">
              {model.unitLabel}
            </Text>
          </XStack>
          <DeltaChip
            delta={model.current.weightKg - model.start.weightKg}
            goodDirection={model.direction === 'gain' ? 'up' : 'down'}
            unit={model.unitLabel}
          />
        </YStack>
        <Badge tone={badge.tone} label={badge.label} />
      </XStack>
      <WeightTrendChart
        points={model.actual}
        expectedPoints={model.expected}
        projectedPoints={model.projected}
        milestones={model.milestones}
        current={model.current}
        goalWeightKg={model.target.weightKg}
        unitLabel={model.unitLabel}
        height={240}
      />
    </Card>
  );
};
