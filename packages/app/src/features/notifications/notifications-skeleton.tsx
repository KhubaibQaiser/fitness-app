'use client';

import {
  Card,
  PageHeader,
  Skeleton,
  SkeletonCircle,
  SkeletonRegion,
  XStack,
  YStack,
} from '@gymos/ui';

const AlertRowSkeleton = () => (
  <XStack alignItems="center" gap={12} paddingHorizontal="$2" paddingVertical="$2.5" minHeight={44}>
    <SkeletonCircle size={32} />
    <YStack flex={1} minWidth={0} gap={2}>
      <Skeleton width="58%" height={16} />
      <Skeleton width="36%" height={14} />
    </YStack>
    <Skeleton width={8} height={8} borderRadius={999} />
  </XStack>
);

/** Inner twin of NotificationsScreen — real header, one card of rows. */
export const NotificationsSkeleton = () => (
  <SkeletonRegion label="Loading alerts" gap="$4">
    <PageHeader
      title="Notifications"
      subtitle="Check-ins, safety flags, plan blocks"
      action={<YStack width={1} height={48} />}
    />
    <Card padding="$2" gap={0}>
      <AlertRowSkeleton />
      <AlertRowSkeleton />
      <AlertRowSkeleton />
      <AlertRowSkeleton />
      <AlertRowSkeleton />
    </Card>
  </SkeletonRegion>
);
