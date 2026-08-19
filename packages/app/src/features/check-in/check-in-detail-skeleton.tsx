'use client';

import { useRouter } from 'solito/navigation';
import {
  Card,
  GhostButton,
  PageHeader,
  PrimaryButton,
  Skeleton,
  SkeletonCircle,
  SkeletonRegion,
  StickyFormFooter,
  Text,
  XStack,
  YStack,
} from '@gymos/ui';
import { AppScreen } from '../shell/app-screen';

const FieldBone = ({ label, unit }: { label: string; unit: string }) => (
  <YStack gap="$1.5" width="100%">
    <Text
      fontFamily="$heading"
      fontWeight="500"
      fontSize={12}
      color="$textMuted"
      textTransform="uppercase"
      letterSpacing={0.8}
    >
      {label}
    </Text>
    <XStack position="relative" alignItems="center" width="100%">
      <Skeleton width="100%" height={48} />
      <Text
        position="absolute"
        right={12}
        fontFamily="$mono"
        fontSize={14}
        color="$textMuted"
        pointerEvents="none"
      >
        {unit}
      </Text>
    </XStack>
  </YStack>
);

/** Twin of CheckInDetailScreen — header, verdict card, form, two-button footer. */
export const CheckInDetailSkeleton = ({ clientId }: { clientId: string }) => {
  const router = useRouter();

  return (
    <AppScreen
      footer={
        <StickyFormFooter>
          <GhostButton flex={1} onPress={() => router.replace(`/clients/${clientId}`)}>
            Cancel
          </GhostButton>
          <PrimaryButton flex={1} disabled>
            Save & re-run
          </PrimaryButton>
        </StickyFormFooter>
      }
    >
      <SkeletonRegion label="Loading check-in" gap="$4">
        <PageHeader
          title={
            <XStack alignItems="center" gap="$2" flexWrap="wrap">
              <Text
                fontFamily="$heading"
                fontWeight="700"
                fontSize={20}
                color="$color"
                letterSpacing={-0.3}
              >
                Check-in ·
              </Text>
              <Skeleton width={88} height={20} />
            </XStack>
          }
          subtitle="Edit inputs and re-run the engine"
        />

        <Card gap="$4" marginBottom="$4" alignItems="center">
          <SkeletonCircle size={72} />
          <YStack gap="$3" width="100%" alignItems="stretch">
            <XStack alignItems="center" justifyContent="space-between" gap="$3">
              <Skeleton width="55%" height={22} />
              <Skeleton width={88} height={22} borderRadius={999} />
            </XStack>
            <Skeleton width="100%" height={22} />
            <Skeleton width="88%" height={18} />
          </YStack>
        </Card>

        <Card gap="$4">
          <FieldBone label="Weight" unit="kg" />
          <YStack gap="$3">
            <FieldBone label="Plan adherence" unit="%" />
            <SkeletonCircle size={88} />
          </YStack>
          <YStack gap="$1.5" width="100%">
            <Text
              fontFamily="$heading"
              fontWeight="500"
              fontSize={12}
              color="$textMuted"
              textTransform="uppercase"
              letterSpacing={0.8}
            >
              Notes (optional)
            </Text>
            <Skeleton width="100%" height={96} />
          </YStack>
        </Card>
      </SkeletonRegion>
    </AppScreen>
  );
};
