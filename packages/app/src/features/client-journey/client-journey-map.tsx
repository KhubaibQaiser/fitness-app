'use client';

import type { WeightUnit } from '@gymos/core/units';
import { Activity, Card, Muted, SectionTitle, StaggerItem, Text, XStack, YStack } from '@gymos/ui';
import type { JourneyNode } from './client-journey';
import { ClientJourneyNode } from './client-journey-node';

export const ClientJourneyMap = ({
  nodes,
  weightUnit,
  title = 'Client journey',
  subtitle = 'Past check-ins, current progress and what comes next.',
}: {
  nodes: JourneyNode[];
  weightUnit: WeightUnit;
  title?: string;
  subtitle?: string;
}) => (
  <YStack gap="$4" width="100%" maxWidth={760} alignSelf="center">
    <XStack alignItems="flex-start" justifyContent="space-between" gap="$3">
      <YStack gap="$1" flex={1} minWidth={0}>
        <SectionTitle>Journey</SectionTitle>
        <Text fontFamily="$heading" fontSize={22} fontWeight="800" color="$color">
          {title}
        </Text>
        <Muted lineHeight={19}>{subtitle}</Muted>
      </YStack>
      <YStack
        width={44}
        height={44}
        borderRadius={22}
        alignItems="center"
        justifyContent="center"
        backgroundColor="$primaryMuted"
      >
        <Activity size={20} color="$primary" />
      </YStack>
    </XStack>

    {nodes.length > 0 ? (
      <YStack width="100%" gap={0}>
        {nodes.map((node, index) => (
          <StaggerItem key={node.id} index={index}>
            <ClientJourneyNode
              node={node}
              weightUnit={weightUnit}
              first={index === 0}
              last={index === nodes.length - 1}
            />
          </StaggerItem>
        ))}
      </YStack>
    ) : (
      <Card
        minHeight={150}
        alignItems="center"
        justifyContent="center"
        gap="$2"
        backgroundColor="$elevatedBg"
      >
        <Activity size={24} color="$textMuted" />
        <Text fontFamily="$heading" fontWeight="700" color="$color">
          Journey starts with a goal
        </Text>
        <Muted textAlign="center">Set a target weight and pace to preview the path ahead.</Muted>
      </Card>
    )}
  </YStack>
);
