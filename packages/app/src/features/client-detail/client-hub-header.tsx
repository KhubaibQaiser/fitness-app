'use client';

import { Link } from 'solito/link';
import { Avatar, IconButton, MessageCircle, Muted, Tabs, Text, XStack, YStack } from '@gymos/ui';
import { formatInternational, whatsappDigits } from '../../lib/phone';
import { ClientHubMoreMenu } from './client-hub-more-menu';
import { ClientHubStatusDot } from './client-hub-status-dot';

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
  tab: string;
  onTabChange: (id: string) => void;
  signed: boolean;
  pdfPending: boolean;
  onDownloadPdf: () => void;
};

/** Compact client hub identity strip + section tabs. */
export const ClientHubHeader = ({
  clientId,
  name,
  phone,
  email,
  status,
  tab,
  onTabChange,
  signed,
  pdfPending,
  onDownloadPdf,
}: Props) => {
  const waDigits = phone ? whatsappDigits(phone) : '';
  const phoneLabel = phone ? formatInternational(phone) : null;

  return (
    <YStack
      position="sticky"
      top={0}
      zIndex={20}
      backgroundColor="$cardBg"
      borderBottomWidth={1}
      borderBottomColor="$borderColor"
      paddingHorizontal="$4"
      paddingTop="$3"
      paddingBottom={0}
      width="100%"
      alignSelf="stretch"
      $md={{ paddingHorizontal: '$8' }}
    >
      <XStack alignItems="center" gap="$2.5" width="100%" paddingBottom="$2.5">
        <Avatar name={name} size={36} tone={status === 'attention' ? 'primary' : 'accent'} />
        <ClientHubStatusDot status={status} />

        <YStack flex={1} minWidth={0} gap={2}>
          <Text
            fontFamily="$heading"
            fontWeight="700"
            fontSize={16}
            color="$color"
            letterSpacing={-0.3}
            numberOfLines={1}
          >
            {name}
          </Text>
          <XStack flexWrap="wrap" gap="$2" alignItems="center">
            {phoneLabel ? (
              <XStack alignItems="center" gap="$1">
                <Muted fontSize={12} numberOfLines={1}>
                  {phoneLabel}
                </Muted>
                {waDigits.length > 0 ? (
                  <Link href={`https://wa.me/${waDigits}`} target="_blank">
                    <IconButton
                      density="xs"
                      aria-label="Open WhatsApp"
                      icon={<MessageCircle size={14} color="$primary" />}
                    />
                  </Link>
                ) : null}
              </XStack>
            ) : null}
            {email ? (
              <Muted fontSize={12} numberOfLines={1}>
                {email}
              </Muted>
            ) : null}
          </XStack>
        </YStack>

        <ClientHubMoreMenu
          clientId={clientId}
          signed={signed}
          pdfPending={pdfPending}
          onDownloadPdf={onDownloadPdf}
        />
      </XStack>

      <Tabs items={[...TABS]} value={tab} onChange={onTabChange} ariaLabel="Client sections" />
    </YStack>
  );
};
