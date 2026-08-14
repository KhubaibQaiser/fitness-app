'use client';

import { Card, PageHeader, Row, Skeleton, SkeletonRegion, YStack } from '@gymos/ui';

const AlertCardSkeleton = () => (
  <Card>
    <Row>
      <Skeleton width="48%" height={22} />
      <Skeleton width={56} height={22} borderRadius={999} />
    </Row>
    <Skeleton width="36%" height={18} />
    <Skeleton width="44%" height={18} />
  </Card>
);

/** Inner twin of NotificationsScreen — real header, 5 alert cards. */
export const NotificationsSkeleton = () => (
  <SkeletonRegion label="Loading alerts" gap="$4">
    <PageHeader
      title="Alerts"
      subtitle="Check-ins, safety flags, plan blocks"
      action={<YStack width={1} height={48} />}
    />
    <AlertCardSkeleton />
    <AlertCardSkeleton />
    <AlertCardSkeleton />
    <AlertCardSkeleton />
    <AlertCardSkeleton />
  </SkeletonRegion>
);
