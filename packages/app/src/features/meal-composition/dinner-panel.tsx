'use client';

import { Body, Card, Muted, YStack } from '@gymos/ui';
import { PanelHeading } from '../nutrition-criteria/panel-heading';

export const DinnerPanel = () => (
  <YStack gap="$4">
    <PanelHeading
      title="Dinner"
      subtitle="Protein salad style. No staple carbs and no added fat in the template."
    />
    <Card gap="$2">
      <Body fontWeight="700">Pattern</Body>
      <Muted>protein · vegetable</Muted>
      <Muted fontSize={13} marginTop="$2">
        Examples: chicken with kachumber, fish with palak, paneer with salad.
      </Muted>
    </Card>
  </YStack>
);
