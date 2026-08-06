'use client';

import { Body, Muted, Text, XStack, YStack } from '@gymos/ui';

/** Numbered step in the Layer-1 overview. */
export const PipelineStep = ({
  step,
  title,
  detail,
  last,
}: {
  step: number;
  title: string;
  detail: string;
  last?: boolean;
}) => (
  <XStack gap="$3" alignItems="stretch">
    <YStack alignItems="center" width={28} flexShrink={0}>
      <YStack
        width={28}
        height={28}
        borderRadius={999}
        backgroundColor="$primary"
        alignItems="center"
        justifyContent="center"
      >
        <Text color="$primaryFg" fontFamily="$heading" fontWeight="800" fontSize={13}>
          {step}
        </Text>
      </YStack>
      {!last ? (
        <YStack
          flex={1}
          width={2}
          backgroundColor="$borderColor"
          marginVertical={4}
          minHeight={12}
        />
      ) : null}
    </YStack>
    <YStack flex={1} gap={2} minWidth={0} paddingBottom={last ? 0 : '$3'}>
      <Body fontFamily="$heading" fontWeight="800" fontSize={15}>
        {title}
      </Body>
      <Muted fontSize={13} lineHeight={19}>
        {detail}
      </Muted>
    </YStack>
  </XStack>
);
