'use client';

import { useEffect, useState } from 'react';
import { Text, YStack } from '@gymos/ui';

type StatusKind = 'attention' | 'on-track' | 'new';

const STATUS_COPY: Record<StatusKind, { label: string; color: string; pulse: boolean }> = {
  attention: { label: 'Needs attention', color: '$danger', pulse: true },
  'on-track': { label: 'On track', color: '$success', pulse: false },
  new: { label: 'New client', color: '$warning', pulse: false },
};

export const ClientHubStatusDot = ({ status }: { status: StatusKind }) => {
  const [open, setOpen] = useState(false);
  const [pulse, setPulse] = useState(true);
  const copy = STATUS_COPY[status];

  useEffect(() => {
    if (!copy.pulse) return;
    const id = setInterval(() => setPulse((p) => !p), 800);
    return () => clearInterval(id);
  }, [copy.pulse]);

  return (
    <YStack position="relative">
      <YStack
        width={12}
        height={12}
        borderRadius={999}
        backgroundColor={copy.color}
        opacity={copy.pulse && !pulse ? 0.35 : 1}
        cursor="pointer"
        role="button"
        aria-label={copy.label}
        onPress={() => setOpen((o) => !o)}
      />
      {open ? (
        <YStack
          position="absolute"
          top={18}
          left={0}
          zIndex={40}
          backgroundColor="$cardBg"
          borderWidth={1}
          borderColor="$borderColor"
          borderRadius="$radiusControl"
          paddingHorizontal="$3"
          paddingVertical="$2"
          minWidth={140}
          shadowColor="#000"
          shadowOpacity={0.12}
          shadowRadius={8}
        >
          <Text fontSize={12} fontWeight="600" color="$color">
            {copy.label}
          </Text>
        </YStack>
      ) : null}
    </YStack>
  );
};
