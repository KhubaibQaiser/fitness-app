'use client';

import { type ReactElement, type ReactNode } from 'react';
import { Link } from 'solito/link';
import { usePathname } from 'solito/navigation';
import { useSafeAreaInsets, useThemeMode } from '@gymos/platform';
import {
  Avatar,
  Bell,
  Body,
  Home,
  IconButton,
  Moon,
  Muted,
  Settings,
  Sun,
  Text,
  Users,
  Wrench,
  XStack,
  YStack,
} from '@gymos/ui';
import { useMe, useUnreadCount } from '../../api';
import { useAppChrome } from './use-app-chrome';

type NavHref = '/' | '/clients' | '/tools' | '/notifications' | '/settings';

type NavItem = {
  href: NavHref;
  label: string;
};

const NAV: readonly NavItem[] = [
  { href: '/', label: 'Home' },
  { href: '/clients', label: 'Clients' },
  { href: '/tools', label: 'Tools' },
  { href: '/notifications', label: 'Alerts' },
  { href: '/settings', label: 'Settings' },
];

const isActive = (pathname: string, href: string) =>
  href === '/' ? pathname === '/' : pathname === href || pathname.startsWith(`${href}/`);

const navIcon = (href: NavHref, size: number, color: string): ReactElement => {
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

const ThemeToggle = () => {
  const { mode, toggle } = useThemeMode();
  const dark = mode === 'dark';
  return (
    <IconButton
      onPress={toggle}
      aria-label={dark ? 'Switch to light mode' : 'Switch to dark mode'}
      icon={dark ? <Sun size={22} color="$color" /> : <Moon size={22} color="$color" />}
    />
  );
};

const UnreadDot = ({ count }: { count: number }) =>
  count > 0 ? (
    <YStack
      backgroundColor="$danger"
      borderRadius={999}
      minWidth={18}
      height={18}
      paddingHorizontal={4}
      alignItems="center"
      justifyContent="center"
      position="absolute"
      top={-4}
      right={-8}
    >
      <Text color="$dangerFg" fontSize={10} fontWeight="800" fontFamily="$heading">
        {count > 9 ? '9+' : count}
      </Text>
    </YStack>
  ) : null;

export const MobileTabBar = () => {
  const pathname = usePathname() ?? '/';
  const unread = useUnreadCount();
  const count = unread.data?.count ?? 0;
  const { showMobileTabBar } = useAppChrome();
  const insets = useSafeAreaInsets();
  if (!showMobileTabBar) return null;

  return (
    <XStack
      backgroundColor="$sidebar"
      borderTopWidth={1}
      borderTopColor="$borderColor"
      justifyContent="space-around"
      paddingTop="$2"
      paddingBottom={Math.max(insets.bottom, 12)}
      paddingHorizontal="$1"
      zIndex={100}
      elevation={8}
      role="navigation"
      aria-label="Primary"
    >
      {NAV.map(({ href, label }) => {
        const active = isActive(pathname, href);
        const color = active ? '$primaryFg' : '$textMuted';
        return (
          <Link key={href} href={href} style={{ flex: 1 }}>
            <YStack
              alignItems="center"
              minHeight={48}
              justifyContent="center"
              gap={4}
              paddingVertical="$1.5"
              paddingHorizontal="$1"
              borderRadius="$radiusControl"
              backgroundColor={active ? '$primary' : 'transparent'}
              marginHorizontal={2}
              focusVisibleStyle={{
                outlineWidth: 2,
                outlineColor: '$focusRing',
                outlineStyle: 'solid',
              }}
            >
              <XStack position="relative">
                {navIcon(href, 20, color)}
                {href === '/notifications' ? <UnreadDot count={count} /> : null}
              </XStack>
              <Text
                fontSize={10}
                fontFamily="$heading"
                fontWeight={active ? '700' : '500'}
                color={active ? '$primaryFg' : '$textMuted'}
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

  const link = ({ href, label }: NavItem) => {
    const active = isActive(pathname, href);
    const color = active ? '$primaryFg' : '$textMuted';
    return (
      <Link key={href} href={href}>
        <XStack
          alignItems="center"
          gap="$3"
          minHeight={40}
          paddingHorizontal="$3"
          borderRadius="$radiusControl"
          backgroundColor={active ? '$primary' : 'transparent'}
          hoverStyle={{ backgroundColor: active ? '$primary' : '$elevatedBg' }}
          focusVisibleStyle={{
            outlineWidth: 2,
            outlineColor: '$focusRing',
            outlineStyle: 'solid',
          }}
        >
          {navIcon(href, 18, color)}
          <Body
            fontWeight={active ? '700' : '500'}
            fontSize={13.5}
            color={active ? '$primaryFg' : '$textMuted'}
            flex={1}
          >
            {label}
          </Body>
          {href === '/notifications' && count > 0 ? (
            <YStack
              backgroundColor={active ? '$primaryFg' : '$danger'}
              borderRadius={999}
              minWidth={22}
              height={22}
              alignItems="center"
              justifyContent="center"
              paddingHorizontal={6}
            >
              <Text color={active ? '$primary' : '$dangerFg'} fontSize={11} fontWeight="800">
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
      width={236}
      minWidth={236}
      backgroundColor="$sidebar"
      borderRightWidth={1}
      borderRightColor="$borderColor"
      paddingVertical="$4"
      paddingHorizontal="$3"
      gap="$4"
      flex={1}
      alignSelf="stretch"
      role="navigation"
      aria-label="Primary"
    >
      <YStack paddingHorizontal="$2" gap={2}>
        <Text
          fontFamily="$heading"
          fontWeight="800"
          fontSize={20}
          color="$color"
          letterSpacing={-0.5}
        >
          GymOS
        </Text>
        <Muted fontSize={12}>Coach</Muted>
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
        {NAV.map(link)}
      </YStack>

      <YStack
        borderTopWidth={1}
        borderTopColor="$borderColor"
        paddingTop="$3"
        gap="$3"
        paddingHorizontal="$1"
      >
        <XStack alignItems="center" justifyContent="space-between">
          <Muted fontSize={12}>Theme</Muted>
          <ThemeToggle />
        </XStack>
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

/**
 * Responsive coach chrome: bottom tabs on phone, side nav on desktop.
 * Flex column/row — no `100vh` / `position: fixed` (native-safe).
 */
export const AppShell = ({ children }: { children: ReactNode }) => {
  const { isDesktop } = useAppChrome();

  if (isDesktop) {
    return (
      <XStack flex={1} width="100%" minHeight="100%" backgroundColor="$screenBg">
        <SideNav />
        <YStack flex={1} minWidth={0} position="relative" overflow="hidden">
          {children}
        </YStack>
      </XStack>
    );
  }

  return (
    <YStack flex={1} width="100%" minHeight="100%" backgroundColor="$screenBg">
      <YStack flex={1} minHeight={0} width="100%">
        {children}
      </YStack>
      <MobileTabBar />
    </YStack>
  );
};
