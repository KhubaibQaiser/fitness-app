'use client';

import { useState } from 'react';
import { Link } from 'solito/link';
import {
  Adapt,
  Check,
  ClipboardList,
  Download,
  IconButton,
  MoreHorizontal,
  Pencil,
  Popover,
  Scale,
  Separator,
  Sheet,
  useMedia,
  Utensils,
  X,
  YStack,
} from '@gymos/ui';
import { ClientHubMenuRow } from './client-hub-menu-row';

type Props = {
  clientId: string;
  signed: boolean;
  pdfPending: boolean;
  onDownloadPdf: () => void;
};

/**
 * Client hub "more actions" menu. One shared list of rows renders as a popover on
 * larger screens and as a bottom action sheet on small screens (Apple HIG), via
 * Tamagui's Adapt — no separate desktop/mobile branches to maintain.
 */
export const ClientHubMoreMenu = ({ clientId, signed, pdfPending, onDownloadPdf }: Props) => {
  const [open, setOpen] = useState(false);
  const media = useMedia();
  const isCompact = !media.sm;
  const close = () => setOpen(false);
  const pdfDisabled = !signed || pdfPending;

  return (
    <Popover open={open} onOpenChange={setOpen} placement="bottom-end" allowFlip>
      <Popover.Trigger>
        <IconButton
          aria-label="More actions"
          aria-expanded={open}
          icon={<MoreHorizontal size={20} color="$color" />}
        />
      </Popover.Trigger>

      <Adapt when={isCompact}>
        <Sheet modal snapPointsMode="fit" dismissOnSnapToBottom>
          <Sheet.Overlay backgroundColor="$shadowColor" />
          <Sheet.Handle />
          <Sheet.Frame padding="$3" paddingBottom="$5" gap="$1" backgroundColor="$cardBg">
            <Adapt.Contents />
          </Sheet.Frame>
        </Sheet>
      </Adapt>

      <Popover.Content
        role="menu"
        borderWidth={1}
        borderColor="$borderColor"
        borderRadius="$radiusCard"
        backgroundColor="$cardBg"
        padding="$1.5"
        gap="$1"
        minWidth={230}
        elevation="$2"
        enterStyle={{ opacity: 0, scale: 0.96 }}
        exitStyle={{ opacity: 0, scale: 0.96 }}
      >
        <YStack width="100%" gap="$1">
          <Link href={`/clients/${clientId}/check-in`}>
            <ClientHubMenuRow
              icon={<Check size={18} color="$color" />}
              label="Log check-in"
              onPress={close}
            />
          </Link>
          <Link href={`/clients/${clientId}/vitals/new`}>
            <ClientHubMenuRow
              icon={<Scale size={18} color="$color" />}
              label="Log vitals"
              onPress={close}
            />
          </Link>
          <Link href={`/clients/${clientId}/goal/new`}>
            <ClientHubMenuRow
              icon={<Pencil size={18} color="$color" />}
              label="Edit goal"
              onPress={close}
            />
          </Link>
          <Link href={`/clients/${clientId}/dietary`}>
            <ClientHubMenuRow
              icon={<Utensils size={18} color="$color" />}
              label="Edit dietary profile"
              onPress={close}
            />
          </Link>
          <Link href={`/clients/${clientId}/plan`}>
            <ClientHubMenuRow
              icon={<ClipboardList size={18} color="$color" />}
              label="Open plan"
              onPress={close}
            />
          </Link>
          <ClientHubMenuRow
            icon={<Download size={18} color="$color" />}
            label={pdfPending ? 'Preparing Client Intake PDF…' : 'Download Client Intake PDF'}
            disabled={pdfDisabled}
            onPress={() => {
              onDownloadPdf();
              close();
            }}
          />

          <Separator marginVertical="$1" />

          <ClientHubMenuRow
            icon={<X size={18} color="$textMuted" />}
            label="Cancel"
            onPress={close}
          />
        </YStack>
      </Popover.Content>
    </Popover>
  );
};
