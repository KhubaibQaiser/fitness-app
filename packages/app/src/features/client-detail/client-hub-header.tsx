'use client';

import { Link } from 'solito/link';
import { Avatar, IconButton, MessageCircle, Muted, Tabs, Text, XStack, YStack } from '@gymos/ui';
import { formatInternational, whatsappDigits } from '../../lib/phone';
import { ClientHubMoreMenu } from './client-hub-more-menu';
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
      paddingTop="$md"
      paddingBottom={0}
      width="100%"
      alignSelf="stretch"
      $md={{ paddingHorizontal: 24 }}
    >
      <XStack alignItems="center" gap="$2.5" width="100%" paddingBottom="$md">
        <Avatar name={name} size={40} tone={status === 'attention' ? 'primary' : 'accent'} />

        <YStack flex={1} minWidth={0} gap={2}>
          <Text
            fontFamily="$heading"
            fontWeight="600"
            fontSize={16}
            lineHeight={22}
            color="$color"
            letterSpacing={-0.2}
            numberOfLines={1}
          >
            {name}
          </Text>
          <XStack flexWrap="wrap" gap="$xs" alignItems="center">
            {phoneLabel ? (
              <Muted fontSize={12} lineHeight={16} numberOfLines={1}>
                {phoneLabel}
              </Muted>
            ) : null}
            {phoneLabel && email ? (
              <Muted fontSize={12} lineHeight={16}>
                ·
              </Muted>
            ) : null}
            {email ? (
              <Muted fontSize={12} lineHeight={16} numberOfLines={1}>
                {email}
              </Muted>
            ) : null}
          </XStack>
        </YStack>

        <XStack alignItems="center" flexShrink={0}>
          {waDigits.length > 0 ? (
            <Link href={`https://wa.me/${waDigits}`} target="_blank">
              <IconButton
                density="xs"
                aria-label="Open WhatsApp"
                icon={<MessageCircle size={14} color="$primary" />}
              />
            </Link>
          ) : null}
          <ClientHubMoreMenu
            clientId={clientId}
            signed={signed}
            pdfPending={pdfPending}
            onDownloadPdf={onDownloadPdf}
          />
        </XStack>
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
