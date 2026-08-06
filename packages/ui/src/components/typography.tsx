import { styled, Text, XStack } from 'tamagui';

export const Title = styled(Text, {
  name: 'Title',
  fontFamily: '$heading',
  fontSize: 28,
  fontWeight: '800',
  letterSpacing: -0.6,
  color: '$color',
  lineHeight: 34,
});

export const Body = styled(Text, {
  name: 'Body',
  fontFamily: '$body',
  fontSize: 15,
  fontWeight: '500',
  color: '$color',
  lineHeight: 22,
});

export const Muted = styled(Text, {
  name: 'Muted',
  fontFamily: '$body',
  fontSize: 13,
  fontWeight: '500',
  color: '$textMuted',
  lineHeight: 18,
});

export const SectionTitle = styled(Text, {
  name: 'SectionTitle',
  fontFamily: '$heading',
  fontSize: 12,
  fontWeight: '700',
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
