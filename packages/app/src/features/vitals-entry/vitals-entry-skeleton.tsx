'use client';

import { useRouter } from 'solito/navigation';
import {
  Card,
  FormSection,
  GhostButton,
  Muted,
  PageHeader,
  PrimaryButton,
  Skeleton,
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

const BODY = [
  { label: 'Weight', unit: 'kg' },
  { label: 'Body fat', unit: '%' },
] as const;

const MEASURE = [
  { label: 'Waist', unit: 'cm' },
  { label: 'Chest', unit: 'cm' },
  { label: 'Hip', unit: 'cm' },
  { label: 'Arm', unit: 'cm' },
  { label: 'Thigh', unit: 'cm' },
] as const;

const CARDIO = [
  { label: 'Resting HR', unit: 'bpm' },
  { label: 'BP systolic', unit: 'mmHg' },
  { label: 'BP diastolic', unit: 'mmHg' },
] as const;

/** Twin of VitalsEntryScreen — static labels, 48px inputs, sticky footer. */
export const VitalsEntrySkeleton = () => {
  const router = useRouter();

  return (
    <AppScreen
      footer={
        <StickyFormFooter>
          <GhostButton flex={1} onPress={() => router.back()}>
            Cancel
          </GhostButton>
          <PrimaryButton flex={1} disabled>
            Save measurements
          </PrimaryButton>
        </StickyFormFooter>
      }
    >
      <SkeletonRegion label="Loading vitals" gap="$4">
        <PageHeader
          title="Record vitals"
          subtitle="Fill only what you measured. History is never overwritten."
        />
        <Card gap="$4">
          <FormSection title="Body composition">
            {BODY.map((field) => (
              <FieldBone key={field.label} {...field} />
            ))}
          </FormSection>
        </Card>
        <Card gap="$4">
          <FormSection title="Circumferences">
            {MEASURE.map((field) => (
              <FieldBone key={field.label} {...field} />
            ))}
          </FormSection>
        </Card>
        <Card gap="$4">
          <FormSection title="Cardio">
            {CARDIO.map((field) => (
              <FieldBone key={field.label} {...field} />
            ))}
          </FormSection>
        </Card>
        <Muted fontSize={12}>Empty fields are skipped. Prior values are never overwritten.</Muted>
      </SkeletonRegion>
    </AppScreen>
  );
};
