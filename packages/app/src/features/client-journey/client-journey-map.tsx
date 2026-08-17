'use client';

import type { ReactNode } from 'react';
import type { WeightUnit } from '@gymos/core/units';
import {
  Activity,
  EmptyState,
  Muted,
  SectionTitle,
  StaggerItem,
  Text,
  XStack,
  YStack,
} from '@gymos/ui';
import type { JourneyNode } from './client-journey';
import { ClientJourneyNode } from './client-journey-node';

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
      <YStack width="100%">
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
