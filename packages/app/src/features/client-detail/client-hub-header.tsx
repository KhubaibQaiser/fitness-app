'use client';

import { Link } from 'solito/link';
import {
  Avatar,
  Badge,
  GhostButton,
  MessageCircle,
  Muted,
  PrimaryButton,
  Tabs,
  Text,
  XStack,
  YStack,
} from '@gymos/ui';

const TABS = [
  { id: 'overview', label: 'Overview' },
  { id: 'plan', label: 'Plan' },
  { id: 'history', label: 'History' },
] as const;

type StatusKind = 'attention' | 'on-track' | 'new';

type Props = {
  clientId: string;
  name: string;
  phone: string | null;
  email: string | null;
  status: StatusKind;
  isDesktop: boolean;
  tab: string;
  onTabChange: (id: string) => void;
};

/** Sticky client hub identity strip + section tabs. */
export const ClientHubHeader = ({
  clientId,
  name,
  phone,
  email,
  status,
  isDesktop,
  tab,
  onTabChange,
}: Props) => {
  const waDigits = phone?.replace(/[^\d]/g, '') ?? '';

  return (
    <YStack
      position="sticky"
      top={0}
      zIndex={20}
      backgroundColor="$cardBg"
      borderBottomWidth={1}
      borderBottomColor="$borderColor"
      paddingHorizontal="$5"
      paddingTop="$4"
      paddingBottom={0}
      width="100%"
      alignSelf="stretch"
      $md={{ paddingHorizontal: '$8' }}
    >
      <XStack alignItems="flex-start" gap="$3" width="100%" paddingBottom="$3">
        <Avatar name={name} size={48} tone={status === 'attention' ? 'primary' : 'accent'} />

        <YStack flex={1} minWidth={0} gap="$2">
          <XStack flexWrap="wrap" alignItems="center" gap="$2">
            <Text
              fontFamily="$heading"
              fontWeight="700"
              fontSize={18}
              color="$color"
              letterSpacing={-0.3}
              numberOfLines={2}
            >
              {name}
            </Text>
            {status === 'attention' ? <Badge tone="danger" label="Needs attention" /> : null}
            {status === 'on-track' ? <Badge tone="success" label="On track" /> : null}
            {status === 'new' ? <Badge tone="warning" label="New client" /> : null}
          </XStack>

          <XStack flexWrap="wrap" gap="$3" alignItems="center">
            {phone ? (
              <Muted fontSize={12} numberOfLines={1}>
                {phone}
              </Muted>
            ) : null}
            {email ? (
              <Muted fontSize={12} numberOfLines={1}>
                {email}
              </Muted>
            ) : null}
          </XStack>
        </YStack>

        <XStack gap="$2" flexShrink={0} alignItems="center">
          {waDigits.length > 0 ? (
            <Link href={`https://wa.me/${waDigits}`} target="_blank">
              <GhostButton icon={<MessageCircle size={18} />} aria-label="Open WhatsApp">
                Chat
              </GhostButton>
            </Link>
          ) : null}

          {isDesktop ? (
            <>
              <Link href={`/clients/${clientId}/check-in`}>
                <GhostButton>Log check-in</GhostButton>
              </Link>
              <Link href={`/clients/${clientId}/vitals/new`}>
                <PrimaryButton>Log vitals</PrimaryButton>
              </Link>
            </>
          ) : null}
        </XStack>
      </XStack>

      <Tabs items={[...TABS]} value={tab} onChange={onTabChange} ariaLabel="Client sections" />
    </YStack>
  );
};
