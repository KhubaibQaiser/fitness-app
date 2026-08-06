'use client';

import { Body, Muted, Text, XStack, YStack } from '@gymos/ui';

type PaceCell = {
  label: string;
  value: string;
  color: string;
};

/** One goal row: title, protein, blurb, then an equal 3-column pace grid. */
export const GoalDeltaCard = ({
  title,
  blurb,
  proteinLabel,
  paces,
}: {
  title: string;
  blurb: string;
  proteinLabel: string;
  paces: readonly PaceCell[];
}) => (
  <YStack
    backgroundColor="$cardBg"
    borderRadius={16}
    borderWidth={1}
    borderColor="$borderColor"
    padding="$3.5"
    gap="$3"
  >
    <XStack alignItems="center" justifyContent="space-between" gap="$3">
      <Body fontFamily="$heading" fontWeight="800" fontSize={16} flex={1} minWidth={0}>
        {title}
      </Body>
      <YStack
        backgroundColor="$elevatedBg"
        borderRadius={999}
        borderWidth={1}
        borderColor="$borderColor"
        paddingHorizontal="$2.5"
        paddingVertical="$1.5"
        flexShrink={0}
      >
        <Text fontFamily="$heading" fontSize={11} fontWeight="700" color="$textMuted">
          {proteinLabel}
        </Text>
      </YStack>
    </XStack>

    <Muted fontSize={13} lineHeight={18}>
      {blurb}
    </Muted>

    <XStack gap="$2" width="100%">
      {paces.map((pace) => (
        <YStack
          key={pace.label}
          flex={1}
          minWidth={0}
          alignItems="center"
          justifyContent="center"
          gap={4}
          backgroundColor="$elevatedBg"
          borderRadius={12}
          borderWidth={1}
          borderColor="$borderColor"
          paddingVertical="$2.5"
          paddingHorizontal="$1.5"
        >
          <Muted
            fontSize={10}
            fontWeight="800"
            textTransform="uppercase"
            letterSpacing={0.5}
            textAlign="center"
          >
            {pace.label}
          </Muted>
          <Text
            fontFamily="$heading"
            fontWeight="800"
            fontSize={17}
            color={pace.color}
            textAlign="center"
          >
            {pace.value}
          </Text>
        </YStack>
      ))}
    </XStack>
  </YStack>
);
