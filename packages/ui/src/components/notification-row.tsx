'use client';

import type { ReactNode } from 'react';
import { Text, XStack, YStack } from 'tamagui';

type NotificationRowProps = {
  title: string;
  time: string;
  subtitle?: string;
  unread?: boolean;
  priority?: 'high' | 'normal';
  icon?: ReactNode;
  trailing?: ReactNode;
};

export const NotificationRow = ({
  title,
  time,
  subtitle,
  unread = false,
  priority = 'normal',
  icon,
  trailing,
}: NotificationRowProps) => {
  const high = priority === 'high';

  return (
    <XStack
      alignItems="center"
      gap={12}
      paddingHorizontal="$2"
      paddingVertical="$2.5"
      borderRadius={12}
      backgroundColor={high ? '$alertWash' : unread ? '$surfaceHover' : 'transparent'}
      // High priority also carries a rail and a wash, so it never reads by hue alone.
      borderLeftWidth={high ? 3 : 0}
      borderLeftColor="$danger"
      minHeight={44}
      accessibilityLabel={`${high ? 'High priority. ' : ''}${unread ? 'Unread. ' : ''}${title}. ${time}`}
    >
      <YStack
        width={32}
        height={32}
        borderRadius={999}
        alignItems="center"
        justifyContent="center"
        flexShrink={0}
        backgroundColor={high ? '$dangerMuted' : '$coachAccentWash'}
      >
        {icon}
      </YStack>
      <YStack flex={1} minWidth={0} gap={2}>
        <Text
          fontFamily="$heading"
          fontSize={14}
          lineHeight={20}
          fontWeight={unread ? '600' : '500'}
          color="$color"
          numberOfLines={1}
        >
          {title}
        </Text>
        {subtitle ? (
          <Text
            fontFamily="$body"
            fontSize={12}
            lineHeight={16}
            color="$textMuted"
            numberOfLines={1}
          >
            {subtitle}
          </Text>
        ) : null}
        <Text fontFamily="$body" fontSize={12} lineHeight={16} color="$textFaint" numberOfLines={1}>
          {time}
        </Text>
      </YStack>
      {trailing}
      {unread ? (
        <YStack
          width={8}
          height={8}
          borderRadius={999}
          backgroundColor="$primary"
          flexShrink={0}
          accessibilityLabel="Unread"
        />
      ) : null}
    </XStack>
  );
};
