'use client';

import { useState } from 'react';
import {
  Adapt,
  Check,
  ClipboardList,
  Download,
  gymosSheetFrameRadius,
  gymosSheetOverlayColor,
  gymosSheetTransition,
  IconButton,
  MenuLines,
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
import { Link } from '../../lib/link';
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
      {/* asChild: the IconButton is the only press owner (a wrapping trigger lost the tap on SDK 58). */}
      <Popover.Trigger asChild>
        <IconButton
          aria-label="More actions"
          aria-expanded={open}
          icon={<MenuLines size={20} color="color" />}
        />
      </Popover.Trigger>

      <Adapt when={isCompact}>
        <Sheet modal snapPointsMode="fit" dismissOnSnapToBottom transition={gymosSheetTransition}>
          <Sheet.Overlay opacity="enter:0 exit:0" backgroundColor={gymosSheetOverlayColor} />
          <Sheet.Handle />
          <Sheet.Container
            paddingTop="3"
            paddingRight="3"
            paddingLeft="3"
            paddingBottom="5"
            gap="1"
          >
            <Sheet.Background
              borderTopLeftRadius={gymosSheetFrameRadius}
              borderTopRightRadius={gymosSheetFrameRadius}
              backgroundColor="cardBg"
            />
            <Adapt.Contents />
          </Sheet.Container>
        </Sheet>
      </Adapt>

      <Popover.Content
        role="menu"
        borderWidth={1}
        borderColor="border-color"
        borderRadius="radiusCard"
        backgroundColor="cardBg"
        padding="1-5"
        gap="1"
        minWidth={230}
        // Tamagui 2's elevation="$2" shadow, spelled out: Popover.Content has no elevation prop in v3.
        shadowColor="shadowColor"
        shadowOffset={{ width: 0, height: 8 }}
        shadowRadius={16}
        opacity="enter:0 exit:0"
        scale="enter:0.96 exit:0.96"
      >
        <YStack width="100%" gap="1">
          <Link href={`/clients/${clientId}/check-in`}>
            <ClientHubMenuRow
              icon={<Check size={18} color="color" />}
              label="Log check-in"
              onPress={close}
            />
          </Link>
          <Link href={`/clients/${clientId}/vitals/new`}>
            <ClientHubMenuRow
              icon={<Scale size={18} color="color" />}
              label="Log vitals"
              onPress={close}
            />
          </Link>
          <Link href={`/clients/${clientId}/goal/new`}>
            <ClientHubMenuRow
              icon={<Pencil size={18} color="color" />}
              label="Edit goal"
              onPress={close}
            />
          </Link>
          <Link href={`/clients/${clientId}/dietary`}>
            <ClientHubMenuRow
              icon={<Utensils size={18} color="color" />}
              label="Edit dietary profile"
              onPress={close}
            />
          </Link>
          <Link href={`/clients/${clientId}/plan`}>
            <ClientHubMenuRow
              icon={<ClipboardList size={18} color="color" />}
              label="Open plan"
              onPress={close}
            />
          </Link>
          <ClientHubMenuRow
            icon={<Download size={18} color="color" />}
            label={pdfPending ? 'Preparing Client Intake PDF…' : 'Download Client Intake PDF'}
            disabled={pdfDisabled}
            onPress={() => {
              onDownloadPdf();
              close();
            }}
          />

          <Separator marginVertical="1" />

          <ClientHubMenuRow
            icon={<X size={18} color="textMuted" />}
            label="Cancel"
            onPress={close}
          />
        </YStack>
      </Popover.Content>
    </Popover>
  );
};
