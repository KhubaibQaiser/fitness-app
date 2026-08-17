'use client';

import type { ReactNode } from 'react';
import { Sheet, Text, XStack, YStack } from 'tamagui';
import { X } from '../icons';
import { IconButton } from './icon-button';

type GymosSheetProps = {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
};

export const GymosSheet = ({ open, onClose, title, children }: GymosSheetProps) => (
  <Sheet
    modal
    open={open}
    onOpenChange={(next: boolean) => {
      if (!next) onClose();
    }}
    snapPointsMode="fit"
    dismissOnSnapToBottom
  >
    <Sheet.Overlay backgroundColor="rgba(0,0,0,0.5)" onPress={onClose} />
    <Sheet.Handle />
    <Sheet.Frame
      role="dialog"
      aria-modal
      aria-label={title}
      backgroundColor="$surface"
      borderTopWidth={1}
      borderColor="$borderColor"
      padding="$5"
      gap="$3"
      maxHeight="85%"
    >
      <XStack alignItems="center" justifyContent="space-between" gap="$3">
        <Text fontFamily="$heading" fontWeight="600" fontSize={16} color="$color" flex={1}>
          {title}
        </Text>
        <IconButton
          aria-label="Close"
          onPress={onClose}
          icon={<X size={16} color="$textMuted" />}
        />
      </XStack>
      <YStack>{children}</YStack>
    </Sheet.Frame>
  </Sheet>
);
