'use client';

import { Body, Muted, Text, XStack, YStack } from '@gymos/ui';

/** Label / value row with stronger visual separation. */
export const CriteriaRow = ({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) => (
  <XStack
    alignItems="center"
    justifyContent="space-between"
    gap="$3"
    width="100%"
    paddingVertical="$2.5"
    borderBottomWidth={1}
    borderBottomColor="$borderColor"
  >
    <YStack flex={1} minWidth={0} gap={2}>
      <Body fontWeight="600" fontSize={14}>
        {label}
      </Body>
      {hint ? (
        <Muted fontSize={12} lineHeight={16}>
          {hint}
        </Muted>
      ) : null}
    </YStack>
    <Text
      fontFamily="$heading"
      fontWeight="800"
      fontSize={15}
      color="$primary"
      textAlign="right"
      flexShrink={0}
    >
      {value}
    </Text>
  </XStack>
);
