'use client';

import { ACTIVITY_LEVELS } from '@gymos/core/nutrition';
import { Body, Card, Muted, Text, XStack, YStack } from '@gymos/ui';
import { FormulaBlock } from './formula-block';
import { PanelHeading } from './panel-heading';

const ACTIVITY_LABELS: Record<(typeof ACTIVITY_LEVELS)[number], string> = {
  1.2: 'Sedentary',
  1.375: 'Light',
  1.55: 'Moderate',
  1.725: 'Very active',
  1.9: 'Athlete',
};

/** BMR + TDEE + activity multipliers. */
export const CaloriesPanel = () => (
  <YStack gap="$4">
    <PanelHeading
      title="How daily burn is estimated"
      subtitle="First resting metabolism (BMR), then activity (TDEE)."
    />

    <Card gap="$3">
      <XStack alignItems="center" justifyContent="space-between" gap="$2" flexWrap="wrap">
        <Body fontFamily="$heading" fontWeight="800" fontSize={16}>
          Resting burn (BMR)
        </Body>
        <Muted fontSize={12}>Default formula</Muted>
      </XStack>
      <Muted lineHeight={19}>
        Mifflin–St Jeor from weight, height, age, and sex. Used when body-fat % is not on file.
      </Muted>
      <FormulaBlock
        lines={['BMR = 10×weight + 6.25×height − 5×age + sexTerm', 'Male +5 · Female −161']}
      />
    </Card>

    <Card gap="$3">
      <XStack alignItems="center" justifyContent="space-between" gap="$2" flexWrap="wrap">
        <Body fontFamily="$heading" fontWeight="800" fontSize={16}>
          When body fat is known
        </Body>
        <Muted fontSize={12}>Alternate formula</Muted>
      </XStack>
      <Muted lineHeight={19}>
        Switches to Katch–McArdle using lean mass instead of the Mifflin equation.
      </Muted>
      <FormulaBlock
        lines={['Lean mass = weight × (1 − bodyFat% / 100)', 'BMR = 370 + 21.6 × lean mass']}
      />
    </Card>

    <Card gap="$3">
      <Body fontFamily="$heading" fontWeight="800" fontSize={16}>
        Daily burn (TDEE)
      </Body>
      <Muted lineHeight={19}>Multiply BMR by the client’s typical weekly activity.</Muted>
      <FormulaBlock lines={['TDEE = BMR × activity']} />
      <YStack gap="$2" marginTop="$1">
        {ACTIVITY_LEVELS.map((level) => (
          <XStack
            key={level}
            alignItems="center"
            justifyContent="space-between"
            backgroundColor="$elevatedBg"
            borderRadius={12}
            borderWidth={1}
            borderColor="$borderColor"
            paddingHorizontal="$3"
            paddingVertical="$2.5"
            minHeight={44}
          >
            <Body fontWeight="600">{ACTIVITY_LABELS[level]}</Body>
            <Text fontFamily="$heading" fontWeight="800" color="$primary">
              × {level}
            </Text>
          </XStack>
        ))}
      </YStack>
    </Card>
  </YStack>
);
