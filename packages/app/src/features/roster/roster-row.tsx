'use client';

import { Link } from 'solito/link';
import type { ClientListItem } from '@gymos/contracts';
import { Avatar, Badge, Card, ChevronRight, Muted, Text, XStack, YStack } from '@gymos/ui';

const GOAL_LABEL: Record<string, string> = {
  LOSE: 'Lose',
  GAIN: 'Gain',
  MAINTAIN: 'Maintain',
  RECOMP: 'Recomp',
};

const isAttention = (reasons: { code: string }[]) =>
  reasons.some((r) => r.code === 'OFF_TRACK' || r.code === 'RED_FLAG');

const isNew = (reasons: { code: string }[]) => reasons.some((r) => r.code === 'NEW_CLIENT');

/** Kit desktop columns: 1fr · 120 · 100 · 160 · 100 */
const COL = {
  weight: 120,
  goal: 100,
  status: 160,
  progress: 100,
} as const;

type Props = {
  client: ClientListItem;
  desktop: boolean;
};

/** Single roster row — kit card with aligned desktop columns. */
export const RosterRow = ({ client, desktop }: Props) => {
  const attention = isAttention(client.attentionReasons);
  const neu = isNew(client.attentionReasons);
  const goalText = client.goalPreset ? (GOAL_LABEL[client.goalPreset] ?? client.goalPreset) : '—';

  if (!desktop) {
    return (
      <Link href={`/clients/${client.id}`}>
        <Card interactive paddingHorizontal="$4" paddingVertical="$3.5" gap="$2">
          <XStack alignItems="center" gap="$3">
            <Avatar name={client.name} size={32} tone={attention ? 'primary' : 'accent'} />
            <YStack flex={1} minWidth={0} gap={2}>
              <XStack alignItems="center" gap="$2" flexWrap="wrap">
                <Text
                  fontFamily="$heading"
                  fontWeight="600"
                  fontSize={13.5}
                  color="$color"
                  numberOfLines={1}
                >
                  {client.name}
                </Text>
                {attention ? <Badge tone="danger" label="Needs attention" /> : null}
                {neu ? <Badge tone="warning" label="New" /> : null}
                {!attention && !neu ? <Badge tone="success" label="On track" /> : null}
              </XStack>
              <Muted fontSize={11}>
                {client.latestWeightKg !== null ? `${client.latestWeightKg} kg` : 'No weigh-in'}
                {client.goalPreset ? ` · ${goalText}` : ''}
              </Muted>
            </YStack>
            <ChevronRight size={14} color="$textMuted" />
          </XStack>
          {client.attentionReasons.some(
            (r) => r.code !== 'OFF_TRACK' && r.code !== 'RED_FLAG' && r.code !== 'NEW_CLIENT',
          ) ? (
            <XStack gap="$1" flexWrap="wrap">
              {client.attentionReasons
                .slice(0, 2)
                .map((r) =>
                  r.code === 'OFF_TRACK' ||
                  r.code === 'RED_FLAG' ||
                  r.code === 'NEW_CLIENT' ? null : (
                    <Badge key={r.code} tone="danger" label={r.code.replaceAll('_', ' ')} />
                  ),
                )}
            </XStack>
          ) : null}
        </Card>
      </Link>
    );
  }

  return (
    <Link href={`/clients/${client.id}`}>
      <Card
        interactive
        paddingHorizontal="$4"
        paddingVertical="$3.5"
        flexDirection="row"
        alignItems="center"
        gap="$4"
      >
        {/* Client — flex 1 */}
        <XStack flex={1} alignItems="center" gap="$3" minWidth={0}>
          <Avatar name={client.name} size={32} tone={attention ? 'primary' : 'accent'} />
          <YStack flex={1} minWidth={0} gap={2}>
            <Text
              fontFamily="$heading"
              fontWeight="600"
              fontSize={13.5}
              color="$color"
              numberOfLines={1}
            >
              {client.name}
            </Text>
            <Muted fontSize={11} numberOfLines={1}>
              {client.goalPreset ? goalText : 'No goal set'}
            </Muted>
          </YStack>
        </XStack>

        {/* Weight — fixed 120 */}
        <XStack width={COL.weight} alignItems="baseline" gap={2} flexShrink={0}>
          {client.latestWeightKg !== null ? (
            <>
              <Text fontFamily="$mono" fontWeight="600" fontSize={13} color="$color">
                {client.latestWeightKg}
              </Text>
              <Muted fontSize={12}>kg</Muted>
            </>
          ) : (
            <Muted fontSize={13}>—</Muted>
          )}
        </XStack>

        {/* Goal — fixed 100 */}
        <YStack width={COL.goal} flexShrink={0}>
          <Text fontSize={12} fontWeight="500" color="$textMuted" numberOfLines={1}>
            {goalText}
          </Text>
        </YStack>

        {/* Status — fixed 160 */}
        <YStack width={COL.status} gap="$1" flexShrink={0} alignItems="flex-start">
          {attention ? <Badge tone="danger" label="Needs attention" /> : null}
          {neu ? <Badge tone="warning" label="New" /> : null}
          {!attention && !neu ? <Badge tone="success" label="On track" /> : null}
        </YStack>

        {/* Progress placeholder — fixed 100 (list API has no start/target) */}
        <YStack width={COL.progress} flexShrink={0} justifyContent="center">
          <Muted fontSize={11}>—</Muted>
        </YStack>
      </Card>
    </Link>
  );
};
