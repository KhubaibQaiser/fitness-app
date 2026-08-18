'use client';

import {
  Card,
  Muted,
  Skeleton,
  SkeletonCircle,
  SkeletonRegion,
  Tabs,
  Text,
  XStack,
  YStack,
} from '@gymos/ui';
import {
  JOURNEY_MARKER_SIZE,
  JOURNEY_RAIL_WIDTH,
  JOURNEY_SPINE_INSET,
  JOURNEY_SPINE_LEFT,
} from '../client-journey/client-journey-node';
import { ScreenBody } from '../shell/screen-body';
import { ClientHubMoreMenu } from './client-hub-more-menu';
import { CLIENT_HUB_TABS } from './client-hub-tabs';

const HubStatCard = ({ label }: { label: string }) => (
  <Card
    flexBasis="47%"
    flexGrow={1}
    flexShrink={1}
    minWidth={140}
    $md={{ flexBasis: 0, flex: 1 }}
    padding="$4"
  >
    <YStack gap="$1" width="100%">
      <Muted fontSize={11} textTransform="uppercase" letterSpacing={1.2} fontWeight="500">
        {label}
      </Muted>
      <Skeleton width={64} height={34} />
      <Skeleton width="55%" height={18} />
    </YStack>
  </Card>
);

export const ClientHubHeaderSkeleton = ({
  clientId,
  tab,
  onTabChange,
}: {
  clientId: string;
  tab: string;
  onTabChange: (id: string) => void;
}) => (
  <YStack
    position="sticky"
    top={0}
    zIndex={20}
    backgroundColor="$cardBg"
    borderBottomWidth={1}
    borderBottomColor="$borderColor"
    paddingTop="$md"
    paddingBottom={0}
    width="100%"
    alignSelf="stretch"
  >
    <XStack
      alignItems="center"
      gap="$2.5"
      width="100%"
      paddingHorizontal={16}
      paddingBottom="$md"
      $md={{ paddingHorizontal: 24 }}
    >
      <SkeletonCircle size={40} />
      <YStack flex={1} minWidth={0} gap={2}>
        <Skeleton width="48%" height={16} />
        <XStack flexWrap="wrap" gap="$xs" alignItems="center">
          <Skeleton width={112} height={16} />
          <Skeleton width={140} height={16} />
        </XStack>
      </YStack>
      <ClientHubMoreMenu
        clientId={clientId}
        signed={false}
        pdfPending={false}
        onDownloadPdf={() => undefined}
      />
    </XStack>
    <Tabs
      items={[...CLIENT_HUB_TABS]}
      value={tab}
      onChange={onTabChange}
      ariaLabel="Client sections"
    />
  </YStack>
);

export const ClientHubOverviewSkeleton = () => (
  <YStack gap="$5" width="100%">
    <XStack flexWrap="wrap" gap="$3" width="100%">
      <HubStatCard label="Current weight" />
      <HubStatCard label="Goal progress" />
      <HubStatCard label="BMI" />
      <HubStatCard label="Pace" />
    </XStack>

    <XStack flexWrap="wrap" gap="$3" width="100%" alignItems="stretch">
      <YStack flex={1} flexBasis={280} minWidth={280}>
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
      </YStack>
      <Card
        gap="$3"
        padding="$5"
        alignItems="center"
        justifyContent="center"
        flex={1}
        flexBasis={220}
        minWidth={220}
        minHeight={220}
      >
        <Muted fontSize={11} fontWeight="600" textTransform="uppercase" letterSpacing={0.8}>
          Goal progress
        </Muted>
        <SkeletonCircle size={220} />
        <XStack gap="$6">
          <YStack alignItems="center" gap={2}>
            <Muted fontSize={11}>Start</Muted>
            <Skeleton width={48} height={18} />
          </YStack>
          <YStack alignItems="center" gap={2}>
            <Muted fontSize={11}>Target</Muted>
            <Skeleton width={48} height={18} />
          </YStack>
        </XStack>
      </Card>
    </XStack>
  </YStack>
);

