'use client';

import { Link } from 'solito/link';
import {
  ArrowLeft,
  Card,
  IconButton,
  Muted,
  SectionTitle,
  SegmentedControl,
  Skeleton,
  SkeletonRegion,
  XStack,
  YStack,
} from '@gymos/ui';
import { AppScreen } from '../shell/app-screen';

const DAY_OPTIONS = [
  { value: 1, label: 'Mon' },
  { value: 2, label: 'Tue' },
  { value: 3, label: 'Wed' },
  { value: 4, label: 'Thu' },
  { value: 5, label: 'Fri' },
  { value: 6, label: 'Sat' },
  { value: 7, label: 'Sun' },
] as const;

const MealCardSkeleton = () => (
  <Card gap="$2">
    <XStack alignItems="center" justifyContent="space-between" gap="$3">
      <YStack flex={1} gap="$1">
        <Skeleton width="48%" height={22} />
        <Skeleton width="72%" height={18} />
      </YStack>
    </XStack>
  </Card>
);

/** Twin of PlanEditor chrome — back + title, targets, day switcher, 3 meals. */
export const PlanSkeleton = ({ clientId }: { clientId: string }) => (
  <AppScreen>
    <SkeletonRegion label="Loading meal plan" gap="$4">
      <XStack alignItems="flex-start" gap="$2" width="100%">
        <Link href={`/clients/${clientId}`}>
          <IconButton aria-label="Back to client" icon={<ArrowLeft size={20} color="$color" />} />
        </Link>
        <XStack
          flex={1}
          alignItems="flex-start"
          justifyContent="space-between"
          gap="$3"
          minWidth={0}
        >
          <YStack flex={1} gap={2} minWidth={0}>
            <Skeleton width="56%" height={24} />
          </YStack>
          <Skeleton width={72} height={22} borderRadius={999} />
        </XStack>
      </XStack>

      <Card>
        <XStack alignItems="center" justifyContent="space-between" gap="$3">
          <Skeleton width="42%" height={22} />
          <Skeleton width={56} height={22} borderRadius={999} />
        </XStack>
        <Skeleton width="78%" height={18} />
      </Card>

      <YStack gap="$2">
        <SegmentedControl
          ariaLabel="Plan day"
          options={[...DAY_OPTIONS]}
          value={1}
          onChange={() => undefined}
        />
        <Muted fontSize={12}>Matches daily template</Muted>
      </YStack>

      {(['Breakfast', 'Lunch', 'Dinner'] as const).map((slot) => (
        <YStack key={slot} gap="$2">
          <SectionTitle>{slot}</SectionTitle>
          <MealCardSkeleton />
        </YStack>
      ))}

      <Muted fontSize={12} textAlign="center">
        General fitness nutrition guidance, not medical advice. PDF matches the locked diet-plan
        template (Breakfast/Lunch options, Dinner list).
      </Muted>
    </SkeletonRegion>
  </AppScreen>
);
