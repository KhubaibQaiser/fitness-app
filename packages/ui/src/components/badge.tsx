import { Text, XStack } from 'tamagui';

export type BadgeTone = 'danger' | 'warning' | 'success' | 'neutral' | 'primary' | 'accent';

/** Soft muted chips (kit): muted surface + status text — not solid fills. */
const BADGE_BG: Record<BadgeTone, string> = {
  danger: '$dangerMuted',
  warning: '$warningMuted',
  success: '$successMuted',
  neutral: '$elevatedBg',
  primary: '$elevatedBg',
  accent: '$elevatedBg',
};

const BADGE_FG: Record<BadgeTone, string> = {
  danger: '$danger',
  warning: '$warning',
  success: '$success',
  neutral: '$textMuted',
  primary: '$primary',
  accent: '$accent',
};

export const Badge = ({ tone = 'neutral', label }: { tone?: BadgeTone; label: string }) => (
  <XStack
    backgroundColor={BADGE_BG[tone]}
    borderRadius={999}
    paddingHorizontal="$2"
    paddingVertical="$1"
    alignSelf="flex-start"
    alignItems="center"
    gap="$1"
  >
    <Text
      fontFamily="$heading"
      color={BADGE_FG[tone]}
      fontSize={11}
      fontWeight="600"
      letterSpacing={0.2}
    >
      {label}
    </Text>
  </XStack>
);
