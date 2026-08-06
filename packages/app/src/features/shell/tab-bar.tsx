'use client';

import { Link } from 'solito/link';
import { usePathname } from 'solito/navigation';
import { Text, XStack, YStack } from '@gymos/ui';
import { useUnreadCount } from '../../api';

const TABS = [
  { href: '/', label: 'Home', icon: '⌂' },
  { href: '/clients', label: 'Clients', icon: '👥' },
  { href: '/notifications', label: 'Alerts', icon: '🔔' },
  { href: '/settings', label: 'Settings', icon: '⚙' },
] as const;

/** Bottom tab bar — thumb-zone navigation, ≥44pt targets, unread badge. */
export const TabBar = () => {
  const pathname = usePathname();
  const unread = useUnreadCount();
  const count = unread.data?.count ?? 0;

  return (
    <XStack
      position="fixed"
      bottom={0}
      left={0}
      right={0}
      backgroundColor="$cardBg"
      borderTopWidth={1}
      borderTopColor="$borderColor"
      justifyContent="space-around"
      paddingVertical="$2"
      paddingBottom="$3"
      zIndex={100}
    >
      {TABS.map((tab) => {
        const active = tab.href === '/' ? pathname === '/' : (pathname ?? '').startsWith(tab.href);
        return (
          <Link key={tab.href} href={tab.href} style={{ flex: 1 }}>
            <YStack alignItems="center" minHeight={48} justifyContent="center" gap={2}>
              <XStack>
                <Text fontSize={20} opacity={active ? 1 : 0.55}>
                  {tab.icon}
                </Text>
                {tab.href === '/notifications' && count > 0 ? (
                  <YStack
                    backgroundColor="$danger"
                    borderRadius={999}
                    minWidth={18}
                    height={18}
                    alignItems="center"
                    justifyContent="center"
                    marginLeft={-6}
                    marginTop={-4}
                  >
                    <Text color="white" fontSize={10} fontWeight="800">
                      {count > 9 ? '9+' : count}
                    </Text>
                  </YStack>
                ) : null}
              </XStack>
              <Text
                fontSize={11}
                fontWeight={active ? '800' : '500'}
                color={active ? '$primary' : '$textMuted'}
              >
                {tab.label}
              </Text>
            </YStack>
          </Link>
        );
      })}
    </XStack>
  );
};
