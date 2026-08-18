'use client';

import type { ReactNode } from 'react';
import type { WeightUnit } from '@gymos/core/units';
import { Activity, EmptyState, Muted, SectionTitle, Text, XStack, YStack } from '@gymos/ui';
import type { JourneyNode } from './client-journey';
import { ClientJourneyNode, JOURNEY_SPINE_INSET, JOURNEY_SPINE_LEFT } from './client-journey-node';

export const ClientJourneyMap = ({
  nodes,
  weightUnit,
  chrome = 'embedded',
  title = 'Client journey',
  subtitle = 'Past check-ins, current progress and what comes next.',
  emptyAction,
}: {
  nodes: JourneyNode[];
  weightUnit: WeightUnit;
  chrome?: 'page' | 'embedded';
  title?: string;
  subtitle?: string;
  emptyAction?: ReactNode;
}) => (
  <YStack gap="$5" width="100%" maxWidth={760} alignSelf="center">
    {chrome === 'embedded' ? (
      <XStack alignItems="flex-start" justifyContent="space-between" gap="$3">
        <YStack gap="$1" flex={1} minWidth={0}>
          <SectionTitle>Journey</SectionTitle>
          <Text
            fontFamily="$heading"
            fontSize="$title"
            lineHeight="$title"
            fontWeight="700"
            color="$color"
          >
            {title}
          </Text>
          <Muted fontSize="$bodyDefault" lineHeight="$bodyDefault">
            {subtitle}
          </Muted>
        </YStack>
        <YStack
          width={44}
          height={44}
          borderRadius={999}
          alignItems="center"
          justifyContent="center"
          backgroundColor="$primaryMuted"
        >
          <Activity size={20} color="$primary" />
        </YStack>
      </XStack>
    ) : (
      <Muted fontSize="$bodyDefault" lineHeight="$bodyDefault">
        {subtitle}
      </Muted>
    )}

    {nodes.length > 0 ? (
      <YStack width="100%" position="relative">
        <YStack
          position="absolute"
          top={JOURNEY_SPINE_INSET}
          bottom={JOURNEY_SPINE_INSET}
          left={JOURNEY_SPINE_LEFT}
          width={2}
          backgroundColor="$track"
          zIndex={0}
        />
        {nodes.map((node, index) => (
          <ClientJourneyNode
            key={node.id}
            node={node}
            weightUnit={weightUnit}
            last={index === nodes.length - 1}
            index={index}
          />
        ))}
      </YStack>
    ) : (
      <EmptyState
        title="Journey starts with a goal"
        hint="Set a target weight and pace to preview the path ahead."
        icon={
          <YStack
            width={44}
            height={44}
            borderRadius={999}
            alignItems="center"
            justifyContent="center"
            backgroundColor="$elevatedBg"
          >
            <Activity size={20} color="$textMuted" />
          </YStack>
        }
        action={emptyAction}
      />
    )}
  </YStack>
);
