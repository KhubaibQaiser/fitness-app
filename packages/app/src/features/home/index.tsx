'use client';

import { Link } from 'solito/link';
import {
  Avatar,
  Badge,
  Card,
  Check,
  ChevronRight,
  EmptyState,
  ErrorState,
  FadeIn,
  Muted,
  PageHeader,
  ScrollView,
  StaggerItem,
  StatPill,
  Text,
  WeaveLine,
  XStack,
  YStack,
} from '@gymos/ui';
import { useClients, useDueCheckIns, useMe, useNotifications } from '../../api';
import { AppScreen } from '../shell/app-screen';
import { ScreenBody } from '../shell/screen-body';
import { HomeSkeleton } from './home-skeleton';

/** Coach home: due today, needs attention. */
export const HomeScreen = () => {
  const me = useMe();
  const due = useDueCheckIns();
  const clients = useClients();
  const notifications = useNotifications();

  const now = new Date();
  const greeting =
    now.getHours() < 12 ? 'Good morning' : now.getHours() < 17 ? 'Good afternoon' : 'Good evening';
  const dateStr = now.toLocaleDateString('en-PK', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });
  const firstName = me.data?.name.split(' ')[0];

  if (due.isPending || clients.isPending) {
    return (
      <AppScreen gap="$0" paddingTop={0} paddingHorizontal={0}>
        <HomeSkeleton
          dateStr={dateStr}
          greeting={greeting}
          {...(firstName !== undefined ? { firstName } : {})}
        />
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
  const displayName = firstName ?? 'Coach';

  return (
    <AppScreen gap="$0" paddingTop={0} paddingHorizontal={0}>
      <PageHeader
        strip
        eyebrow={dateStr}
        title={`${greeting}, ${displayName}`}
        subtitle={
          atRisk.length > 0
            ? `${atRisk.length} client${atRisk.length > 1 ? 's' : ''} need your attention today.`
            : 'All clients are on track today.'
        }
      />

      <ScreenBody gap="$4">
        <WeaveLine id="home-idle" mode="idle" height={28} />
        <XStack flexWrap="wrap" gap="$3" width="100%">
          <YStack flexBasis="47%" flexGrow={1} minWidth={140} $md={{ flexBasis: 0, flex: 1 }}>
            <StatPill label="Needs attention" value={atRisk.length} />
          </YStack>
          <YStack flexBasis="47%" flexGrow={1} minWidth={140} $md={{ flexBasis: 0, flex: 1 }}>
            <StatPill label="Total clients" value={allClients.length} />
          </YStack>
          <YStack flexBasis="47%" flexGrow={1} minWidth={140} $md={{ flexBasis: 0, flex: 1 }}>
            <StatPill label="On track" value={onTrack} />
          </YStack>
          <YStack flexBasis="47%" flexGrow={1} minWidth={140} $md={{ flexBasis: 0, flex: 1 }}>
            <StatPill label="High alerts" value={highAlerts} />
          </YStack>
        </XStack>

        <YStack gap="$5">
          <YStack gap="$3">
            <XStack alignItems="center" justifyContent="space-between">
              <Text fontFamily="$heading" fontSize={14} fontWeight="600" color="$color">
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
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <XStack gap="$3">
                  {atRisk.map((client, i) => (
                    <FadeIn key={client.id} delay={i * 35}>
                      <Link href={`/clients/${client.id}`}>
                        <Card interactive padding="$4" minWidth={240}>
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
                    </FadeIn>
                  ))}
                </XStack>
              </ScrollView>
            )}
          </YStack>

          <YStack gap="$3">
            <XStack alignItems="center" justifyContent="space-between">
              <Text fontFamily="$heading" fontSize={14} fontWeight="600" color="$color">
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
              dueItems.map((item, i) => (
                <StaggerItem key={item.id} index={i}>
                  <Link href={`/clients/${item.clientId}/check-in`}>
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
                </StaggerItem>
              ))
            )}
          </YStack>
        </YStack>
      </ScreenBody>
    </AppScreen>
  );
};
