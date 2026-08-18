import { Button, styled } from 'tamagui';

const focusRing = {
  outlineWidth: 2,
  outlineColor: '$focusRing',
  outlineStyle: 'solid',
  outlineOffset: 2,
} as const;

/** Apple HIG: highlight in place. Never scale — shrinking a control feels like a game button. */
const pressHighlight = { opacity: 0.88, scale: 1 } as const;
const pressWash = { backgroundColor: '$elevatedBg', opacity: 1, scale: 1 } as const;

const baseButton = {
  borderRadius: 999,
  height: 44,
  minHeight: 44,
  paddingHorizontal: '$4',
  fontFamily: '$heading',
  fontWeight: '500',
  fontSize: 14,
  pressStyle: pressHighlight,
  focusVisibleStyle: focusRing,
  disabledStyle: { opacity: 0.4 },
  variants: {
    size: {
      sm: {
        minHeight: 44,
        height: 44,
        paddingHorizontal: '$3',
        fontSize: 12,
      },
      md: {
        minHeight: 44,
        height: 44,
        paddingHorizontal: '$4',
        fontSize: 14,
      },
      lg: {
        minHeight: 48,
        height: 48,
        paddingHorizontal: '$5',
        fontSize: 16,
      },
    },
  },
  defaultVariants: {
    size: 'md',
  },
} as const;

export const PrimaryButton = styled(Button, {
  name: 'PrimaryButton',
  ...baseButton,
  backgroundColor: '$primary',
  color: '$primaryFg',
  borderWidth: 0,
  hoverStyle: { backgroundColor: '$primaryHover', opacity: 1 },
  pressStyle: { backgroundColor: '$primaryHover', opacity: 1, scale: 1 },
});

export const AccentButton = styled(Button, {
  name: 'AccentButton',
  ...baseButton,
  backgroundColor: '$accent',
  color: '$accentFg',
  borderWidth: 0,
  hoverStyle: { opacity: 0.92 },
});

export const GhostButton = styled(Button, {
  name: 'GhostButton',
  ...baseButton,
  backgroundColor: 'transparent',
  borderWidth: 0,
  color: '$textMuted',
  fontFamily: '$body',
  hoverStyle: { backgroundColor: '$elevatedBg' },
  pressStyle: pressWash,
});

export const DangerButton = styled(Button, {
  name: 'DangerButton',
  ...baseButton,
  backgroundColor: '$danger',
  color: '$dangerFg',
  borderWidth: 0,
  hoverStyle: { opacity: 0.9 },
});

export const OutlineButton = styled(Button, {
  name: 'OutlineButton',
  ...baseButton,
  backgroundColor: 'transparent',
  borderWidth: 1,
  borderColor: '$borderColor',
  color: '$color',
  fontFamily: '$heading',
  hoverStyle: { backgroundColor: '$elevatedBg' },
  pressStyle: pressWash,
});
