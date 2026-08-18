'use client';

import { type ReactElement, type ReactNode } from 'react';
import { Link } from 'solito/link';
import { usePathname } from 'solito/navigation';
import { isWeb, useSafeAreaInsets } from '@gymos/platform';
import {
  Avatar,
  Bell,
  Body,
  Home,
  Muted,
  Settings,
  Text,
  Users,
  Wrench,
  XStack,
  YStack,
} from '@gymos/ui';
import { useMe, useUnreadCount } from '../../api';
import { PRIMARY_NAV, type PrimaryNavHref, type PrimaryNavItem } from './primary-nav';
import { useAppChrome } from './use-app-chrome';

const isActive = (pathname: string, href: string) =>
  href === '/' ? pathname === '/' : pathname === href || pathname.startsWith(`${href}/`);

const navIcon = (href: PrimaryNavHref, size: number, color: string): ReactElement => {
  switch (href) {
    case '/':
      return <Home size={size} color={color} />;
    case '/clients':
      return <Users size={size} color={color} />;
    case '/tools':
      return <Wrench size={size} color={color} />;
    case '/notifications':
      return <Bell size={size} color={color} />;
    case '/settings':
      return <Settings size={size} color={color} />;
  }
};

const UnreadDot = ({ count }: { count: number }) =>
  count > 0 ? (
    <YStack
      backgroundColor="$danger"
      borderRadius={999}
      minWidth={16}
      height={16}
      paddingHorizontal={3}
      alignItems="center"
      justifyContent="center"
      position="absolute"
      top={-4}
      right={-8}
    >
      <Text color="$dangerFg" fontSize={9} fontWeight="800" fontFamily="$heading">
        {count > 9 ? '9+' : count}
      </Text>
    </YStack>
  ) : null;

export const MobileTabBar = () => {
  const pathname = usePathname() ?? '/';
  const unread = useUnreadCount();
  const count = unread.data?.count ?? 0;
  const { allowMobileTabBar } = useAppChrome();
  const insets = useSafeAreaInsets();
  if (!allowMobileTabBar) return null;

  return (
    <XStack
      backgroundColor="$cardBg"
      borderTopWidth={1}
      borderTopColor="$borderColor"
      justifyContent="space-around"
      paddingTop="$2"
      paddingBottom={Math.max(insets.bottom, 12)}
      paddingHorizontal="$1"
      zIndex={100}
      role="navigation"
      aria-label="Primary"
      display="flex"
      $md={{ display: 'none' }}
    >
      {PRIMARY_NAV.map(({ href, label }) => {
        const active = isActive(pathname, href);
        const iconColor = active ? '$primary' : '$textMuted';
        return (
          <Link key={href} href={href} style={{ flex: 1 }}>
            <YStack
              alignItems="center"
              minHeight={48}
              justifyContent="center"
              gap={4}
              paddingVertical="$1.5"
              paddingHorizontal="$1"
              marginHorizontal={2}
              focusVisibleStyle={{
                outlineWidth: 2,
                outlineColor: '$focusRing',
                outlineStyle: 'solid',
              }}
            >
              <XStack position="relative">
                {navIcon(href, 22, iconColor)}
                {href === '/notifications' ? <UnreadDot count={count} /> : null}
              </XStack>
              <Text
                fontSize={10}
                fontFamily="$heading"
                fontWeight={active ? '600' : '400'}
                color={active ? '$primary' : '$textMuted'}
              >
                {label}
              </Text>
            </YStack>
          </Link>
        );
      })}
    </XStack>
  );
};

