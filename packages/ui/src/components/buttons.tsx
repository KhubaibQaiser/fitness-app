import { Button, styled } from 'tamagui';

const focusRing = {
  outlineWidth: 2,
  outlineColor: '$focusRing',
  outlineStyle: 'solid',
  outlineOffset: 2,
} as const;

const baseButton = {
  borderRadius: '$radiusControl',
  height: 48,
  minHeight: 48,
  paddingHorizontal: '$4',
  fontFamily: '$heading',
  fontWeight: '600',
  fontSize: 15,
  pressStyle: { opacity: 0.9, scale: 0.97 },
  focusVisibleStyle: focusRing,
  disabledStyle: { opacity: 0.4 },
} as const;

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
