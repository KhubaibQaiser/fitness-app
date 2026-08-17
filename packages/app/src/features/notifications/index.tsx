'use client';

import { Link } from 'solito/link';
import type { Notification } from '@gymos/contracts';
import {
  Badge,
  Bell,
  Card,
  EmptyState,
  ErrorState,
  GhostButton,
  NotificationRow,
  PageHeader,
  ShieldAlert,
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
        title="Notifications"
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
        <Card padding="$2" gap={0}>
          {items.map((n) => {
            const clientName =
              typeof n.payload.clientName === 'string' ? n.payload.clientName : null;
            const high = n.priority === 'HIGH';
            const unread = n.readAt === null;
            const body = (
              <NotificationRow
                title={TYPE_LABEL[n.type] ?? n.type}
                time={new Date(n.createdAt).toLocaleString()}
                {...(clientName !== null ? { subtitle: clientName } : {})}
                unread={unread}
                priority={high ? 'high' : 'normal'}
                icon={
                  high ? (
                    <ShieldAlert size={14} color="$danger" />
                  ) : (
                    <Bell size={14} color="$coachAccentText" />
                  )
                }
                {...(high ? { trailing: <Badge tone="alert" label="HIGH" /> } : {})}
              />
            );
            return n.deepLink !== null ? (
              <Link key={n.id} href={n.deepLink}>
                {body}
              </Link>
            ) : (
              <YStack key={n.id}>{body}</YStack>
            );
          })}
        </Card>
      )}
    </AppScreen>
  );
};
