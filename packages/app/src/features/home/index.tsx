'use client';

import { Link } from 'solito/link';
import {
  Avatar,
  Badge,
  Card,
  ChevronRight,
  EmptyState,
  ErrorState,
  ListRow,
  LoadingState,
  PageHeader,
} from '@gymos/ui';
import { useClients, useDueCheckIns, useMe } from '../../api';
import { AppScreen } from '../shell/app-screen';

/** Coach home: what needs attention today, nothing else. */
export const HomeScreen = () => {
  const me = useMe();
  const due = useDueCheckIns();
  const clients = useClients();

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
  const atRisk = (clients.data?.items ?? []).filter((c) =>
    c.attentionReasons.some((r) => r.code === 'OFF_TRACK' || r.code === 'RED_FLAG'),
  );
  const firstName = me.data?.name.split(' ')[0] ?? 'Coach';

  return (
    <AppScreen>
      <PageHeader title={`Hello, ${firstName}`} subtitle="Your coaching day at a glance" />

      <Card gap="$3" padding="$4">
        <ListRow
          title="Check-ins due"
          subtitle={
            dueItems.length === 0
              ? 'All caught up'
              : `${dueItems.length} client${dueItems.length === 1 ? '' : 's'} waiting`
          }
          trailing={
            dueItems.some((i) => i.overdueDays > 0) ? (
              <Badge tone="danger" label="Overdue" />
            ) : dueItems.length > 0 ? (
              <Badge tone="warning" label="Due" />
            ) : (
              <Badge tone="success" label="Clear" />
            )
          }
        />
      </Card>

      {dueItems.length === 0 ? (
        <EmptyState title="All caught up" hint="No check-ins due today. Nice work." />
      ) : (
        dueItems.map((item) => (
          <Link key={item.id} href={`/clients/${item.clientId}/check-in`}>
            <Card interactive>
              <ListRow
                leading={<Avatar name={item.clientName} />}
                title={item.clientName}
                subtitle={`Weekly check-in · scheduled ${item.scheduledFor}`}
                trailing={
                  item.overdueDays > 0 ? (
                    <Badge tone="danger" label={`${item.overdueDays}d overdue`} />
                  ) : (
                    <Badge tone="success" label="Due today" />
                  )
                }
              />
            </Card>
          </Link>
        ))
      )}

      <PageHeader title="Needs attention" subtitle="Off-track or red-flag clients" />
      {atRisk.length === 0 ? (
        <EmptyState
          title="No flags right now"
          hint="Off-track and red-flag clients will land here."
        />
      ) : (
        atRisk.map((client) => (
          <Link key={client.id} href={`/clients/${client.id}`}>
            <Card interactive>
              <ListRow
                leading={<Avatar name={client.name} />}
                title={client.name}
                subtitle={client.attentionReasons[0]?.code.replaceAll('_', ' ') ?? null}
                trailing={
                  <>
                    {client.attentionReasons[0] ? (
                      <Badge
                        tone={client.attentionReasons[0].code === 'RED_FLAG' ? 'danger' : 'warning'}
                        label={client.attentionReasons[0].code.replaceAll('_', ' ')}
                      />
                    ) : null}
                    <ChevronRight size={18} color="$textMuted" />
                  </>
                }
              />
            </Card>
          </Link>
        ))
      )}
    </AppScreen>
  );
};
