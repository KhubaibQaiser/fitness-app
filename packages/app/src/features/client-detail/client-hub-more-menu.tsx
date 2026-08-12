'use client';

import { useState } from 'react';
import { Link } from 'solito/link';
import { IconButton, MoreHorizontal, Text, YStack } from '@gymos/ui';

type Props = {
  clientId: string;
  signed: boolean;
  pdfPending: boolean;
  onDownloadPdf: () => void;
};

export const ClientHubMoreMenu = ({ clientId, signed, pdfPending, onDownloadPdf }: Props) => {
  const [open, setOpen] = useState(false);
  const row = (label: string) => (
    <Text
      fontSize={13}
      fontWeight="500"
      color="$color"
      paddingHorizontal="$3"
      paddingVertical="$2.5"
    >
      {label}
    </Text>
  );

  return (
    <YStack position="relative">
      <IconButton
        onPress={() => setOpen((o) => !o)}
        aria-label="More actions"
        aria-expanded={open}
        icon={<MoreHorizontal size={20} color="$color" />}
      />
      {open ? (
        <YStack
          position="absolute"
          top={44}
          right={0}
          zIndex={50}
          backgroundColor="$cardBg"
          borderWidth={1}
          borderColor="$borderColor"
          borderRadius="$radiusControl"
          minWidth={180}
          overflow="hidden"
          role="menu"
        >
          <Link href={`/clients/${clientId}/check-in`}>{row('Log check-in')}</Link>
          <Link href={`/clients/${clientId}/vitals/new`}>{row('Log vitals')}</Link>
          <YStack
            cursor="pointer"
            role="menuitem"
            opacity={!signed || pdfPending ? 0.45 : 1}
            onPress={() => {
              if (!signed || pdfPending) return;
              onDownloadPdf();
              setOpen(false);
            }}
          >
            {row(pdfPending ? 'Preparing PDF…' : 'Download PDF')}
          </YStack>
          <Link href={`/clients/${clientId}/dietary`}>{row('Edit dietary')}</Link>
          <Link href={`/clients/${clientId}/plan`}>{row('Open plan')}</Link>
        </YStack>
      ) : null}
    </YStack>
  );
};
