'use client';

import { Stat, XStack, YStack } from '@gymos/ui';

/** Home metric strip — same $5/$8 inset as header strip + ScreenBody. */
export const HomeStatStrip = ({
  totalClients,
  needAttention,
  onTrack,
  highAlerts,
}: {
  totalClients: number;
  needAttention: number;
  onTrack: number;
  highAlerts: number;
}) => (
  <YStack
    backgroundColor="$cardBg"
    borderBottomWidth={1}
    borderBottomColor="$borderColor"
    paddingHorizontal="$5"
    paddingVertical="$5"
    width="100%"
    $md={{ paddingHorizontal: '$8' }}
  >
    <XStack flexWrap="wrap" gap="$6" $md={{ gap: '$10' }}>
      <YStack flexBasis="40%" flexGrow={1} minWidth={120} $md={{ flexBasis: '20%' }}>
        <Stat label="Total clients" value={String(totalClients)} hint="Active caseload" />
      </YStack>
      <YStack flexBasis="40%" flexGrow={1} minWidth={120} $md={{ flexBasis: '20%' }}>
        <Stat
          label="Need attention"
          value={String(needAttention)}
          hint={needAttention > 0 ? 'Action required' : 'All clear'}
          {...(needAttention > 0 ? { tone: 'danger' as const } : {})}
        />
      </YStack>
      <YStack flexBasis="40%" flexGrow={1} minWidth={120} $md={{ flexBasis: '20%' }}>
        <Stat label="On track" value={String(onTrack)} hint="This week" tone="success" />
      </YStack>
      <YStack flexBasis="40%" flexGrow={1} minWidth={120} $md={{ flexBasis: '20%' }}>
        <Stat
          label="High alerts"
          value={String(highAlerts)}
          hint={highAlerts > 0 ? 'Unread' : 'No alerts'}
          {...(highAlerts > 0 ? { tone: 'warning' as const } : {})}
        />
      </YStack>
    </XStack>
  </YStack>
);
