import { Text, XStack } from 'tamagui';

export type BadgeTone =
  'danger' | 'warning' | 'success' | 'neutral' | 'primary' | 'accent' | 'milestone' | 'alert';

const BADGE_BG: Record<BadgeTone, string> = {
  danger: '$dangerMuted',
  warning: '$warningMuted',
  success: '$successMuted',
  neutral: '$elevatedBg',
  primary: '$primaryMuted',
  accent: '$primaryMuted',
  milestone: '$milestoneMuted',
  alert: '$dangerMuted',
};

const BADGE_FG: Record<BadgeTone, string> = {
  danger: '$danger',
  warning: '$warning',
  success: '$success',
  neutral: '$textMuted',
  primary: '$primary',
  accent: '$primary',
  milestone: '$milestoneText',
  alert: '$danger',
};

export const Badge = ({ tone = 'neutral', label }: { tone?: BadgeTone; label: string }) => (
  <XStack
    backgroundColor={BADGE_BG[tone]}
    borderRadius={999}
    paddingHorizontal="$2"
    paddingVertical="$0.5"
    alignSelf="flex-start"
    alignItems="center"
    gap="$1"
  >
    <Text
      fontFamily="$heading"
      color={BADGE_FG[tone]}
      fontSize={12}
      lineHeight={16}
      fontWeight="500"
    >
      {label}
    </Text>
  </XStack>
);
