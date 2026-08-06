import { Text, XStack } from 'tamagui';

export type BadgeTone = 'danger' | 'warning' | 'success' | 'neutral' | 'primary';

const BADGE_BG: Record<BadgeTone, string> = {
  danger: '$danger',
  warning: '$warning',
  success: '$success',
  neutral: '$elevatedBg',
  primary: '$primary',
};

const BADGE_FG: Record<BadgeTone, string> = {
  danger: '$dangerFg',
  warning: '$warningFg',
  success: '$successFg',
  neutral: '$color',
  primary: '$primaryFg',
};

export const Badge = ({ tone = 'neutral', label }: { tone?: BadgeTone; label: string }) => (
  <XStack
    backgroundColor={BADGE_BG[tone]}
    borderRadius={999}
    paddingHorizontal="$2.5"
    paddingVertical="$1.5"
    alignSelf="flex-start"
    borderWidth={tone === 'neutral' ? 1 : 0}
    borderColor="$borderColor"
  >
    <Text
      fontFamily="$heading"
      color={BADGE_FG[tone]}
      fontSize={11}
      fontWeight="700"
      letterSpacing={0.4}
      textTransform="uppercase"
    >
      {label}
    </Text>
  </XStack>
);
