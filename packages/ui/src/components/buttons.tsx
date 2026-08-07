import { Button, styled } from 'tamagui';

const focusRing = {
  outlineWidth: 2,
  outlineColor: '$focusRing',
  outlineStyle: 'solid',
  outlineOffset: 2,
} as const;

const baseButton = {
  borderRadius: '$radiusControl',
  height: 40,
  minHeight: 40,
  paddingHorizontal: '$3.5',
  fontFamily: '$heading',
  fontWeight: '600',
  fontSize: 14,
  pressStyle: { opacity: 0.88, scale: 0.98 },
  focusVisibleStyle: focusRing,
  disabledStyle: { opacity: 0.45 },
} as const;

/** Labeled primary action — compact height, not a tall touch slab. */
export const PrimaryButton = styled(Button, {
  name: 'PrimaryButton',
  ...baseButton,
  backgroundColor: '$primary',
  color: '$primaryFg',
  borderWidth: 0,
  hoverStyle: { backgroundColor: '$primaryHover', opacity: 1 },
});

export const AccentButton = styled(Button, {
  name: 'AccentButton',
  ...baseButton,
  backgroundColor: '$accent',
  color: '$accentFg',
  borderWidth: 0,
  hoverStyle: { opacity: 0.92 },
});

/** Outlined labeled secondary — use IconButton for icon-only controls. */
export const GhostButton = styled(Button, {
  name: 'GhostButton',
  ...baseButton,
  backgroundColor: 'transparent',
  borderWidth: 1,
  borderColor: '$borderColor',
  color: '$color',
  fontFamily: '$body',
  hoverStyle: { backgroundColor: '$elevatedBg', borderColor: '$borderColorHover' },
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
  fontFamily: '$body',
  hoverStyle: { backgroundColor: '$elevatedBg' },
});
