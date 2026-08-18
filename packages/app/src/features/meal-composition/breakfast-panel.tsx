'use client';

import { BREAKFAST_FOOD_NAMES } from '@gymos/core/nutrition';
import { Body, Card, Muted, XStack, YStack } from '@gymos/ui';
import { PanelHeading } from '../nutrition-criteria/panel-heading';

export const BreakfastPanel = () => (
  <YStack gap="$4">
    <PanelHeading
      title="Breakfast only"
      subtitle="Hard allowlist. Chicken, beef, and other lunch proteins never appear here."
    />
    <Card gap="$2">
      <Muted fontSize={13}>Pattern: protein + staple + beverage (drink is a fixed 1 cup).</Muted>
      <XStack flexWrap="wrap" gap="$2" marginTop="$2">
        {BREAKFAST_FOOD_NAMES.map((name) => (
          <YStack
            key={name}
            backgroundColor="$elevatedBg"
            borderRadius={999}
            paddingHorizontal="$3"
            paddingVertical="$2"
            borderWidth={1}
            borderColor="$borderColor"
          >
            <Body fontSize={13}>{name}</Body>
          </YStack>
        ))}
      </XStack>
    </Card>
  </YStack>
);
