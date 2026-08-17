'use client';

import { Link } from 'solito/link';
import { Avatar, IconButton, MessageCircle, Muted, Tabs, Text, XStack, YStack } from '@gymos/ui';
import { formatInternational, whatsappDigits } from '../../lib/phone';
import { ClientHubMoreMenu } from './client-hub-more-menu';
import { ClientHubStatusDot } from './client-hub-status-dot';
import { CLIENT_HUB_TABS } from './client-hub-tabs';

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
      paddingHorizontal={16}
      paddingTop="$3"
      paddingBottom={0}
      width="100%"
      alignSelf="stretch"
      $md={{ paddingHorizontal: 24 }}
    >
      <XStack alignItems="center" gap="$2.5" width="100%" paddingBottom={16}>
        <Avatar name={name} size={64} tone={status === 'attention' ? 'primary' : 'accent'} />

        <YStack flex={1} minWidth={0} gap={2}>
          <XStack alignItems="center" gap="$2" minWidth={0}>
            <ClientHubStatusDot status={status} />
            <Text
              flex={1}
              minWidth={0}
              fontFamily="$heading"
              fontWeight="700"
              fontSize={20}
              lineHeight={26}
              color="$color"
              letterSpacing={-0.3}
              numberOfLines={1}
            >
              {name}
            </Text>
          </XStack>
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

      <Tabs
        items={[...CLIENT_HUB_TABS]}
        value={tab}
        onChange={onTabChange}
        ariaLabel="Client sections"
      />
    </YStack>
  );
};
