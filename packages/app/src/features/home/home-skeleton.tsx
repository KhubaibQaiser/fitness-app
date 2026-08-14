'use client';

import {
  Card,
  ChevronRight,
  Muted,
  PageHeader,
  Skeleton,
  SkeletonCircle,
  SkeletonRegion,
  Text,
  XStack,
  YStack,
} from '@gymos/ui';
import { ScreenBody } from '../shell/screen-body';

const DueRowSkeleton = () => (
  <Card padding="$3.5">
    <XStack alignItems="center" gap="$3">
      <SkeletonCircle size={40} />
      <YStack flex={1} minWidth={0} gap={2}>
        <Skeleton width="46%" height={16} />
        <Skeleton width="62%" height={18} />
      </YStack>
      <Skeleton width={72} height={22} borderRadius={999} />
      <ChevronRight size={14} color="$textMuted" />
    </XStack>
  </Card>
);

const AttentionRowSkeleton = () => (
  <Card padding="$3.5">
    <XStack alignItems="flex-start" gap="$3">
      <SkeletonCircle size={40} />
      <YStack flex={1} minWidth={0} gap="$1.5">
        <Skeleton width="42%" height={16} />
        <XStack gap="$1" flexWrap="wrap">
          <Skeleton width={72} height={22} borderRadius={999} />
          <Skeleton width={64} height={22} borderRadius={999} />
        </XStack>
      </YStack>
      <ChevronRight size={14} color="$textMuted" />
    </XStack>
  </Card>
);

const StatValueSkeleton = ({ label }: { label: string }) => (
  <YStack gap="$1" width="100%" minWidth={110} flex={1}>
    <Muted fontSize={11} textTransform="uppercase" letterSpacing={1.2} fontWeight="500">
      {label}
    </Muted>
    <Skeleton width={48} height={34} />
  </YStack>
);

/** Structural twin of HomeScreen — same strip header, hero card, and list rows. */
export const HomeSkeleton = ({
  dateStr,
  greeting,
  firstName,
}: {
  dateStr: string;
  greeting: string;
  firstName?: string;
}) => (
  <SkeletonRegion label="Loading home">
    <PageHeader
      strip
      eyebrow={dateStr}
      title={
        firstName !== undefined ? (
          `${greeting}, ${firstName}`
        ) : (
          <XStack alignItems="center" gap="$2" flexWrap="wrap">
            <Text
              fontFamily="$heading"
              fontWeight="700"
              fontSize={22}
              color="$color"
              letterSpacing={-0.3}
            >
              {greeting},
            </Text>
            <Skeleton width={96} height={22} />
          </XStack>
        )
      }
      subtitle={<Skeleton width="70%" height={18} />}
    />

    <ScreenBody gap="$4">
      <Card padding="$5">
        <YStack gap="$1.5" alignItems="flex-start">
          <Muted fontSize={11} fontWeight="500" textTransform="uppercase" letterSpacing={1.2}>
            Needs attention
          </Muted>
          <Skeleton width={36} height={44} />
          <Skeleton width="55%" height={18} />
        </YStack>
        <XStack gap="$4" flexWrap="wrap" marginTop="$3">
          <StatValueSkeleton label="Total clients" />
          <StatValueSkeleton label="On track" />
          <StatValueSkeleton label="High alerts" />
        </XStack>
      </Card>

      <YStack gap="$5">
        <YStack gap="$3">
          <Text
            fontFamily="$heading"
            fontSize={13}
            fontWeight="600"
            textTransform="uppercase"
            letterSpacing={0.8}
            color="$color"
          >
            Due today
          </Text>
          <DueRowSkeleton />
          <DueRowSkeleton />
          <DueRowSkeleton />
        </YStack>

        <YStack gap="$3">
          <XStack alignItems="center" justifyContent="space-between">
            <Text
              fontFamily="$heading"
              fontSize={13}
              fontWeight="600"
              textTransform="uppercase"
              letterSpacing={0.8}
              color="$color"
            >
              Needs attention
            </Text>
            <Text fontSize={12} color="$primary" fontWeight="500">
              All clients →
            </Text>
          </XStack>
          <AttentionRowSkeleton />
          <AttentionRowSkeleton />
          <AttentionRowSkeleton />
        </YStack>
      </YStack>
    </ScreenBody>
  </SkeletonRegion>
);
