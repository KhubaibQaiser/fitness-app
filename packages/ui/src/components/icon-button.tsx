import { Button, styled } from 'tamagui';

const focusRing = {
  outlineWidth: 2,
  outlineColor: '$focusRing',
  outlineStyle: 'solid',
  outlineOffset: 2,
} as const;

export const IconButton = styled(Button, {
  name: 'IconButton',
  unstyled: true,
  role: 'button',
  tabIndex: 0,
  cursor: 'pointer',
  width: 44,
  height: 44,
  minWidth: 44,
  minHeight: 44,
  maxWidth: 44,
  maxHeight: 44,
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
  color: '$textMuted',
  fontFamily: '$heading',
  fontWeight: '700',
  fontSize: 20,
  hoverStyle: { backgroundColor: '$elevatedBg', opacity: 1 },
  pressStyle: { opacity: 0.85, scale: 0.97 },
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
    active: {
      true: {
        backgroundColor: '$primaryMuted',
        color: '$primary',
        hoverStyle: { backgroundColor: '$primaryMuted', opacity: 0.9 },
      },
      false: {},
    },
    density: {
      md: {
        width: 44,
        height: 44,
        minWidth: 44,
        minHeight: 44,
        maxWidth: 44,
        maxHeight: 44,
        padding: 0,
        fontSize: 20,
      },
      xs: {
        width: 44,
        height: 44,
        minWidth: 44,
        minHeight: 44,
        maxWidth: 44,
        maxHeight: 44,
        padding: 0,
        fontSize: 14,
      },
      xxs: {
        width: 44,
        height: 44,
        minWidth: 44,
        minHeight: 44,
        maxWidth: 44,
        maxHeight: 44,
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
