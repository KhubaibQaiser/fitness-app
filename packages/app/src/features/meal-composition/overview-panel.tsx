'use client';

import { MEAL_TEMPLATES, type MealSlot } from '@gymos/core/nutrition';
import { Body, Card, Muted, XStack, YStack } from '@gymos/ui';
import { PanelHeading } from '../nutrition-criteria/panel-heading';

const SLOT_LABEL: Record<MealSlot, string> = {
  breakfast: 'Breakfast',
  lunch: 'Lunch',
  dinner: 'Dinner',
  snack: 'Snack',
};

/** Day structure for each meal-count option. */
export const OverviewPanel = () => (
  <YStack gap="$4">
    <Card gap="$3" tone="accent">
      <Body fontFamily="$heading" fontWeight="800" fontSize={16}>
        What this page is
      </Body>
      <Muted lineHeight={20}>
        Layer 2 builds each day from fixed meal templates — not AI guesses. The coach picks 3, 4, or
        5 meals when generating a plan. Food pools are slot-filtered so breakfast stays breakfast.
      </Muted>
    </Card>

    <PanelHeading
      title="Meals per day"
      subtitle="Same keys as the generate screen: 3 meals, +1 snack, or +2 snacks."
    />

    {([3, 4, 5] as const).map((count) => (
      <Card key={count} gap="$3">
        <Body fontFamily="$heading" fontWeight="700">
          {count === 3 ? '3 meals (default)' : count === 4 ? '4 — one snack' : '5 — two snacks'}
        </Body>
        <XStack flexWrap="wrap" gap="$2">
          {MEAL_TEMPLATES[count].map((meal, index) => (
            <YStack
              key={`${count}-${index}-${meal.slot}`}
              backgroundColor="$elevatedBg"
              borderRadius={10}
              paddingHorizontal="$3"
              paddingVertical="$2"
              borderWidth={1}
              borderColor="$borderColor"
            >
              <Body fontSize={13} fontWeight="700">
                {SLOT_LABEL[meal.slot]}
              </Body>
              <Muted fontSize={11}>{Math.round(meal.share * 100)}% kcal</Muted>
            </YStack>
          ))}
        </XStack>
      </Card>
    ))}
  </YStack>
);
