'use client';

import type { ReactNode } from 'react';
import { Link } from 'solito/link';
import { ChevronRight, Text, XStack, YStack } from '@gymos/ui';

type QuickAction = {
  label: string;
  desc: string;
  href: string;
  icon: ReactNode;
  primary?: boolean;
};

export const HomeQuickActions = ({
  actions,
}: {
  clientCount: number;
  highAlerts: number;
  actions: QuickAction[];
}) => (
  <YStack gap="$3">
    <Text
      fontFamily="$heading"
      fontSize={13}
      fontWeight="600"
      textTransform="uppercase"
      letterSpacing={0.8}
      color="$color"
    >
      Quick actions
    </Text>
    <YStack borderRadius="$radiusCard" backgroundColor="$cardBg" overflow="hidden">
      {actions.map((item, i) => (
        <Link key={item.label} href={item.href}>
          <XStack
            alignItems="center"
            gap="$3"
            paddingHorizontal="$4"
            paddingVertical="$3"
            borderTopWidth={i > 0 ? 1 : 0}
            borderTopColor="$elevatedBg"
            hoverStyle={{ backgroundColor: '$elevatedBg' }}
            pressStyle={{ opacity: 0.9, scale: 0.98 }}
          >
            <YStack
              width={32}
              height={32}
              borderRadius="$radiusControl"
              backgroundColor={item.primary ? '$primary' : '$elevatedBg'}
              alignItems="center"
              justifyContent="center"
            >
              {item.icon}
            </YStack>
            <YStack flex={1} minWidth={0} gap={1}>
              <Text fontFamily="$heading" fontWeight="500" fontSize={13} color="$color">
                {item.label}
              </Text>
              <Text fontSize={11} color="$textMuted">
                {item.desc}
              </Text>
            </YStack>
            <ChevronRight size={14} color="$textMuted" />
          </XStack>
        </Link>
      ))}
    </YStack>
  </YStack>
);
