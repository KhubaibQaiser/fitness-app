'use client';

import type { ReactNode } from 'react';
import { Text, XStack } from '@gymos/ui';

type Props = {
  icon: ReactNode;
  label: string;
  onPress: () => void;
  disabled?: boolean;
  tone?: 'default' | 'danger';
};

/** Single row inside the client hub "more actions" menu (shared by desktop popover and mobile sheet). */
export const ClientHubMenuRow = ({
  icon,
  label,
  onPress,
  disabled = false,
  tone = 'default',
}: Props) => (
  <XStack
    role="menuitem"
    aria-disabled={disabled}
    tabIndex={disabled ? -1 : 0}
    alignItems="center"
    gap="3"
    minHeight={44}
    paddingHorizontal="3"
    borderRadius="radiusControl"
    opacity={disabled ? 0.45 : 1}
    cursor={disabled ? 'default' : 'pointer'}
    {...(disabled
      ? {}
      : {
          backgroundColor: 'hover:elevatedBg press:elevatedBg',
          onPress,
        })}
    outlineWidth="focus-visible:2px"
    outlineColor="focus-visible:focusRing"
    outlineStyle="focus-visible:solid"
  >
    {icon}
    <Text fontSize={14} fontWeight="500" color={tone === 'danger' ? 'danger' : 'color'}>
      {label}
    </Text>
  </XStack>
);
