'use client';

import { startTransition, useMemo, useState } from 'react';
import { useDebouncedValue } from '@gymos/platform';
import {
  Card,
  EmptyState,
  ErrorState,
  Input,
  PageHeader,
  Plus,
  PrimaryButton,
  Skeleton,
  Text,
  XStack,
  YStack,
} from '@gymos/ui';
import { useClients } from '../../api';
import { needsAttention } from '../../lib/attention';
import { Link } from '../../lib/link';
import { AppScreen } from '../shell/app-screen';
import { RosterRow } from './roster-row';
import { RosterListSkeleton } from './roster-skeleton';

type FilterId = 'all' | 'attention' | 'on-track' | 'new';

const isNew = (reasons: { code: string }[]) => reasons.some((r) => r.code === 'NEW_CLIENT');

const FILTERS: { id: FilterId; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'attention', label: 'Attention' },
  { id: 'on-track', label: 'On track' },
  { id: 'new', label: 'New' },
];

/** Kit desktop column template: 1fr · 120 · 100 · 160 · 100 (+ gap 16). */
const COL = {
  weight: 120,
  goal: 100,
  status: 160,
  progress: 100,
} as const;

const SEARCH_DEBOUNCE_MS = 300;

/** Roster — kit search/filter row + fixed-column desktop list. */
export const RosterScreen = () => {
  const [q, setQ] = useState('');
  const debouncedQ = useDebouncedValue(q.trim(), SEARCH_DEBOUNCE_MS);
  const [filter, setFilter] = useState<FilterId>('all');
  const clients = useClients(debouncedQ === '' ? undefined : debouncedQ);

  const items = clients.data?.items ?? [];
  const counts = useMemo(() => {
    const attention = items.filter((c) => needsAttention(c.attentionReasons)).length;
    const neu = items.filter((c) => isNew(c.attentionReasons)).length;
    const onTrack = items.filter(
      (c) => !needsAttention(c.attentionReasons) && !isNew(c.attentionReasons),
    ).length;
    return { all: items.length, attention, 'on-track': onTrack, new: neu } as const;
  }, [items]);

  const filtered = useMemo(() => {
    let list = items;
    if (filter === 'attention') list = list.filter((c) => needsAttention(c.attentionReasons));
    else if (filter === 'new') list = list.filter((c) => isNew(c.attentionReasons));
    else if (filter === 'on-track')
      list = list.filter((c) => !needsAttention(c.attentionReasons) && !isNew(c.attentionReasons));
    return [...list].sort((a, b) => {
      const rank = (c: (typeof list)[0]) =>
        needsAttention(c.attentionReasons) ? 0 : isNew(c.attentionReasons) ? 1 : 2;
      return rank(a) - rank(b) || a.name.localeCompare(b.name);
    });
  }, [items, filter]);

  return (
    <AppScreen>
      <PageHeader
        title="Clients"
        subtitle={
          clients.isPending ? (
            <Skeleton width={160} height={18} />
          ) : (
            `${items.length} active in caseload`
          )
        }
        action={
          <Link href="/clients/new">
            <PrimaryButton
              size="sm"
              height={36}
              minHeight={36}
              icon={<Plus size={14} color="primaryFg" />}
              aria-label="New client"
            >
              New client
            </PrimaryButton>
          </Link>
        }
      />

      {/* Search + compact filter — kit sm:flex-row */}
      <XStack flexDirection="column sm:row" gap="3" alignItems="sm:center" width="100%">
        <Input
          flex={1}
          height={36}
          minHeight={36}
          borderRadius="radiusControl"
          borderWidth={1}
          borderColor="border-color focus:focusRing"
          backgroundColor="cardBg"
          fontSize={13}
          paddingHorizontal="3"
          outlineWidth="focus:2px"
          outlineColor="focus:focusRing"
          value={q}
          onChangeText={setQ}
          placeholder="Search by name…"
          aria-label="Search clients"
          returnKeyType="search"
          enterKeyHint="search"
        />
        <XStack
          width="100% sm:auto"
          borderWidth={1}
          borderColor="border-color"
          borderRadius="radiusControl"
          backgroundColor="elevatedBg"
          overflow="hidden"
          flexShrink="sm:0"
          alignSelf="sm:center"
        >
          {FILTERS.map((f) => {
            const selected = filter === f.id;
            return (
              <YStack
                key={f.id}
                role="tab"
                aria-selected={selected}
                flex="1 sm:0"
                height={36}
                paddingHorizontal="3"
                justifyContent="center"
                backgroundColor={`${selected ? 'primary' : 'transparent'} hover:${selected ? 'primary' : 'cardBg'}`}
                cursor="pointer"
                opacity="press:0.9"
                onPress={() => {
                  startTransition(() => setFilter(f.id));
                }}
              >
                <XStack alignItems="center" justifyContent="center" gap={6}>
                  <Text
                    fontSize={12}
                    fontWeight="500"
                    color={selected ? 'primaryFg' : 'textMuted'}
                    whiteSpace="nowrap"
                  >
                    {f.label}
                  </Text>
                  <Text
                    fontSize={10}
                    color={selected ? 'primaryFg' : 'textMuted'}
                    opacity={selected ? 0.7 : 1}
                  >
                    {clients.isPending ? '–' : counts[f.id]}
                  </Text>
                </XStack>
              </YStack>
            );
          })}
        </XStack>
      </XStack>

      {clients.isPending ? (
        <RosterListSkeleton />
      ) : clients.isError ? (
        <ErrorState message="Could not load clients." retry={() => void clients.refetch()} />
      ) : filtered.length === 0 ? (
        <EmptyState
          title={q || filter !== 'all' ? 'No clients match' : 'No clients yet'}
          hint={
            q || filter !== 'all'
              ? 'Try adjusting the search or filter.'
              : 'Add your first client to get started.'
          }
          action={
            q || filter !== 'all' ? undefined : (
              <Link href="/clients/new">
                <PrimaryButton icon={<Plus size={18} />}>Add a client</PrimaryButton>
              </Link>
            )
          }
        />
      ) : (
        <YStack gap="1-5" width="100%">
          <YStack width="100%" display="flex md:none" gap="1-5">
            {filtered.map((client) => (
              <RosterRow key={client.id} client={client} desktop={false} />
            ))}
          </YStack>
          <YStack width="100%" display="none md:flex">
            <Card padding={0} gap={0} overflow="hidden">
              <XStack paddingHorizontal="4" paddingVertical="3" gap="4">
                <Text flex={1} fontSize={13} fontWeight="500" color="textMuted">
                  Client
                </Text>
                <Text
                  width={COL.weight}
                  fontSize={13}
                  fontWeight="500"
                  color="textMuted"
                  flexShrink={0}
                >
                  Weight
                </Text>
                <Text
                  width={COL.goal}
                  fontSize={13}
                  fontWeight="500"
                  color="textMuted"
                  flexShrink={0}
                >
                  Goal
                </Text>
                <Text
                  width={COL.status}
                  fontSize={13}
                  fontWeight="500"
                  color="textMuted"
                  flexShrink={0}
                >
                  Status
                </Text>
                <Text
                  width={COL.progress}
                  fontSize={13}
                  fontWeight="500"
                  color="textMuted"
                  flexShrink={0}
                >
                  Progress
                </Text>
              </XStack>
              {filtered.map((client) => (
                <RosterRow key={client.id} client={client} desktop />
              ))}
            </Card>
          </YStack>
        </YStack>
      )}
    </AppScreen>
  );
};
