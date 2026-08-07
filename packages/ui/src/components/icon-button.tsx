import { Button, styled } from 'tamagui';

const focusRing = {
  outlineWidth: 2,
  outlineColor: '$focusRing',
  outlineStyle: 'solid',
  outlineOffset: 2,
} as const;

/**
 * Compact icon-only control.
 *
 * Must stay `unstyled` — styled Button + `circular` injects `size: "$true"` and
 * overrides fixed hit targets. Do not name a variant `scale` (transform style).
 *
 * density:
 * - md  40×40 (default)
 * - xs  28×28
 * - xxs 20×20
 */
export const IconButton = styled(Button, {
  name: 'IconButton',
  unstyled: true,
  role: 'button',
  tabIndex: 0,
  cursor: 'pointer',
  width: 40,
  height: 40,
  minWidth: 40,
  minHeight: 40,
  maxWidth: 40,
  maxHeight: 40,
  padding: 0,
  paddingHorizontal: 0,
  paddingVertical: 0,
  borderRadius: 1_000,
  alignItems: 'center',
  justifyContent: 'center',
  flexDirection: 'row',
  backgroundColor: 'transparent',
  borderWidth: 0,
  borderColor: 'transparent',
  color: '$color',
  fontFamily: '$heading',
  fontWeight: '700',
  fontSize: 20,
  hoverStyle: { backgroundColor: '$elevatedBg', opacity: 1 },
  pressStyle: { opacity: 0.85 },
  focusVisibleStyle: focusRing,
  disabledStyle: { opacity: 0.4 },

  variants: {
    tone: {
      ghost: {
        borderWidth: 1,
        borderColor: '$borderColor',
        hoverStyle: { backgroundColor: '$elevatedBg', borderColor: '$borderColorHover' },
      },
      bare: {
        borderWidth: 0,
      },
    },
    density: {
      md: {
        width: 40,
        height: 40,
        minWidth: 40,
        minHeight: 40,
        maxWidth: 40,
        maxHeight: 40,
        padding: 0,
        fontSize: 20,
      },
      xs: {
        width: 28,
        height: 28,
        minWidth: 28,
        minHeight: 28,
        maxWidth: 28,
        maxHeight: 28,
        padding: 0,
        fontSize: 14,
      },
      xxs: {
        width: 20,
        height: 20,
        minWidth: 20,
        minHeight: 20,
        maxWidth: 20,
        maxHeight: 20,
        padding: 0,
        fontSize: 12,
      },
    },
  } as const,

  defaultVariants: {
    tone: 'bare',
    density: 'md',
  },
});
