import { Button, styled } from 'tamagui';

// Tamagui 3 takes state styles as flat clauses on each property, not pressStyle/hoverStyle objects.
const focusRing = {
  outlineWidth: 'focus-visible:2',
  outlineColor: 'focus-visible:focusRing',
  outlineStyle: 'focus-visible:solid',
  outlineOffset: 'focus-visible:2',
} as const;

/** Apple HIG: highlight in place. Never scale — shrinking a control feels like a game button. */
const pressWash = {
  backgroundColor: 'transparent hover:elevatedBg press:elevatedBg',
  opacity: 'press:1 disabled:0.4',
} as const;

const baseButton = {
  borderRadius: 999,
  height: 44,
  minHeight: 44,
  paddingHorizontal: '4',
  fontFamily: 'heading',
  fontWeight: '500',
  fontSize: 14,
  opacity: 'press:0.88 disabled:0.4',
  scale: 'press:1',
  ...focusRing,
  variants: {
    // Not `size`: Tamagui Button treats `size` as a font-size token and warns on "md".
    density: {
      sm: {
        minHeight: 44,
        height: 44,
        paddingHorizontal: '3',
        fontSize: 12,
      },
      md: {
        minHeight: 44,
        height: 44,
        paddingHorizontal: '4',
        fontSize: 14,
      },
      lg: {
        minHeight: 48,
        height: 48,
        paddingHorizontal: '5',
        fontSize: 16,
      },
    },
  },
  defaultVariants: {
    density: 'md',
  },
} as const;

export const PrimaryButton = styled(Button, {
  name: 'PrimaryButton',
  ...baseButton,
  backgroundColor: 'primary hover:primaryHover press:primaryHover',
  color: 'primaryFg',
  borderWidth: 0,
  opacity: 'hover:1 press:1 disabled:0.4',
});

export const AccentButton = styled(Button, {
  name: 'AccentButton',
  ...baseButton,
  backgroundColor: 'accent',
  color: 'accentFg',
  borderWidth: 0,
  opacity: 'hover:0.92 press:0.88 disabled:0.4',
});

export const GhostButton = styled(Button, {
  name: 'GhostButton',
  ...baseButton,
  ...pressWash,
  borderWidth: 0,
  color: 'textMuted',
  fontFamily: 'body',
});

export const DangerButton = styled(Button, {
  name: 'DangerButton',
  ...baseButton,
  backgroundColor: 'danger',
  color: 'dangerFg',
  borderWidth: 0,
  opacity: 'hover:0.9 press:0.88 disabled:0.4',
});

export const OutlineButton = styled(Button, {
  name: 'OutlineButton',
  ...baseButton,
  ...pressWash,
  borderWidth: 1,
  borderColor: 'border-color',
  color: 'color',
  fontFamily: 'heading',
});
