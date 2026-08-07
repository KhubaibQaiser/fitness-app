'use client';

import { Link } from 'solito/link';
import {
  Avatar,
  Badge,
  Bell,
  Card,
  Check,
  ChevronRight,
  EmptyState,
  ErrorState,
  LoadingState,
  Muted,
  PageHeader,
  Text,
  UserPlus,
  Users,
  Wrench,
  XStack,
  YStack,
} from '@gymos/ui';
import { useClients, useDueCheckIns, useMe, useNotifications } from '../../api';
import { AppScreen } from '../shell/app-screen';
import { ScreenBody } from '../shell/screen-body';
import { HomeQuickActions } from './home-quick-actions';
import { HomeRecentAlerts } from './home-recent-alerts';
import { HomeStatStrip } from './home-stat-strip';

/** Coach home: kit richer dashboard — stats, queues, quick actions, alerts. */
export const HomeScreen = () => {
  const me = useMe();
  const due = useDueCheckIns();
  const clients = useClients();
  const notifications = useNotifications();

  if (due.isPending || clients.isPending) {
    return (
      <AppScreen>
        <LoadingState />
      </AppScreen>
    );
  }
  if (due.isError) {
    return (
      <AppScreen>
        <ErrorState message="Could not load your day." retry={() => void due.refetch()} />
      </AppScreen>
    );
  }

  const dueItems = due.data.items;
  const allClients = clients.data?.items ?? [];
  const atRisk = allClients.filter((c) =>
    c.attentionReasons.some((r) => r.code === 'OFF_TRACK' || r.code === 'RED_FLAG'),
  );
  const onTrack = allClients.filter(
    (c) => !c.attentionReasons.some((r) => r.code === 'OFF_TRACK' || r.code === 'RED_FLAG'),
  ).length;
  const highAlerts = (notifications.data?.items ?? []).filter(
    (n) => n.priority === 'HIGH' && n.readAt === null,
  ).length;
  const firstName = me.data?.name.split(' ')[0] ?? 'Coach';

  const now = new Date();
  const greeting =
    now.getHours() < 12 ? 'Good morning' : now.getHours() < 17 ? 'Good afternoon' : 'Good evening';
  const dateStr = now.toLocaleDateString('en-PK', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });

  return (
    <AppScreen gap="$0" paddingTop={0} paddingHorizontal={0}>
      <PageHeader
        strip
        eyebrow={dateStr}
        title={`${greeting}, ${firstName}`}
        subtitle={
          atRisk.length > 0
            ? `${atRisk.length} client${atRisk.length > 1 ? 's' : ''} need your attention today.`
            : 'All clients are on track today.'
        }
      />

      <HomeStatStrip
        totalClients={allClients.length}
        needAttention={atRisk.length}
        onTrack={onTrack}
        highAlerts={highAlerts}
      />

      <ScreenBody gap="$5">
        <YStack
          gap="$5"
          $md={{
            flexDirection: 'row',
            alignItems: 'flex-start',
            gap: '$6',
          }}
        >
          <YStack flex={1} gap="$5" minWidth={0}>
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
                  Due today
                </Text>
                {dueItems.length > 0 ? (
                  <Badge tone="warning" label={`${dueItems.length} pending`} />
                ) : null}
              </XStack>
              {dueItems.length === 0 ? (
                <EmptyState
                  title="All caught up"
                  hint="Nothing due today."
                  icon={
                    <YStack
                      width={40}
                      height={40}
                      borderRadius={999}
                      backgroundColor="$successMuted"
                      alignItems="center"
                      justifyContent="center"
                    >
                      <Check size={18} color="$success" />
                    </YStack>
                  }
                />
              ) : (
                dueItems.map((item) => (
                  <Link key={item.id} href={`/clients/${item.clientId}/check-in`}>
                    <Card interactive padding="$3.5">
                      <XStack alignItems="center" gap="$3">
                        <Avatar name={item.clientName} size={40} />
                        <YStack flex={1} minWidth={0} gap={2}>
                          <Text
                            fontFamily="$heading"
                            fontWeight="600"
                            fontSize={13.5}
                            color="$color"
                            numberOfLines={1}
                          >
                            {item.clientName}
                          </Text>
                          <Muted fontSize={12}>Weekly check-in · {item.scheduledFor}</Muted>
                        </YStack>
                        {item.overdueDays > 0 ? (
                          <Badge tone="danger" label={`${item.overdueDays}d overdue`} />
                        ) : (
                          <Badge tone="warning" label="Due today" />
                        )}
                        <ChevronRight size={14} color="$textMuted" />
                      </XStack>
                    </Card>
                  </Link>
                ))
              )}
            </YStack>

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
                  Needs attention
                </Text>
                <Link href="/clients">
                  <Text fontSize={12} color="$primary" fontWeight="500">
                    All clients →
                  </Text>
                </Link>
              </XStack>
              {atRisk.length === 0 ? (
                <Card padding="$4">
                  <Muted textAlign="center" fontSize={13}>
                    No clients need attention.
                  </Muted>
                </Card>
              ) : (
                atRisk.map((client) => (
                  <Link key={client.id} href={`/clients/${client.id}`}>
                    <Card interactive padding="$3.5">
                      <XStack alignItems="flex-start" gap="$3">
                        <Avatar name={client.name} size={40} />
                        <YStack flex={1} minWidth={0} gap="$1.5">
                          <Text
                            fontFamily="$heading"
                            fontWeight="600"
                            fontSize={13.5}
                            color="$color"
                            numberOfLines={1}
                          >
                            {client.name}
                          </Text>
                          <XStack gap="$1" flexWrap="wrap">
                            {client.attentionReasons.map((r) => (
                              <Badge
                                key={r.code}
                                tone={r.code === 'RED_FLAG' ? 'danger' : 'warning'}
                                label={r.code.replaceAll('_', ' ')}
                              />
                            ))}
                          </XStack>
                        </YStack>
                        <ChevronRight size={14} color="$textMuted" />
                      </XStack>
                    </Card>
                  </Link>
                ))
              )}
            </YStack>
          </YStack>

          <YStack width="100%" gap="$5" $md={{ width: 340, flexShrink: 0 }}>
            <HomeQuickActions
              clientCount={allClients.length}
              highAlerts={highAlerts}
              actions={[
                {
                  label: 'New client intake',
                  desc: 'Start 8-step onboarding',
                  href: '/clients/new',
                  primary: true,
                  icon: <UserPlus size={15} color="$primaryFg" />,
                },
                {
                  label: 'View all clients',
                  desc: `${allClients.length} active in caseload`,
                  href: '/clients',
                  icon: <Users size={15} color="$textMuted" />,
                },
                {
                  label: 'Nutrition tools',
                  desc: 'TDEE, BMI, macro calc',
                  href: '/tools',
                  icon: <Wrench size={15} color="$textMuted" />,
                },
                {
                  label: 'View alerts',
                  desc: `${highAlerts} high priority`,
                  href: '/notifications',
                  icon: <Bell size={15} color="$textMuted" />,
                },
              ]}
            />
            <HomeRecentAlerts />
          </YStack>
        </YStack>
      </ScreenBody>
    </AppScreen>
  );
};
