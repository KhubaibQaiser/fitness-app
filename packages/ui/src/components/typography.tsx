import { styled, Text, XStack } from 'tamagui';

export const Title = styled(Text, {
  name: 'Title',
  fontFamily: '$heading',
  fontSize: 24,
  fontWeight: '700',
  letterSpacing: -0.4,
  color: '$color',
  lineHeight: 30,
});

export const Body = styled(Text, {
  name: 'Body',
  fontFamily: '$body',
  fontSize: 15,
  fontWeight: '400',
  color: '$color',
  lineHeight: 22,
});

export const Muted = styled(Text, {
  name: 'Muted',
  fontFamily: '$body',
  fontSize: 13,
  fontWeight: '400',
  color: '$textMuted',
  lineHeight: 18,
});

export const SectionTitle = styled(Text, {
  name: 'SectionTitle',
  fontFamily: '$heading',
  fontSize: 11,
  fontWeight: '600',
  textTransform: 'uppercase',
  letterSpacing: 1.4,
  color: '$textMuted',
  marginTop: '$1',
});

export const Row = styled(XStack, {
  name: 'Row',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: '$3',
});
