'use client';

import { Body, Card, Muted, YStack } from '@gymos/ui';
import { PanelHeading } from '../nutrition-criteria/panel-heading';

export const SnacksPanel = () => (
  <YStack gap="$4">
    <PanelHeading
      title="Snacks"
      subtitle="Only when the coach chooses +1 or +2 snacks at generate time."
    />
    <Card gap="$2">
      <Body fontWeight="700">4 meals</Body>
      <Muted>One snack: fruit + fat</Muted>
    </Card>
    <Card gap="$2">
      <Body fontWeight="700">5 meals</Body>
      <Muted>Morning snack: fruit · Afternoon snack: fat</Muted>
    </Card>
  </YStack>
);
