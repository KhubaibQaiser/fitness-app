'use client';

import { type ReactElement, type ReactNode } from 'react';
import { Link } from 'solito/link';
import { usePathname } from 'solito/navigation';
import { useThemeMode } from '@gymos/platform';
import {
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
  Utensils,
  XStack,
  YStack,
} from '@gymos/ui';
import { useUnreadCount } from '../../api';
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
      return <Utensils size={size} color={color} />;
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
  if (!showMobileTabBar) return null;

  return (
    <XStack
      // fixed to the viewport so the bar stays at the bottom while content scrolls
      // (absolute was relative to the growing shell and drifted mid-page / scrolled away)
      position="fixed"
      bottom={0}
      left={0}
      right={0}
      backgroundColor="$cardBg"
      borderTopWidth={1}
      borderTopColor="$borderColor"
      justifyContent="space-around"
      paddingTop="$2"
      paddingBottom="$3"
      paddingHorizontal="$1"
      zIndex={100}
      elevation={8}
      role="navigation"
      aria-label="Primary"
    >
      {NAV.map(({ href, label }) => {
        const active = isActive(pathname, href);
        const color = active ? '$primary' : '$textMuted';
        return (
          <Link key={href} href={href} style={{ flex: 1 }}>
            <YStack
              alignItems="center"
              minHeight={48}
              justifyContent="center"
              gap={4}
              opacity={active ? 1 : 0.55}
              focusVisibleStyle={{
                outlineWidth: 2,
                outlineColor: '$focusRing',
                outlineStyle: 'solid',
              }}
            >
              <XStack position="relative">
                {navIcon(href, 22, color)}
                {href === '/notifications' ? <UnreadDot count={count} /> : null}
              </XStack>
              <Text
                fontSize={11}
                fontFamily="$heading"
                fontWeight={active ? '800' : '600'}
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
  const primary = NAV.filter((item) => item.href !== '/settings');
  const settings = NAV.find((item) => item.href === '/settings');

  const link = ({ href, label }: NavItem) => {
    const active = isActive(pathname, href);
    const color = active ? '$primary' : '$textMuted';
    return (
      <Link key={href} href={href}>
        <XStack
          alignItems="center"
          gap="$3"
          minHeight={40}
          paddingHorizontal="$3"
          borderRadius="$radiusControl"
          backgroundColor={active ? '$elevatedBg' : 'transparent'}
          borderWidth={active ? 1 : 0}
          borderColor="$borderColor"
          hoverStyle={{ backgroundColor: '$elevatedBg' }}
          focusVisibleStyle={{
            outlineWidth: 2,
            outlineColor: '$focusRing',
            outlineStyle: 'solid',
          }}
        >
          {navIcon(href, 20, color)}
          <Body
            fontWeight={active ? '800' : '600'}
            color={active ? '$color' : '$textMuted'}
            flex={1}
          >
            {label}
          </Body>
          {href === '/notifications' && count > 0 ? (
            <YStack
              backgroundColor="$danger"
              borderRadius={999}
              minWidth={22}
              height={22}
              alignItems="center"
              justifyContent="center"
              paddingHorizontal={6}
            >
              <Text color="$dangerFg" fontSize={11} fontWeight="800">
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
      width={240}
      minWidth={240}
      backgroundColor="$cardBg"
      borderRightWidth={1}
      borderRightColor="$borderColor"
      paddingVertical="$4"
      paddingHorizontal="$3"
      gap="$4"
      height="100vh"
      maxHeight="100vh"
      position="sticky"
      top={0}
      role="navigation"
      aria-label="Primary"
    >
      <XStack alignItems="center" justifyContent="space-between" paddingHorizontal="$2">
        <YStack>
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
        <ThemeToggle />
      </XStack>

      <YStack gap="$1" flex={1}>
        {primary.map(link)}
      </YStack>

      {settings ? link(settings) : null}
    </YStack>
  );
};

/** Responsive coach chrome: bottom tabs on phone, side nav on desktop. */
export const AppShell = ({ children }: { children: ReactNode }) => {
  const { isDesktop } = useAppChrome();

  if (isDesktop) {
    return (
      <XStack flex={1} minHeight="100vh" width="100%" backgroundColor="$screenBg">
        <SideNav />
        <YStack flex={1} minWidth={0} position="relative" overflow="hidden">
          {children}
        </YStack>
      </XStack>
    );
  }

  return (
    <YStack flex={1} minHeight="100vh" width="100%" backgroundColor="$screenBg">
      {children}
      <MobileTabBar />
    </YStack>
  );
};
