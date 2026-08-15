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
  if (node.kind === 'CHECK_IN') return { tone: 'success', label: 'Completed' };
  return null;
};

export const ClientJourneyNode = ({
  node,
  weightUnit,
  first,
  last,
}: {
  node: JourneyNode;
  weightUnit: WeightUnit;
  first: boolean;
  last: boolean;
}) => {
  const Icon = iconFor(node);
  const badge = badgeFor(node);
  const shownWeight = node.weightKg !== null ? formatWeight(node.weightKg, weightUnit, 1) : null;
  const markerColor =
    node.state === 'current'
      ? '$primary'
      : node.state === 'past'
        ? '$success'
        : node.state === 'skipped'
          ? '$textMuted'
          : '$borderStrong';
  const content = (
    <Card
      interactive={node.href !== undefined}
      elevated={node.state === 'current'}
      backgroundColor={node.state === 'current' ? '$elevatedBg' : '$cardBg'}
      borderWidth={node.projected ? 1 : node.state === 'current' ? 1 : 0}
      borderColor={node.state === 'current' ? '$primary' : '$borderColor'}
      borderStyle={node.projected ? 'dashed' : 'solid'}
      padding="$4"
      gap="$3"
      flex={1}
      minWidth={0}
      opacity={node.state === 'future' ? 0.82 : 1}
      accessibilityLabel={`${node.title}, ${formatDate(node.date)}${shownWeight !== null ? `, ${shownWeight.value} ${shownWeight.unit}` : ''}`}
    >
      <XStack alignItems="flex-start" justifyContent="space-between" gap="$3">
        <YStack gap={2} flex={1} minWidth={0}>
          <XStack alignItems="center" flexWrap="wrap" gap="$2">
            <Text
              fontFamily="$heading"
              fontSize={15}
              fontWeight={node.state === 'current' ? '800' : '700'}
              color="$color"
            >
              {node.title}
            </Text>
            {badge !== null ? <Badge tone={badge.tone} label={badge.label} /> : null}
          </XStack>
          <Muted fontSize={12}>{formatDate(node.date)}</Muted>
        </YStack>
        {node.adherenceScore !== undefined ? (
          <JourneyAdherenceScore score={node.adherenceScore} />
        ) : node.href !== undefined ? (
          <ChevronRight size={18} color="$textMuted" />
        ) : null}
      </XStack>

      {shownWeight !== null ? (
        <XStack alignItems="baseline" gap="$1.5">
          <Text fontFamily="$heading" fontSize={22} fontWeight="800" color="$color">
            {shownWeight.value}
          </Text>
          <Muted fontWeight="600">{shownWeight.unit}</Muted>
        </XStack>
      ) : null}

      {node.actualWeeklyDeltaKg !== undefined || node.expectedWeeklyDeltaKg !== undefined ? (
        <XStack flexWrap="wrap" gap="$3">
          {node.actualWeeklyDeltaKg !== undefined ? (
            <Muted fontSize={12}>
              Actual{' '}
              <Text fontFamily="$mono" fontSize={12} fontWeight="700" color="$color">
                {node.actualWeeklyDeltaKg > 0 ? '+' : ''}
                {node.actualWeeklyDeltaKg.toFixed(2)} kg/wk
              </Text>
            </Muted>
          ) : null}
          {node.expectedWeeklyDeltaKg !== undefined ? (
            <Muted fontSize={12}>
              Expected{' '}
              <Text fontFamily="$mono" fontSize={12} fontWeight="700" color="$color">
                {node.expectedWeeklyDeltaKg > 0 ? '+' : ''}
                {node.expectedWeeklyDeltaKg.toFixed(2)} kg/wk
              </Text>
            </Muted>
          ) : null}
        </XStack>
      ) : null}

      {node.detail !== null ? (
        <Muted fontSize={12.5} lineHeight={18}>
          {node.detail}
        </Muted>
      ) : null}
    </Card>
  );

  return (
    <XStack gap="$3" alignItems="stretch" width="100%">
      <YStack width={34} alignItems="center" position="relative">
        {!first ? (
          <YStack
            position="absolute"
            top={0}
            bottom="50%"
            width={2}
            backgroundColor="$borderColor"
          />
        ) : null}
        {!last ? (
          <YStack
            position="absolute"
            top="50%"
            bottom={0}
            width={2}
            backgroundColor="$borderColor"
          />
        ) : null}
        <YStack
          width={node.state === 'current' ? 32 : 26}
          height={node.state === 'current' ? 32 : 26}
          marginTop="$4"
          borderRadius={999}
          alignItems="center"
          justifyContent="center"
          backgroundColor={node.state === 'current' ? '$primaryMuted' : '$cardBg'}
          borderWidth={node.state === 'current' ? 3 : 2}
          borderColor={markerColor}
          zIndex={1}
        >
          <Icon size={node.state === 'current' ? 15 : 12} color={markerColor} />
        </YStack>
      </YStack>
      {node.href !== undefined ? <Link href={node.href}>{content}</Link> : content}
    </XStack>
  );
};
