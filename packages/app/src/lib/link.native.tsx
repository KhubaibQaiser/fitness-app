'use client';

import { Children, cloneElement, type ReactElement } from 'react';
import { Linking, type GestureResponderEvent } from 'react-native';
import { useLink } from 'solito/link';

type PressableChild = ReactElement<{
  onPress?: (e?: GestureResponderEvent) => void;
  role?: string;
  accessible?: boolean;
}>;

type Props = { href: string; target?: '_blank'; children: PressableChild };

// Scheme check, as in solito's Link: https://tools.ietf.org/html/rfc3986#section-3.1
const isAbsoluteUrl = (url: string) => /^[a-zA-Z][a-zA-Z\d+\-.]*?:/.test(url);

/**
 * Native: hands navigation to the child as its own onPress, so the control has one press owner.
 * solito's Link wraps the child in a Pressable; a Tamagui child with pressStyle (an interactive
 * Card, IconButton, the buttons) owns its press too, and from Expo SDK 58 the inner owner wins
 * the tap, so the Link never fired. Web: see `link.tsx`.
 */
export const Link = ({ href, children }: Props) => {
  const navigate = useLink({ href }).onPress;
  const child = Children.only(children);
  return cloneElement(child, {
    // What solito's Pressable gave screen readers: one focusable link (a menu row keeps its role).
    accessible: true,
    role: child.props.role ?? 'link',
    onPress: (e?: GestureResponderEvent) => {
      child.props.onPress?.(e);
      if (e?.defaultPrevented) return;
      if (!isAbsoluteUrl(href)) {
        navigate(e);
        return;
      }
      // Not awaited, as in solito's Link: a URL no app can open rejects to RN's global handler.
      void Linking.openURL(href);
    },
  });
};
