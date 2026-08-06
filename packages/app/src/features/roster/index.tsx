'use client';

import { useState } from 'react';
import { Link } from 'solito/link';
import {
  Badge,
  Body,
  Card,
  EmptyState,
  ErrorState,
  Input,
  LoadingState,
  Muted,
  PrimaryButton,
  Row,
  Screen,
  Title,
  XStack,
} from '@gymos/ui';
import { useClients } from '../../api';

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
    <Screen>
      <Row>
        <Title>Clients</Title>
        <Link href="/clients/new">
          <PrimaryButton size="$3">+ New</PrimaryButton>
        </Link>
      </Row>
      <Input
        value={q}
        onChangeText={setQ}
        placeholder="Search by name…"
        size="$4"
        aria-label="Search clients"
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
                <PrimaryButton>Add a client</PrimaryButton>
              </Link>
            )
          }
        />
      ) : (
        clients.data.items.map((client) => (
          <Link key={client.id} href={`/clients/${client.id}`}>
            <Card pressStyle={{ opacity: 0.9 }}>
              <Row>
                <Body fontWeight="700" fontSize={16}>
                  {client.name}
                </Body>
                <Muted>
                  {client.latestWeightKg !== null ? `${client.latestWeightKg} kg` : '—'}
                </Muted>
              </Row>
              <XStack gap="$2" flexWrap="wrap">
                {client.goalPreset ? <Badge tone="neutral" label={client.goalPreset} /> : null}
                {client.attentionReasons.slice(0, 2).map((reason) => (
                  <Badge
                    key={reason.code}
                    tone={REASON_TONE[reason.code] ?? 'neutral'}
                    label={reason.code.replaceAll('_', ' ')}
                  />
                ))}
              </XStack>
            </Card>
          </Link>
        ))
      )}
    </Screen>
  );
};
