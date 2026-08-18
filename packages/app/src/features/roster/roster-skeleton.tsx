'use client';

import {
  Card,
  ChevronRight,
  Muted,
  Skeleton,
  SkeletonCircle,
  SkeletonRegion,
  Text,
  XStack,
  YStack,
} from '@gymos/ui';

/** Kit desktop columns — keep in lockstep with roster-row.tsx */
const COL = {
  weight: 120,
  goal: 100,
  status: 160,
  progress: 100,
} as const;

const MobileRow = () => (
  <Card paddingHorizontal="$4" paddingVertical="$3.5" gap="$2">
    <XStack alignItems="center" gap="$3">
      <SkeletonCircle size={32} />
      <YStack flex={1} minWidth={0} gap={2}>
        <XStack alignItems="center" gap="$2" flexWrap="wrap">
          <Skeleton width="48%" height={16} />
          <Skeleton width={72} height={22} borderRadius={999} />
        </XStack>
        <Skeleton width="40%" height={14} />
      </YStack>
      <ChevronRight size={14} color="$textMuted" />
    </XStack>
  </Card>
);

const DesktopRow = () => (
  <Card
    borderRadius={0}
    backgroundColor="$surface"
    borderWidth={0}
    borderBottomWidth={1}
    borderBottomColor="$borderColor"
    paddingHorizontal="$4"
    paddingVertical="$3"
    flexDirection="row"
    alignItems="center"
    gap="$4"
    shadowOpacity={0}
  >
    <XStack flex={1} alignItems="center" gap="$3" minWidth={0}>
      <SkeletonCircle size={32} />
      <YStack flex={1} minWidth={0} gap={2}>
        <Skeleton width="56%" height={16} />
        <Skeleton width="38%" height={14} />
      </YStack>
    </XStack>
    <XStack width={COL.weight} alignItems="baseline" gap={2} flexShrink={0}>
      <Skeleton width={36} height={16} />
    </XStack>
    <YStack width={COL.goal} flexShrink={0}>
      <Skeleton width={48} height={16} />
    </YStack>
    <YStack width={COL.status} gap="$1" flexShrink={0} alignItems="flex-start">
      <Skeleton width={88} height={22} borderRadius={999} />
    </YStack>
    <YStack width={COL.progress} flexShrink={0} justifyContent="center">
      <Muted fontSize={11}>—</Muted>
    </YStack>
  </Card>
);

const ColumnLabel = ({
  children,
  width,
  flex,
}: {
  children: string;
  width?: number;
  flex?: number;
}) => (
  <Text
    flex={flex}
    width={width}
    fontSize={13}
    fontWeight="500"
    color="$textMuted"
    flexShrink={width !== undefined ? 0 : undefined}
  >
    {children}
  </Text>
);

/** List-only twin of RosterScreen pending branch — chrome stays mounted. */
export const RosterListSkeleton = () => (
  <SkeletonRegion label="Loading clients">
    <YStack gap="$1.5" width="100%">
      <YStack width="100%" display="flex" $md={{ display: 'none' }} gap="$1.5">
        {Array.from({ length: 6 }, (_, i) => (
          <MobileRow key={i} />
        ))}
      </YStack>
      <YStack width="100%" display="none" $md={{ display: 'flex' }}>
        <Card padding={0} gap={0} overflow="hidden">
          <XStack paddingHorizontal="$4" paddingVertical="$3" gap="$4">
            <ColumnLabel flex={1}>Client</ColumnLabel>
            <ColumnLabel width={COL.weight}>Weight</ColumnLabel>
            <ColumnLabel width={COL.goal}>Goal</ColumnLabel>
            <ColumnLabel width={COL.status}>Status</ColumnLabel>
            <ColumnLabel width={COL.progress}>Progress</ColumnLabel>
          </XStack>
          {Array.from({ length: 6 }, (_, i) => (
            <DesktopRow key={i} />
          ))}
        </Card>
      </YStack>
    </YStack>
  </SkeletonRegion>
);
