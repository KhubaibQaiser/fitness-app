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
  Row,
  Screen,
  Title,
} from '@gymos/ui';
import { useMarkAllRead, useNotifications } from '../../api';

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

  if (notifications.isPending) return <LoadingState />;
  if (notifications.isError) {
    return (
      <Screen>
        <ErrorState message="Could not load alerts." retry={() => void notifications.refetch()} />
      </Screen>
    );
  }

  const items = notifications.data.items;

  return (
    <Screen>
      <Row>
        <Title>Alerts</Title>
        {items.some((n) => n.readAt === null) ? (
          <GhostButton size="$3" onPress={() => markAll.mutate()}>
            Mark all read
          </GhostButton>
        ) : null}
      </Row>
      {items.length === 0 ? (
        <EmptyState title="No alerts" hint="Check-in reminders and safety flags land here." />
      ) : (
        items.map((n) => {
          const clientName = typeof n.payload.clientName === 'string' ? n.payload.clientName : null;
          const body = (
            <Card
              key={n.id}
              opacity={n.readAt === null ? 1 : 0.6}
              borderLeftWidth={4}
              borderLeftColor={n.priority === 'HIGH' ? '$danger' : '$primary'}
            >
              <Row>
                <Body fontWeight={n.readAt === null ? '800' : '500'}>
                  {TYPE_LABEL[n.type] ?? n.type}
                </Body>
                {n.priority === 'HIGH' ? <Badge tone="danger" label="HIGH" /> : null}
              </Row>
              {clientName !== null ? <Muted>{clientName}</Muted> : null}
              <Muted fontSize={11}>{new Date(n.createdAt).toLocaleString()}</Muted>
            </Card>
          );
          return n.deepLink !== null ? (
            <Link key={n.id} href={n.deepLink}>
              {body}
            </Link>
          ) : (
            body
          );
        })
      )}
    </Screen>
  );
};
