import { Button, Spinner, styled, Text, XStack, YStack } from 'tamagui';

/** Shared primitives — features compose ONLY these + tamagui components. */

export const Screen = styled(YStack, {
  flex: 1,
  backgroundColor: '$screenBg',
  paddingHorizontal: '$4',
  paddingTop: '$4',
  paddingBottom: 96, // clears the bottom tab bar in the thumb zone
  gap: '$3',
  maxWidth: 760,
  width: '100%',
  alignSelf: 'center',
});

export const Card = styled(YStack, {
  backgroundColor: '$cardBg',
  borderRadius: '$6',
  padding: '$4',
  gap: '$2',
  elevation: 1,
  shadowColor: 'rgba(0,0,0,0.08)',
  shadowRadius: 8,
  shadowOffset: { width: 0, height: 2 },
});

export const SectionTitle = styled(Text, {
  fontSize: 13,
  fontWeight: '700',
  textTransform: 'uppercase',
  letterSpacing: 1,
  color: '$textMuted',
  marginTop: '$2',
});

export const Title = styled(Text, {
  fontSize: 24,
  fontWeight: '800',
  color: '$color',
});

export const Body = styled(Text, {
  fontSize: 15,
  color: '$color',
});

export const Muted = styled(Text, {
  fontSize: 13,
  color: '$textMuted',
});

export const PrimaryButton = styled(Button, {
  backgroundColor: '$primary',
  color: '$primaryFg',
  borderRadius: '$5',
  minHeight: 48, // ≥44pt touch target
  fontWeight: '700',
  pressStyle: { opacity: 0.85 },
});

export const GhostButton = styled(Button, {
  backgroundColor: 'transparent',
  borderWidth: 1,
  borderColor: '$borderColor',
  color: '$color',
  borderRadius: '$5',
  minHeight: 48,
});

type BadgeTone = 'danger' | 'warning' | 'success' | 'neutral';

const BADGE_BG = {
  danger: '$danger',
  warning: '$warning',
  success: '$success',
  neutral: '$textMuted',
} as const;

export const Badge = ({ tone = 'neutral', label }: { tone?: BadgeTone; label: string }) => (
  <XStack
    backgroundColor={BADGE_BG[tone]}
    borderRadius="$10"
    paddingHorizontal="$2.5"
    paddingVertical="$1"
    alignSelf="flex-start"
  >
    <Text color="white" fontSize={11} fontWeight="700">
      {label}
    </Text>
  </XStack>
);

export const Row = styled(XStack, {
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: '$3',
});

export const LoadingState = ({ label = 'Loading…' }: { label?: string }) => (
  <YStack flex={1} alignItems="center" justifyContent="center" gap="$3" paddingVertical="$8">
    <Spinner size="large" color="$primary" />
    <Muted>{label}</Muted>
  </YStack>
);

export const EmptyState = ({
  title,
  hint,
  action,
}: {
  title: string;
  hint?: string;
  action?: React.ReactNode;
}) => (
  <Card alignItems="center" paddingVertical="$8" gap="$3">
    <Title fontSize={18}>{title}</Title>
    {hint ? <Muted textAlign="center">{hint}</Muted> : null}
    {action}
  </Card>
);

export const ErrorState = ({ message, retry }: { message: string; retry?: () => void }) => (
  <Card alignItems="center" paddingVertical="$6" gap="$3" borderColor="$danger" borderWidth={1}>
    <Body color="$danger" textAlign="center">
      {message}
    </Body>
    {retry ? <GhostButton onPress={retry}>Try again</GhostButton> : null}
  </Card>
);

export const StatPill = ({ label, value }: { label: string; value: string }) => (
  <YStack
    backgroundColor="$cardBg"
    borderRadius="$5"
    paddingHorizontal="$3"
    paddingVertical="$2"
    alignItems="center"
    flex={1}
    gap="$0.5"
  >
    <Text fontSize={18} fontWeight="800" color="$color">
      {value}
    </Text>
    <Muted fontSize={11}>{label}</Muted>
  </YStack>
);

/** Toward/away-from-goal semantic delta chip (down is good on a cut). */
export const DeltaChip = ({
  delta,
  goodDirection,
  unit,
}: {
  delta: number;
  goodDirection: 'down' | 'up';
  unit: string;
}) => {
  const isGood = goodDirection === 'down' ? delta <= 0 : delta >= 0;
  const arrow = delta === 0 ? '—' : delta > 0 ? '▲' : '▼';
  return (
    <XStack
      backgroundColor={isGood ? '$success' : '$danger'}
      borderRadius="$10"
      paddingHorizontal="$2.5"
      paddingVertical="$1"
      opacity={0.92}
    >
      <Text color="white" fontSize={12} fontWeight="700">
        {arrow} {Math.abs(delta).toFixed(1)} {unit}
      </Text>
    </XStack>
  );
};