export const SideNav = () => {
  const pathname = usePathname() ?? '/';
  const unread = useUnreadCount();
  const count = unread.data?.count ?? 0;
  const me = useMe();
  const coachName = me.data?.name ?? 'Coach';

  const link = ({ href, label }: PrimaryNavItem) => {
    const active = isActive(pathname, href);
    return (
      <Link key={href} href={href}>
        <XStack
          alignItems="center"
          gap="$3"
          minHeight={40}
          paddingHorizontal="$3"
          borderRadius="$radiusControl"
          backgroundColor={active ? '$coachAccentWash' : 'transparent'}
          hoverStyle={{ backgroundColor: active ? '$coachAccentWash' : '$elevatedBg' }}
          focusVisibleStyle={{
            outlineWidth: 2,
            outlineColor: '$focusRing',
            outlineStyle: 'solid',
          }}
          overflow="hidden"
        >
          {active ? (
            <YStack
              width={3}
              backgroundColor="$primary"
              alignSelf="stretch"
              position="absolute"
              left={0}
              top={0}
              bottom={0}
              borderRadius={2}
            />
          ) : null}
          {navIcon(href, 18, active ? '$coachAccentText' : '$textMuted')}
          <Body
            fontWeight={active ? '600' : '400'}
            fontSize={13.5}
            color={active ? '$coachAccentText' : '$textMuted'}
            flex={1}
          >
            {label}
          </Body>
          {href === '/notifications' && count > 0 ? (
            <YStack
              backgroundColor="$danger"
              borderRadius={999}
              minWidth={20}
              height={20}
              alignItems="center"
              justifyContent="center"
              paddingHorizontal={5}
            >
              <Text color="$dangerFg" fontSize={10} fontWeight="800">
                {count > 9 ? '9+' : count}
              </Text>
            </YStack>
          ) : null}
        </XStack>
      </Link>
    );
  };

  return (
    <YStack
      display="none"
      $md={{ display: 'flex' }}
      width={200}
      minWidth={200}
      maxWidth={200}
      flexGrow={0}
      flexShrink={0}
      backgroundColor="$cardBg"
      borderRightWidth={1}
      borderRightColor="$borderColor"
      paddingVertical="$4"
      paddingHorizontal="$3"
      gap="$4"
      alignSelf="stretch"
      role="navigation"
      aria-label="Primary"
    >
      <YStack paddingHorizontal="$2" gap={2}>
        <Text
          fontFamily="$heading"
          fontWeight="800"
          fontSize={18}
          color="$color"
          letterSpacing={-0.3}
        >
          GymOS
        </Text>
        <Muted fontSize={11} fontWeight="500" textTransform="uppercase" letterSpacing={1.2}>
          Coach
        </Muted>
      </YStack>

      <YStack gap="$1" flex={1}>
        <Muted
          fontSize={10}
          fontWeight="600"
          textTransform="uppercase"
          letterSpacing={1.2}
          paddingHorizontal="$3"
          marginBottom="$1"
        >
          Workspace
        </Muted>
        {PRIMARY_NAV.map(link)}
      </YStack>

      <YStack
        borderTopWidth={1}
        borderTopColor="$borderColor"
        paddingTop="$3"
        paddingHorizontal="$1"
      >
        <XStack alignItems="center" gap="$2.5">
          <Avatar name={coachName} size={32} />
          <YStack flex={1} minWidth={0}>
            <Text
              fontFamily="$heading"
              fontWeight="600"
              fontSize={13}
              color="$color"
              numberOfLines={1}
            >
              {coachName}
            </Text>
            <Muted fontSize={11}>GymOS · Pilot</Muted>
          </YStack>
        </XStack>
      </YStack>
    </YStack>
  );
};

export const AppShell = ({ children }: { children: ReactNode }) => {
  // Web needs an explicit viewport-bound height so flex children can compute a
  // determinate size and scroll internally (native screens are already bounded
  // by the OS window, so flex={1} alone is enough there).
  const webHeight = isWeb ? { height: '100dvh' as const } : {};

  return (
    <XStack flex={1} width="100%" {...webHeight} backgroundColor="$coachCanvas">
      <SideNav />
      <YStack flex={1} minHeight={0} minWidth={0} width="100%" overflow="hidden">
        {children}
        <MobileTabBar />
      </YStack>
    </XStack>
  );
};
