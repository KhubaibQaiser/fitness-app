import { Button, styled } from 'tamagui';

const focusRing = {
  outlineWidth: 2,
  outlineColor: '$focusRing',
  outlineStyle: 'solid',
  outlineOffset: 2,
} as const;

/**
 * Compact icon-only control. Visual 40×40 with room for a 22–24px glyph —
 * leaner than GhostButton (which is sized for labeled actions).
 */
export const IconButton = styled(Button, {
  name: 'IconButton',
  circular: true,
  width: 40,
  height: 40,
  minWidth: 40,
  minHeight: 40,
  padding: 0,
  alignItems: 'center',
  justifyContent: 'center',
  backgroundColor: 'transparent',
  borderWidth: 0,
  color: '$color',
  fontFamily: '$heading',
  fontWeight: '700',
  fontSize: 20,
  hoverStyle: { backgroundColor: '$elevatedBg', opacity: 1 },
  pressStyle: { opacity: 0.85, scale: 0.96 },
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
  } as const,

  defaultVariants: {
    tone: 'bare',
  },
});
