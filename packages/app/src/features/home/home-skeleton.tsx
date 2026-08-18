'use client';

import {
  Card,
  ChevronRight,
  Muted,
  PageHeader,
  ScrollView,
  Skeleton,
  SkeletonCircle,
  SkeletonRegion,
  Text,
  WeaveLine,
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
  <Card padding="$4">
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

/** Structural twin of HomeScreen — greeting, compact stats, attention strip, due list. */
export const HomeSkeleton = () => (
  <SkeletonRegion label="Loading home">
    <PageHeader
      strip
      eyebrow={<Skeleton width={140} height={12} />}
      title={<Skeleton width={220} height={22} />}
      subtitle={<Skeleton width="70%" height={18} />}
    />

    <ScreenBody gap="$4">
      <WeaveLine id="home-loading" mode="loading" height={28} />
      <XStack flexWrap="wrap" gap="$3" width="100%">
        <YStack flexBasis="47%" flexGrow={1} minWidth={140} $md={{ flexBasis: 0, flex: 1 }}>
          <Card padding="$3">
            <Muted fontSize={12}>Needs attention</Muted>
            <Skeleton width={36} height={24} />
          </Card>
        </YStack>
        <YStack flexBasis="47%" flexGrow={1} minWidth={140} $md={{ flexBasis: 0, flex: 1 }}>
          <Card padding="$3">
            <Muted fontSize={12}>Total clients</Muted>
            <Skeleton width={36} height={24} />
          </Card>
        </YStack>
        <YStack flexBasis="47%" flexGrow={1} minWidth={140} $md={{ flexBasis: 0, flex: 1 }}>
          <Card padding="$3">
            <Muted fontSize={12}>On track</Muted>
            <Skeleton width={36} height={24} />
          </Card>
        </YStack>
        <YStack flexBasis="47%" flexGrow={1} minWidth={140} $md={{ flexBasis: 0, flex: 1 }}>
          <Card padding="$3">
            <Muted fontSize={12}>High alerts</Muted>
            <Skeleton width={36} height={24} />
          </Card>
        </YStack>
      </XStack>

      <YStack gap="$5">
        <YStack gap="$3">
          <Text fontFamily="$heading" fontSize={14} fontWeight="600" color="$color">
            Needs attention
          </Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <XStack gap="$3">
              <YStack minWidth={240}>
                <AttentionRowSkeleton />
              </YStack>
              <YStack minWidth={240}>
                <AttentionRowSkeleton />
              </YStack>
            </XStack>
          </ScrollView>
        </YStack>

        <YStack gap="$3">
          <Text fontFamily="$heading" fontSize={14} fontWeight="600" color="$color">
            Due today
          </Text>
          <DueRowSkeleton />
          <DueRowSkeleton />
          <DueRowSkeleton />
        </YStack>
      </YStack>
    </ScreenBody>
  </SkeletonRegion>
);
