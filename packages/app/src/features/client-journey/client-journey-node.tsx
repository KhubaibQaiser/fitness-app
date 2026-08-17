'use client';

import { Link } from 'solito/link';
import type { WeightUnit } from '@gymos/core/units';
import { formatWeight } from '@gymos/core/units';
import {
  Activity,
  Badge,
  Card,
  Check,
  ChevronRight,
  Muted,
  StaggerItem,
  Target,
  Text,
  XStack,
  YStack,
  type BadgeTone,
  type GymosIcon,
} from '@gymos/ui';
import type { JourneyNode } from './client-journey';
import { JourneyAdherenceScore } from './journey-adherence-score';

const formatDate = (value: string): string => {
  const date = new Date(value.includes('T') ? value : `${value}T00:00:00Z`);
  if (!Number.isFinite(date.getTime())) return value;
  return new Intl.DateTimeFormat('en', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(date);
};

const iconFor = (node: JourneyNode): GymosIcon => {
  if (node.kind === 'TARGET' || node.kind === 'MILESTONE') return Target;
  if (node.kind === 'CHECK_IN') return Check;
  return Activity;
};

const badgeFor = (node: JourneyNode): { tone: BadgeTone; label: string } | null => {
  if (node.trackStatus !== undefined) {
    return {
      tone:
        node.trackStatus === 'ahead'
          ? 'success'
          : node.trackStatus === 'behind'
            ? 'warning'
            : 'primary',
      label:
        node.trackStatus === 'ahead'
          ? 'Ahead'
          : node.trackStatus === 'behind'
            ? 'Needs focus'
            : 'On track',
    };
  }
  if (node.projected) return { tone: 'neutral', label: 'Projected' };
  if (node.state === 'skipped') return { tone: 'neutral', label: 'Skipped' };
  if (node.kind === 'MILESTONE') return { tone: 'milestone', label: 'Milestone' };
  if (node.kind === 'TARGET') return { tone: 'primary', label: 'Goal' };
  if (node.kind === 'CHECK_IN') return { tone: 'success', label: 'Completed' };
  return null;
};

const formatDelta = (kgPerWeek: number): string =>
  `${kgPerWeek > 0 ? '+' : ''}${kgPerWeek.toFixed(2)} kg/wk`;

/** Rail geometry — marker top matches Card padding `$4` (16). */
export const JOURNEY_RAIL_WIDTH = 40;
export const JOURNEY_MARKER_SIZE = 24;
export const JOURNEY_MARKER_TOP = 16;
export const JOURNEY_SPINE_INSET = JOURNEY_MARKER_TOP + JOURNEY_MARKER_SIZE / 2;
export const JOURNEY_SPINE_LEFT = (JOURNEY_RAIL_WIDTH - 2) / 2;

export const ClientJourneyNode = ({
  node,
  weightUnit,
  last,
  index,
}: {
  node: JourneyNode;
  weightUnit: WeightUnit;
  last: boolean;
  index: number;
}) => {
  const Icon = iconFor(node);
  const badge = badgeFor(node);
  const shownWeight = node.weightKg !== null ? formatWeight(node.weightKg, weightUnit, 1) : null;
  const isCurrent = node.state === 'current';
  const isPast = node.state === 'past';
  const markerColor = isCurrent || isPast ? '$primary' : '$textMuted';
  const content = (
    <Card
      interactive={node.href !== undefined}
      backgroundColor={isCurrent ? '$primaryMuted' : '$cardBg'}
      borderColor={isCurrent ? '$primary' : '$borderColor'}
      borderStyle={node.projected ? 'dashed' : 'solid'}
      gap="$3"
      width="100%"
      opacity={node.state === 'future' ? 0.88 : 1}
      accessibilityLabel={`${node.title}, ${formatDate(node.date)}${shownWeight !== null ? `, ${shownWeight.value} ${shownWeight.unit}` : ''}`}
    >
      <XStack alignItems="flex-start" justifyContent="space-between" gap="$3">
        <YStack gap="$1" flex={1} minWidth={0}>
          <XStack alignItems="center" flexWrap="wrap" gap="$2">
            <Text
              fontFamily="$heading"
              fontSize="$headline"
              lineHeight="$headline"
              fontWeight={isCurrent ? '700' : '600'}
              color="$color"
            >
              {node.title}
            </Text>
            {badge !== null ? <Badge tone={badge.tone} label={badge.label} /> : null}
          </XStack>
          <Muted fontSize="$captionDefault" lineHeight="$captionDefault">
            {formatDate(node.date)}
          </Muted>
        </YStack>
        {node.adherenceScore !== undefined ? (
          <JourneyAdherenceScore score={node.adherenceScore} />
        ) : node.href !== undefined ? (
          <ChevronRight size={18} color="$textMuted" />
        ) : null}
      </XStack>

      {shownWeight !== null ? (
        <XStack alignItems="baseline" gap="$2">
          <Text
            fontFamily="$mono"
            fontSize="$statMd"
            lineHeight="$statMd"
            fontWeight="600"
            color="$color"
          >
            {shownWeight.value}
          </Text>
          <Muted fontSize="$captionDefault" lineHeight="$captionDefault" fontWeight="500">
            {shownWeight.unit}
          </Muted>
        </XStack>
      ) : null}

      {node.actualWeeklyDeltaKg !== undefined || node.expectedWeeklyDeltaKg !== undefined ? (
        <XStack flexWrap="wrap" gap="$4">
          {node.actualWeeklyDeltaKg !== undefined ? (
            <YStack gap="$1">
              <Muted fontSize="$captionDefault" lineHeight="$captionDefault">
                Actual
              </Muted>
              <Text
                fontFamily="$mono"
                fontSize="$caption"
                lineHeight="$caption"
                fontWeight="500"
                color="$color"
              >
                {formatDelta(node.actualWeeklyDeltaKg)}
              </Text>
            </YStack>
          ) : null}
          {node.expectedWeeklyDeltaKg !== undefined ? (
            <YStack gap="$1">
              <Muted fontSize="$captionDefault" lineHeight="$captionDefault">
                Expected
              </Muted>
              <Text
                fontFamily="$mono"
                fontSize="$caption"
                lineHeight="$caption"
                fontWeight="500"
                color="$color"
              >
                {formatDelta(node.expectedWeeklyDeltaKg)}
              </Text>
            </YStack>
          ) : null}
        </XStack>
      ) : null}

      {node.detail !== null ? (
        <Muted fontSize="$bodyDefault" lineHeight="$bodyDefault">
          {node.detail}
        </Muted>
      ) : null}
    </Card>
  );

  return (
    <XStack gap="$3" alignItems="stretch" width="100%" paddingBottom={last ? 0 : '$5'}>
      <YStack width={JOURNEY_RAIL_WIDTH} alignItems="center" zIndex={1}>
        <YStack
          width={JOURNEY_MARKER_SIZE}
          height={JOURNEY_MARKER_SIZE}
          marginTop={JOURNEY_MARKER_TOP}
          borderRadius={999}
          alignItems="center"
          justifyContent="center"
          backgroundColor={isCurrent ? '$primaryMuted' : '$cardBg'}
          borderWidth={isCurrent ? 3 : 2}
          borderColor={markerColor}
        >
          <Icon size={12} color={markerColor} />
        </YStack>
      </YStack>
      <YStack flex={1} minWidth={0}>
        <StaggerItem index={index}>
          {node.href !== undefined ? <Link href={node.href}>{content}</Link> : content}
        </StaggerItem>
      </YStack>
    </XStack>
  );
};
