'use client';

import {
  Card,
  ChevronRight,
  Muted,
  Skeleton,
  SkeletonCircle,
  SkeletonRegion,
  Text,
  useMedia,
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
    paddingHorizontal="$4"
    paddingVertical="$3.5"
    flexDirection="row"
    alignItems="center"
    gap="$4"
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
    fontSize={10}
    fontWeight="600"
    color="$textMuted"
    textTransform="uppercase"
    letterSpacing={1}
    flexShrink={width !== undefined ? 0 : undefined}
  >
    {children}
  </Text>
);

/** List-only twin of RosterScreen pending branch — chrome stays mounted. */
export const RosterListSkeleton = () => {
  const media = useMedia();
  const isDesktop = Boolean(media.md);

  return (
    <SkeletonRegion label="Loading clients">
      <YStack gap="$1.5" width="100%">
        {isDesktop ? (
          <XStack paddingHorizontal="$4" gap="$4" marginBottom="$1">
            <ColumnLabel flex={1}>Client</ColumnLabel>
            <ColumnLabel width={COL.weight}>Weight</ColumnLabel>
            <ColumnLabel width={COL.goal}>Goal</ColumnLabel>
            <ColumnLabel width={COL.status}>Status</ColumnLabel>
            <ColumnLabel width={COL.progress}>Progress</ColumnLabel>
          </XStack>
        ) : null}
        {Array.from({ length: 6 }, (_, i) =>
          isDesktop ? <DesktopRow key={i} /> : <MobileRow key={i} />,
        )}
      </YStack>
    </SkeletonRegion>
  );
};