export const ClientHubJourneySkeleton = () => (
  <YStack width="100%" maxWidth={760} alignSelf="center" gap="$3">
    <Skeleton width="72%" height={22} />
    <YStack width="100%" position="relative">
      <YStack
        position="absolute"
        top={JOURNEY_SPINE_INSET}
        bottom={JOURNEY_SPINE_INSET}
        left={JOURNEY_SPINE_LEFT}
        width={2}
        backgroundColor="$track"
        zIndex={0}
      />
      {Array.from({ length: 3 }, (_, i) => (
        <XStack
          key={i}
          gap="$3"
          alignItems="stretch"
          width="100%"
          paddingBottom={i === 2 ? 0 : '$5'}
        >
          <YStack width={JOURNEY_RAIL_WIDTH} alignItems="center" zIndex={1}>
            <SkeletonCircle size={JOURNEY_MARKER_SIZE} />
          </YStack>
          <Card flex={1} minWidth={0} gap="$3" padding="$4">
            <XStack alignItems="center" justifyContent="space-between" gap="$3">
              <YStack gap="$1" flex={1} minWidth={0}>
                <Skeleton width="48%" height={18} />
                <Skeleton width={96} height={14} />
              </YStack>
              <SkeletonCircle size={48} />
            </XStack>
            <Skeleton width={72} height={24} />
            <Skeleton width="90%" height={16} />
          </Card>
        </XStack>
      ))}
    </YStack>
  </YStack>
);

export const ClientHubPlanSkeleton = () => (
  <YStack gap="$4">
    <Card gap="$4" padding="$4">
      <XStack alignItems="center" justifyContent="space-between" gap="$3">
        <Text fontFamily="$heading" fontWeight="700" fontSize={13} color="$color">
          Active goal
        </Text>
        <Skeleton width={96} height={48} />
      </XStack>
      <XStack flexWrap="wrap" gap="$4">
        {['Objective', 'Pace', 'Activity', 'Start weight', 'Target weight', 'Remaining'].map(
          (label) => (
            <YStack key={label} width="45%" $md={{ width: '30%' }} gap={2}>
              <Muted fontSize={11}>{label}</Muted>
              <Skeleton width="70%" height={16} />
            </YStack>
          ),
        )}
      </XStack>
    </Card>

    <Card gap="$3" padding="$4">
      <XStack alignItems="center" justifyContent="space-between" gap="$3">
        <Text fontFamily="$heading" fontWeight="700" fontSize={13} color="$color">
          Dietary profile
        </Text>
        <Skeleton width={72} height={48} />
      </XStack>
      <XStack gap="$2" flexWrap="wrap">
        <Skeleton width={72} height={22} borderRadius={999} />
        <Skeleton width={88} height={22} borderRadius={999} />
        <Skeleton width={64} height={22} borderRadius={999} />
      </XStack>
    </Card>

    <Card interactive gap="$3" padding="$4">
      <XStack alignItems="center" justifyContent="space-between" gap="$3">
        <YStack gap={2} flex={1} minWidth={0}>
          <Text fontFamily="$heading" fontWeight="700" fontSize={13} color="$color">
            Meal plan
          </Text>
          <Skeleton width="40%" height={14} />
        </YStack>
        <Skeleton width={80} height={22} borderRadius={999} />
      </XStack>
      <XStack
        gap="$2"
        backgroundColor="$elevatedBg"
        borderRadius="$radiusCard"
        padding="$3"
        justifyContent="space-between"
      >
        {['kcal', 'Protein', 'Carbs', 'Fat', 'Fiber'].map((label) => (
          <YStack key={label} alignItems="center" flex={1} gap={4}>
            <Skeleton width={28} height={18} />
            <Muted fontSize={10}>{label}</Muted>
          </YStack>
        ))}
      </XStack>
    </Card>
  </YStack>
);

export const ClientHubHistorySkeleton = () => (
  <YStack gap="$2.5">
    {Array.from({ length: 4 }, (_, i) => (
      <Card key={i} gap="$2" padding="$4">
        <XStack flexWrap="wrap" alignItems="center" gap="$2">
          <Skeleton width={96} height={16} />
          <Skeleton width={64} height={22} borderRadius={999} />
        </XStack>
        <XStack flexWrap="wrap" gap="$4">
          <Skeleton width={88} height={18} />
          <Skeleton width={104} height={18} />
        </XStack>
      </Card>
    ))}
  </YStack>
);

/** Flush hub chrome + tab body while client detail is pending. */
export const ClientHubSkeleton = ({
  clientId,
  tab,
  onTabChange,
}: {
  clientId: string;
  tab: string;
  onTabChange: (id: string) => void;
}) => (
  <SkeletonRegion label="Loading client">
    <ClientHubHeaderSkeleton clientId={clientId} tab={tab} onTabChange={onTabChange} />
    <ScreenBody gap="$4">
      {tab === 'plan' ? (
        <ClientHubPlanSkeleton />
      ) : tab === 'history' ? (
        <ClientHubHistorySkeleton />
      ) : tab === 'journey' ? (
        <ClientHubJourneySkeleton />
      ) : (
        <ClientHubOverviewSkeleton />
      )}
    </ScreenBody>
  </SkeletonRegion>
);
