'use client';

import { Link } from 'solito/link';
import type { Notification } from '@gymos/contracts';
import {
  Badge,
  Body,
  Card,
  EmptyState,
  ErrorState,
  GhostButton,
  Muted,
  PageHeader,
  Row,
  YStack,
} from '@gymos/ui';
import { useMarkAllRead, useNotifications } from '../../api';
import { AppScreen } from '../shell/app-screen';
import { NotificationsSkeleton } from './notifications-skeleton';

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

const byPriorityThenDate = (a: Notification, b: Notification): number => {
  if (a.priority !== b.priority) {
    return a.priority === 'HIGH' ? -1 : 1;
  }
  return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
};

export const NotificationsScreen = () => {
  const notifications = useNotifications();
  const markAll = useMarkAllRead();

  if (notifications.isPending) {
    return (
      <AppScreen>
        <NotificationsSkeleton />
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

  const items = [...notifications.data.items].sort(byPriorityThenDate);

  return (
    <AppScreen>
      <PageHeader
        title="Alerts"
        subtitle="Check-ins, safety flags, plan blocks"
        action={
          items.some((n) => n.readAt === null) ? (
            <GhostButton onPress={() => markAll.mutate()}>Mark all read</GhostButton>
          ) : (
            <YStack width={1} height={48} />
          )
        }
      />
      {items.length === 0 ? (
        <EmptyState title="No alerts" hint="Check-in reminders and safety flags land here." />
      ) : (
        items.map((n) => {
          const clientName = typeof n.payload.clientName === 'string' ? n.payload.clientName : null;
          const high = n.priority === 'HIGH';
          const body = (
            <Card
              interactive={n.deepLink !== null}
              opacity={n.readAt === null ? 1 : 0.65}
              tone={high ? 'danger' : 'default'}
            >
              <Row>
                <Body fontWeight={n.readAt === null ? '800' : '500'} flex={1}>
                  {TYPE_LABEL[n.type] ?? n.type}
                </Body>
                <Badge tone={high ? 'danger' : 'neutral'} label={high ? 'HIGH' : 'NORMAL'} />
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
