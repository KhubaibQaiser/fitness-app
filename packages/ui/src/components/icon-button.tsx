import { Button, styled } from 'tamagui';

// Tamagui 3 takes state styles as flat clauses on each property, not focusVisibleStyle objects.
const focusRing = {
  outlineWidth: 'focus-visible:2',
  outlineColor: 'focus-visible:focusRing',
  outlineStyle: 'focus-visible:solid',
  outlineOffset: 'focus-visible:2',
} as const;

export const IconButton = styled(Button, {
  name: 'IconButton',
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
  backgroundColor: 'transparent hover:elevatedBg press:elevatedBg',
  borderWidth: 0,
  borderColor: 'transparent',
  color: 'textMuted',
  fontFamily: 'heading',
  fontWeight: '700',
  fontSize: 20,
  opacity: 'hover:1 press:1 disabled:0.4',
  scale: 'press:1',
  ...focusRing,
  variants: {
    tone: {
      ghost: {
        borderWidth: 1,
        borderColor: 'border-color hover:border-color-hover',
        backgroundColor: 'transparent hover:elevatedBg press:elevatedBg',
        opacity: 'press:1 disabled:0.4',
        scale: 'press:1',
      },
      bare: {
        borderWidth: 0,
      },
    },
    active: {
      true: {
        backgroundColor: 'primaryMuted hover:primaryMuted press:primaryMuted',
        color: 'primary',
        opacity: 'hover:1 press:0.92 disabled:0.4',
        scale: 'press:1',
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
