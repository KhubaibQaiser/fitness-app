'use client';

import type { ReactNode } from 'react';
import { Dialog, XStack } from 'tamagui';
import { X } from '../icons';
import { IconButton } from './icon-button';

type GymosModalProps = {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
};

export const GymosModal = ({ open, onClose, title, children }: GymosModalProps) => (
  <Dialog
    modal
    open={open}
    onOpenChange={(next) => {
      if (!next) onClose();
    }}
  >
    <Dialog.Portal>
      <Dialog.Overlay
        key="overlay"
        backgroundColor="rgba(0,0,0,0.5)"
        onPress={onClose}
        enterStyle={{ opacity: 0 }}
        exitStyle={{ opacity: 0 }}
      />
      <Dialog.Content
        key="content"
        bordered
        elevate
        backgroundColor="$surface"
        borderColor="$borderColor"
        borderRadius={16}
        padding="$5"
        width="100%"
        maxWidth={400}
        maxHeight="85%"
        gap="$3"
        shadowColor="rgba(0,0,0,0.18)"
        shadowOffset={{ width: 0, height: 8 }}
        shadowRadius={24}
        shadowOpacity={1}
      >
        <XStack alignItems="center" justifyContent="space-between" gap="$3">
          {/* Dialog.Title (not a bare Text) so the primitive wires aria-labelledby. */}
          <Dialog.Title
            fontFamily="$heading"
            fontWeight="600"
            fontSize={16}
            color="$color"
            flex={1}
          >
            {title}
          </Dialog.Title>
          <IconButton
            aria-label="Close"
            onPress={onClose}
            icon={<X size={16} color="$textMuted" />}
          />
        </XStack>
        {children}
      </Dialog.Content>
    </Dialog.Portal>
  </Dialog>
);
