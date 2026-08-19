'use client';

import { useRouter } from 'solito/navigation';
import { formatRestrictionLabel } from '@gymos/core/nutrition';
import {
  Card,
  GhostButton,
  Muted,
  OutlineButton,
  PageHeader,
  PrimaryButton,
  Skeleton,
  SkeletonRegion,
  StickyFormFooter,
  Text,
  XStack,
} from '@gymos/ui';
import { AppScreen } from '../shell/app-screen';
import { DIETARY_ALLERGENS, DIETARY_RELIGIOUS } from './dietary-catalog';

const ChipBone = ({ code }: { code: string }) => (
  <Skeleton>
    <GhostButton
      disabled
      backgroundColor="$elevatedBg"
      borderColor="$elevatedBg"
      color="$elevatedBg"
    >
      {formatRestrictionLabel(code)}
    </GhostButton>
  </Skeleton>
);

/** Twin of DietaryScreen — real labels, catalog-sized chips, sticky footer. */
export const DietarySkeleton = () => {
  const router = useRouter();

  return (
    <AppScreen
      footer={
        <StickyFormFooter>
          <OutlineButton flex={1} onPress={() => router.back()}>
            Cancel
          </OutlineButton>
          <PrimaryButton flex={1} disabled>
            Save profile
          </PrimaryButton>
        </StickyFormFooter>
      }
    >
      <SkeletonRegion label="Loading dietary profile" gap="$4">
        <PageHeader
          title="Dietary profile"
          subtitle={
            <XStack alignItems="center" gap="$2">
              <Muted fontSize={13}>Version</Muted>
              <Skeleton width={16} height={18} />
              <Muted fontSize={13}>· changes re-validate the live plan</Muted>
            </XStack>
          }
        />

        <Card padding="$4">
          <Text
            fontFamily="$heading"
            fontSize={14}
            fontWeight="500"
            color="$danger"
            marginBottom="$2"
          >
            Severe allergies
          </Text>
          <XStack gap="$2" flexWrap="wrap">
            {DIETARY_ALLERGENS.map((a) => (
              <ChipBone key={a} code={`allergen:${a}`} />
            ))}
          </XStack>
          <Muted fontSize={12} marginTop="$3">
            Severe allergies are hard blocks in the meal engine.
          </Muted>
        </Card>

        <Card padding="$4">
          <Text
            fontFamily="$heading"
            fontSize={14}
            fontWeight="500"
            color="$color"
            marginBottom="$2"
          >
            Religious / lifestyle
          </Text>
          <XStack gap="$2" flexWrap="wrap">
            {DIETARY_RELIGIOUS.map((r) => (
              <ChipBone key={r} code={`religious:${r}`} />
            ))}
          </XStack>
        </Card>
      </SkeletonRegion>
    </AppScreen>
  );
};
