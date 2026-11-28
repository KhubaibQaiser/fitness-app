'use client';

import { Muted, Text, YStack } from '@gymos/ui';

/** Compact formula callout — secondary to plain-language explanation. */
export const FormulaBlock = ({
  label = 'Formula',
  lines,
}: {
  label?: string;
  lines: readonly string[];
}) => (
  <YStack
    backgroundColor="elevatedBg"
    borderRadius={12}
    borderWidth={1}
    borderColor="border-color"
    padding="3"
    gap="2"
  >
    <Muted fontSize={11} textTransform="uppercase" letterSpacing={0.8} fontWeight="700">
      {label}
    </Muted>
    {lines.map((line) => (
      <Text
        key={line}
        fontFamily="body"
        fontSize={13}
        fontWeight="600"
        color="color"
        lineHeight="20px"
      >
        {line}
      </Text>
    ))}
  </YStack>
);
