'use client';

import { Link } from 'solito/link';
import {
  Badge,
  Body,
  Card,
  EmptyState,
  ErrorState,
  GhostButton,
  LoadingState,
  Muted,
  PageHeader,
  Row,
  YStack,
} from '@gymos/ui';
import { useMarkAllRead, useNotifications } from '../../api';
import { AppScreen } from '../shell/app-screen';

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

export const NotificationsScreen = () => {
  const notifications = useNotifications();
  const markAll = useMarkAllRead();

  if (notifications.isPending) {
    return (
      <AppScreen>
        <LoadingState />
      </AppScreen>
    );
  }
  if (notifications.isError) {
    return (
      <AppScreen>
        <ErrorState message="Could not load alerts." retry={() => void notifications.refetch()} />
      </AppScreen>
    );
  }

  const items = notifications.data.items;

  return (
    <AppScreen>
      <PageHeader
        title="Alerts"
        subtitle="Check-ins, safety flags, plan blocks"
        action={
          items.some((n) => n.readAt === null) ? (
            <GhostButton size="$3" minHeight={44} onPress={() => markAll.mutate()}>
              Mark all read
            </GhostButton>
          ) : null
        }
      />
      {items.length === 0 ? (
        <EmptyState title="No alerts" hint="Check-in reminders and safety flags land here." />
      ) : (
        items.map((n) => {
          const clientName = typeof n.payload.clientName === 'string' ? n.payload.clientName : null;
          const body = (
            <Card
              interactive={n.deepLink !== null}
              opacity={n.readAt === null ? 1 : 0.65}
              borderLeftWidth={4}
              borderLeftColor={n.priority === 'HIGH' ? '$danger' : '$primary'}
            >
              <Row>
                <Body fontWeight={n.readAt === null ? '800' : '500'} flex={1}>
                  {TYPE_LABEL[n.type] ?? n.type}
                </Body>
                {n.priority === 'HIGH' ? <Badge tone="danger" label="HIGH" /> : null}
              </Row>
              {clientName !== null ? <Muted>{clientName}</Muted> : null}
              <Muted fontSize={12}>{new Date(n.createdAt).toLocaleString()}</Muted>
            </Card>
          );
          return n.deepLink !== null ? (
            <Link key={n.id} href={n.deepLink}>
              {body}
            </Link>
          ) : (
            <YStack key={n.id}>{body}</YStack>
          );
        })
      )}
    </AppScreen>
  );
};
