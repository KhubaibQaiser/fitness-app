import { Button, styled } from 'tamagui';

const focusRing = {
  outlineWidth: 2,
  outlineColor: '$focusRing',
  outlineStyle: 'solid',
  outlineOffset: 2,
} as const;

export const PrimaryButton = styled(Button, {
  name: 'PrimaryButton',
  backgroundColor: '$primary',
  color: '$primaryFg',
  borderRadius: '$radiusControl',
  minHeight: 48,
  paddingHorizontal: '$4',
  fontFamily: '$heading',
  fontWeight: '700',
  fontSize: 15,
  borderWidth: 0,
  hoverStyle: { backgroundColor: '$primaryHover', opacity: 1 },
  pressStyle: { opacity: 0.88, scale: 0.98 },
  focusVisibleStyle: focusRing,
  disabledStyle: { opacity: 0.45 },
});

export const AccentButton = styled(Button, {
  name: 'AccentButton',
  backgroundColor: '$accent',
  color: '$accentFg',
  borderRadius: '$radiusControl',
  minHeight: 48,
  paddingHorizontal: '$4',
  fontFamily: '$heading',
  fontWeight: '700',
  fontSize: 15,
  borderWidth: 0,
  hoverStyle: { opacity: 0.92 },
  pressStyle: { opacity: 0.88, scale: 0.98 },
  focusVisibleStyle: focusRing,
  disabledStyle: { opacity: 0.45 },
});

export const GhostButton = styled(Button, {
  name: 'GhostButton',
  backgroundColor: 'transparent',
  borderWidth: 1.5,
  borderColor: '$borderColor',
  color: '$color',
  borderRadius: '$radiusControl',
  minHeight: 48,
  paddingHorizontal: '$4',
  fontFamily: '$body',
  fontWeight: '600',
  fontSize: 14,
  hoverStyle: { backgroundColor: '$elevatedBg', borderColor: '$borderColorHover' },
  pressStyle: { opacity: 0.9, scale: 0.98 },
  focusVisibleStyle: focusRing,
  disabledStyle: { opacity: 0.45 },
});
