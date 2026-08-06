'use client';

import { startTransition, useState } from 'react';
import { Link } from 'solito/link';
import {
  Avatar,
  Badge,
  Card,
  ChevronRight,
  EmptyState,
  ErrorState,
  Input,
  ListRow,
  LoadingState,
  PageHeader,
  Plus,
  PrimaryButton,
  XStack,
} from '@gymos/ui';
import { useClients } from '../../api';
import { AppScreen } from '../shell/app-screen';

const REASON_TONE: Record<string, 'danger' | 'warning' | 'success' | 'neutral'> = {
  RED_FLAG: 'danger',
  CHECKIN_DUE: 'warning',
  OFF_TRACK: 'warning',
  NEW_CLIENT: 'success',
};

/** Roster — attention-first, searchable, one-handed. */
export const RosterScreen = () => {
  const [q, setQ] = useState('');
  const clients = useClients(q.trim() === '' ? undefined : q.trim());

  return (
    <AppScreen>
      <PageHeader
        title="Clients"
        subtitle="Search and jump into a hub"
        action={
          <Link href="/clients/new">
            <PrimaryButton icon={<Plus size={18} color="$primaryFg" />} aria-label="Add client">
              New
            </PrimaryButton>
          </Link>
        }
      />
      <Input
        value={q}
        onChangeText={(text) => {
          startTransition(() => setQ(text));
        }}
        placeholder="Search by name…"
        size="$4"
        minHeight={48}
        borderRadius={12}
        borderWidth={1.5}
        borderColor="$borderColor"
        backgroundColor="$elevatedBg"
        aria-label="Search clients"
        focusStyle={{ borderColor: '$focusRing', outlineWidth: 2, outlineColor: '$focusRing' }}
      />

      {clients.isPending ? (
        <LoadingState />
      ) : clients.isError ? (
        <ErrorState message="Could not load clients." retry={() => void clients.refetch()} />
      ) : clients.data.items.length === 0 ? (
        <EmptyState
          title={q ? 'No matches' : 'No clients yet'}
          hint={q ? 'Try another name.' : 'Add your first client to get started.'}
          action={
            q ? undefined : (
              <Link href="/clients/new">
                <PrimaryButton icon={<Plus size={18} />}>Add a client</PrimaryButton>
              </Link>
            )
          }
        />
      ) : (
        clients.data.items.map((client) => (
          <Link key={client.id} href={`/clients/${client.id}`}>
            <Card interactive>
              <ListRow
                leading={<Avatar name={client.name} />}
                title={client.name}
                subtitle={
                  client.latestWeightKg !== null ? `${client.latestWeightKg} kg` : 'No weigh-in yet'
                }
                trailing={
                  <XStack gap="$2" alignItems="center" flexWrap="wrap" justifyContent="flex-end">
                    {client.goalPreset ? <Badge tone="neutral" label={client.goalPreset} /> : null}
                    {client.attentionReasons.slice(0, 1).map((reason) => (
                      <Badge
                        key={reason.code}
                        tone={REASON_TONE[reason.code] ?? 'neutral'}
                        label={reason.code.replaceAll('_', ' ')}
                      />
                    ))}
                    <ChevronRight size={18} color="$textMuted" />
                  </XStack>
                }
              />
            </Card>
          </Link>
        ))
      )}
    </AppScreen>
  );
};
