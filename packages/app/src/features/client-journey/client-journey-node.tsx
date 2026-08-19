'use client';

import { Link } from 'solito/link';
import { formatWeight, type WeightUnit } from '@gymos/core/units';
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
import { journeyVerdictPresentation, type JourneyNode } from './client-journey';
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
  if (node.verdictType !== undefined) {
    const verdict = journeyVerdictPresentation(node.verdictType);
    return { tone: verdict.tone, label: verdict.label };
  }
  if (node.projected) return { tone: 'neutral', label: 'Projected' };
  if (node.state === 'skipped') return { tone: 'neutral', label: 'Skipped' };
  if (node.kind === 'MILESTONE') return { tone: 'milestone', label: 'Milestone' };
  if (node.kind === 'TARGET') return { tone: 'primary', label: 'Goal' };
  if (node.kind === 'CHECK_IN') return { tone: 'success', label: 'Completed' };
  return null;
};

const formatDelta = (kgPerWeek: number, unit: WeightUnit): { value: string; unit: string } => {
  const shown = formatWeight(kgPerWeek, unit, 2);
  const sign = shown.value > 0 ? '+' : '';
  return { value: `${sign}${shown.value}`, unit: `${shown.unit}/wk` };
};

const JourneyMetric = ({ label, value, unit }: { label: string; value: string; unit?: string }) => (
  <YStack gap={2} flex={1} minWidth={72}>
    <Muted
      fontSize={10}
      lineHeight={12}
      fontWeight="600"
      textTransform="uppercase"
      letterSpacing={0.8}
    >
      {label}
    </Muted>
    <XStack alignItems="baseline" gap="$1" flexWrap="wrap">
      <Text
        fontFamily="$mono"
        fontSize="$statMd"
        lineHeight="$statMd"
        fontWeight="600"
        color="$color"
      >
        {value}
      </Text>
      {unit !== undefined ? (
        <Muted fontSize="$captionDefault" lineHeight="$captionDefault" fontWeight="500">
          {unit}
        </Muted>
      ) : null}
    </XStack>
  </YStack>
);

const linkHintFor = (node: JourneyNode): string | null => {
  if (node.href === undefined) return null;
  if (node.kind === 'CHECK_IN') return 'View check-in';
  if (node.kind === 'NEXT_CHECK_IN') return 'Log check-in';
  return 'View';
};

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
  const actualDelta =
    node.actualWeeklyDeltaKg !== undefined
      ? formatDelta(node.actualWeeklyDeltaKg, weightUnit)
      : null;
  const expectedDelta =
    node.expectedWeeklyDeltaKg !== undefined
      ? formatDelta(node.expectedWeeklyDeltaKg, weightUnit)
      : null;
  const hasMetrics = shownWeight !== null || actualDelta !== null || expectedDelta !== null;
  const isCurrent = node.state === 'current';
  const isPast = node.state === 'past';
  const markerColor = isCurrent || isPast ? '$primary' : '$textMuted';
  const linkHint = linkHintFor(node);
  const isDanger = node.verdictType === 'REFER_REVIEW';
  const content = (
    <Card
      interactive={node.href !== undefined}
      backgroundColor={isCurrent ? '$primaryMuted' : '$cardBg'}
      borderColor={isDanger ? '$danger' : isCurrent ? '$primary' : '$borderColor'}
      borderStyle={node.projected ? 'dashed' : 'solid'}
      gap="$3"
      width="100%"
      opacity={node.state === 'future' ? 0.88 : 1}
      accessibilityLabel={[
        node.title,
        formatDate(node.date),
        shownWeight !== null ? `${shownWeight.value} ${shownWeight.unit}` : null,
        badge?.label,
      ]
        .filter((part): part is string => typeof part === 'string' && part.length > 0)
        .join(', ')}
    >
      <XStack alignItems="flex-start" justifyContent="space-between" gap="$3">
        <YStack gap="$1.5" flex={1} minWidth={0}>
          <Text
            fontFamily="$heading"
            fontSize="$headline"
            lineHeight="$headline"
            fontWeight={isCurrent ? '700' : '600'}
            color="$color"
          >
            {node.title}
          </Text>
          <XStack alignItems="center" flexWrap="wrap" gap="$2">
            <Muted fontSize="$captionDefault" lineHeight="$captionDefault">
              {formatDate(node.date)}
            </Muted>
            {badge !== null ? <Badge tone={badge.tone} label={badge.label} /> : null}
          </XStack>
        </YStack>
        {node.adherenceScore !== undefined ? (
          <JourneyAdherenceScore score={node.adherenceScore} />
        ) : null}
      </XStack>

      {hasMetrics ? (
        <XStack
          backgroundColor="$elevatedBg"
          borderRadius={12}
          paddingHorizontal="$3"
          paddingVertical="$2.5"
          gap="$3"
          flexWrap="wrap"
        >
          {shownWeight !== null ? (
            <JourneyMetric
              label="Weight"
              value={String(shownWeight.value)}
              unit={shownWeight.unit}
            />
          ) : null}
          {actualDelta !== null ? (
            <JourneyMetric label="Actual" value={actualDelta.value} unit={actualDelta.unit} />
          ) : null}
          {expectedDelta !== null ? (
            <JourneyMetric label="Expected" value={expectedDelta.value} unit={expectedDelta.unit} />
          ) : null}
        </XStack>
      ) : null}

      {node.detail !== null ? (
        <Muted fontSize="$bodyDefault" lineHeight="$bodyDefault">
          {node.detail}
        </Muted>
      ) : null}

      {linkHint !== null ? (
        <XStack alignItems="center" justifyContent="flex-end" gap="$1">
          <Muted fontSize="$captionDefault" lineHeight="$captionDefault" fontWeight="500">
            {linkHint}
          </Muted>
          <ChevronRight size={14} color="$textMuted" />
        </XStack>
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
