'use client';

import { Body, Card, Muted, YStack } from '@gymos/ui';
import { PanelHeading } from '../nutrition-criteria/panel-heading';

export const LunchPanel = () => (
  <YStack gap="$4">
    <PanelHeading
      title="Lunch"
      subtitle="Carries most of the day’s carbs and fat once dinner drops staples and oils."
    />
    <Card gap="$2">
      <Body fontWeight="700">Pattern</Body>
      <Muted>protein · staple · vegetable · fat</Muted>
      <Muted fontSize={13} marginTop="$2">
        Fat picks prefer olive oil when it is available in the pool.
      </Muted>
    </Card>
  </YStack>
);
