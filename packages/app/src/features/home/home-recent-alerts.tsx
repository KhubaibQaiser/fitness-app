'use client';

import { Link } from 'solito/link';
import { LoadingState, Muted, Text, XStack, YStack } from '@gymos/ui';
import { useNotifications } from '../../api';

const TYPE_LABEL: Record<string, string> = {
  CHECKIN_DUE: 'Check-in due',
  CHECKIN_OVERDUE: 'Check-in overdue',
  OFF_TRACK: 'Off track',
  RED_FLAG: 'Red flag',
  PLAN_NEEDS_REVIEW: 'Plan blocked',
  PLAN_PUBLISHED: 'Plan published',
  MILESTONE: 'Milestone',
  SYSTEM: 'System',
};

export const HomeRecentAlerts = () => {
  const notifications = useNotifications();

  return (
    <YStack gap="$3">
      <XStack alignItems="center" justifyContent="space-between">
        <Text
          fontFamily="$heading"
          fontSize={13}
          fontWeight="600"
          textTransform="uppercase"
          letterSpacing={0.8}
          color="$color"
        >
          Recent alerts
        </Text>
        <Link href="/notifications">
          <Text fontSize={12} color="$primary" fontWeight="500">
            See all →
          </Text>
        </Link>
      </XStack>
      {notifications.isPending ? (
        <LoadingState label="Loading alerts…" />
      ) : (
        <YStack gap="$1.5">
          {(notifications.data?.items ?? []).slice(0, 3).map((n) => {
            const clientName =
              typeof n.payload.clientName === 'string' ? n.payload.clientName : null;
            const label = TYPE_LABEL[n.type] ?? n.type;
            const text = clientName ? `${label} · ${clientName}` : label;
            const body = (
              <XStack
                alignItems="flex-start"
                gap="$2.5"
                paddingHorizontal="$3"
                paddingVertical="$2.5"
                borderRadius="$radiusControl"
                hoverStyle={{ backgroundColor: '$elevatedBg' }}
                pressStyle={{ opacity: 0.9 }}
              >
                <YStack
                  width={6}
                  height={6}
                  borderRadius={999}
                  marginTop={5}
                  backgroundColor={
                    n.priority === 'HIGH'
                      ? '$danger'
                      : n.readAt === null
                        ? '$warning'
                        : '$borderColor'
                  }
                />
                <YStack flex={1} minWidth={0} gap={2}>
                  <Text fontSize={12.5} color="$color" lineHeight={17}>
                    {text}
                  </Text>
                  <Muted fontSize={11}>{new Date(n.createdAt).toLocaleString()}</Muted>
                </YStack>
              </XStack>
            );
            return n.deepLink !== null ? (
              <Link key={n.id} href={n.deepLink}>
                {body}
              </Link>
            ) : (
              <YStack key={n.id}>{body}</YStack>
            );
          })}
          {(notifications.data?.items ?? []).length === 0 ? (
            <Muted fontSize={12}>No recent alerts.</Muted>
          ) : null}
        </YStack>
      )}
    </YStack>
  );
};
