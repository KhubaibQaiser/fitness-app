'use client';

import { Link } from 'solito/link';
import {
  Badge,
  Body,
  Card,
  EmptyState,
  ErrorState,
  LoadingState,
  Muted,
  Row,
  Screen,
  SectionTitle,
  Title,
} from '@gymos/ui';
import { useClients, useDueCheckIns, useMe } from '../../api';

/** Coach home: what needs attention today, nothing else. */
export const HomeScreen = () => {
  const me = useMe();
  const due = useDueCheckIns();
  const clients = useClients();

  if (due.isPending || clients.isPending) return <LoadingState />;
  if (due.isError) {
    return (
      <Screen>
        <ErrorState message="Could not load your day." retry={() => void due.refetch()} />
      </Screen>
    );
  }

  const dueItems = due.data.items;
  const atRisk = (clients.data?.items ?? []).filter((c) =>
    c.attentionReasons.some((r) => r.code === 'OFF_TRACK' || r.code === 'RED_FLAG'),
  );

  return (
    <Screen>
      <Title>Salaam, {me.data?.name.split(' ')[0] ?? 'Coach'} 👋</Title>

      <SectionTitle>Check-ins due</SectionTitle>
      {dueItems.length === 0 ? (
        <EmptyState title="All caught up" hint="No check-ins due today." />
      ) : (
        dueItems.map((item) => (
          <Link key={item.id} href={`/clients/${item.clientId}/check-in`}>
            <Card pressStyle={{ opacity: 0.9 }}>
              <Row>
                <Body fontWeight="700">{item.clientName}</Body>
                {item.overdueDays > 0 ? (
                  <Badge tone="danger" label={`${item.overdueDays}d overdue`} />
                ) : (
                  <Badge tone="success" label="Due today" />
                )}
              </Row>
              <Muted>Weekly check-in · scheduled {item.scheduledFor}</Muted>
            </Card>
          </Link>
        ))
      )}

      <SectionTitle>Needs attention</SectionTitle>
      {atRisk.length === 0 ? (
        <Muted>No off-track or red-flag clients right now.</Muted>
      ) : (
        atRisk.map((client) => (
          <Link key={client.id} href={`/clients/${client.id}`}>
            <Card pressStyle={{ opacity: 0.9 }}>
              <Row>
                <Body fontWeight="700">{client.name}</Body>
                {client.attentionReasons[0] ? (
                  <Badge
                    tone={client.attentionReasons[0].code === 'RED_FLAG' ? 'danger' : 'warning'}
                    label={client.attentionReasons[0].code.replaceAll('_', ' ')}
                  />
                ) : null}
              </Row>
            </Card>
          </Link>
        ))
      )}
    </Screen>
  );
};
