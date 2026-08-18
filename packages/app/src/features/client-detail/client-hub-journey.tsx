'use client';

import { useMemo } from 'react';
import { Link } from 'solito/link';
import type { CheckIn, Client, Goal, Vitals } from '@gymos/contracts';
import {
  Badge,
  Card,
  DeltaChip,
  Muted,
  PrimaryButton,
  Skeleton,
  Text,
  XStack,
  YStack,
  type BadgeTone,
} from '@gymos/ui';
import { useMe, usePublicConfig } from '../../api';
import { unitPrefsFrom } from '../../lib/unit-prefs';
import { WeightTrendChart } from '../charts';
import { buildLiveJourney, type JourneyTrackStatus } from '../client-journey/client-journey';
import { ClientJourneyMap } from '../client-journey/client-journey-map';
import { buildJourneyChartModel } from '../client-journey/journey-chart-model';

type Props = {
  clientId: string;
  client: Client;
  goal: Goal | null;
  latestWeightKg: number | null;
  vitals: Vitals[];
  vitalsPending?: boolean;
  checkIns: CheckIn[];
};

const trackBadge = (status: JourneyTrackStatus): { tone: BadgeTone; label: string } => {
  if (status === 'ahead') return { tone: 'success', label: 'Ahead' };
  if (status === 'behind') return { tone: 'warning', label: 'Needs focus' };
  return { tone: 'primary', label: 'On track' };
};

const JourneyChartSkeleton = () => (
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

/** Journey tab — weight path, live check-ins, current position, and projected goal. */
export const ClientHubJourney = ({
  clientId,
  client,
  goal,
  latestWeightKg,
  vitals,
  vitalsPending = false,
  checkIns,
}: Props) => {
  const me = useMe();
  const config = usePublicConfig();
  const prefs = unitPrefsFrom(me.data, config.data);
  const nodes =
    goal !== null
      ? buildLiveJourney({
          clientId: client.id,
          goal,
          checkIns,
          vitals,
          latestWeightKg,
        })
      : [];
  const model = useMemo(
    () =>
      goal === null
        ? null
        : buildJourneyChartModel({
            goal,
            vitals,
            latestWeightKg,
            weightUnit: prefs.weight,
          }),
    [goal, vitals, latestWeightKg, prefs.weight],
  );
  const badge = model !== null ? trackBadge(model.trackStatus) : null;

  return (
    <YStack gap="$5" width="100%" maxWidth={760} alignSelf="center">
      {goal !== null && vitalsPending ? <JourneyChartSkeleton /> : null}
      {goal !== null && !vitalsPending && model !== null ? (
        <Card padding="$4" gap="$3" width="100%">
          <XStack justifyContent="space-between" alignItems="flex-start" gap="$3">
            <YStack gap="$1.5" flex={1} minWidth={0}>
              <Muted fontSize={11} fontWeight="500" textTransform="uppercase" letterSpacing={1.2}>
                Current weight
              </Muted>
              <XStack alignItems="baseline" gap="$2" flexWrap="wrap">
                <Text
                  fontFamily="$mono"
                  fontSize={18}
                  lineHeight={24}
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
            {badge !== null ? <Badge tone={badge.tone} label={badge.label} /> : null}
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
      ) : null}

      <ClientJourneyMap
        nodes={nodes}
        weightUnit={prefs.weight}
        chrome="page"
        subtitle="Check-in performance, today’s position and the projected path to the goal."
        emptyAction={
          goal === null ? (
            <Link href={`/clients/${clientId}/goal/new`}>
              <PrimaryButton>Set a goal</PrimaryButton>
            </Link>
          ) : undefined
        }
      />
    </YStack>
  );
};
