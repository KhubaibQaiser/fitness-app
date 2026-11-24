'use client';

import { Children, cloneElement, type ReactElement } from 'react';
import { Alert, Linking, type GestureResponderEvent } from 'react-native';
import { useLink } from 'solito/link';

type PressableChild = ReactElement<{
  onPress?: (e?: GestureResponderEvent) => void;
  role?: string;
  accessible?: boolean;
  disabled?: boolean;
  'aria-disabled'?: boolean | 'true' | 'false';
}>;

type Props = { href: string; target?: '_blank'; children: PressableChild };

// Scheme (solito's absolute-URL check, https://tools.ietf.org/html/rfc3986#section-3.1) and host.
const ABSOLUTE_URL = /^[a-zA-Z][a-zA-Z\d+\-.]*?:(\/\/[^/?#]*)?/;

const openExternal = async (href: string) => {
  try {
    await Linking.openURL(href);
  } catch (cause) {
    // Scheme and host only: the path can carry a client's phone number (wa.me/<number>).
    const target = ABSOLUTE_URL.exec(href)?.[0] ?? 'unknown';
    const reason = (cause instanceof Error ? cause.message : String(cause)).replaceAll(
      href,
      target,
    );
    console.warn('[link.openExternal] could not open the link', {
      operation: 'link.openExternal',
      target,
      cause: reason,
    });
    Alert.alert("Couldn't open the link", 'No app on this device can open it.');
  }
};

/**
 * Native: hands navigation to the child as its own onPress, so the control has one press owner.
 * solito's Link wraps the child in a Pressable; a Tamagui child with pressStyle (an interactive
 * Card, IconButton, the buttons) owns its press too, and from Expo SDK 58 the inner owner wins
 * the tap, so the Link never fired. Web: see `link.tsx`.
 */
export const Link = ({ href, children }: Props) => {
  const navigate = useLink({ href }).onPress;
  const child = Children.only(children);
  const ariaDisabled = child.props['aria-disabled'];
  const disabled =
    child.props.disabled === true || ariaDisabled === true || ariaDisabled === 'true';
  return cloneElement(child, {
    // What solito's Pressable gave screen readers: one focusable link (a menu row keeps its role).
    accessible: true,
    role: child.props.role ?? 'link',
    onPress: (e?: GestureResponderEvent) => {
      child.props.onPress?.(e);
      if (disabled || e?.defaultPrevented) return;
      if (ABSOLUTE_URL.test(href)) void openExternal(href);
      else navigate(e);
    },
  });
};
