import { Text, YStack } from 'tamagui';

type StatPillProps = {
  label: string;
  value: string | number;
  suffix?: string;
};

export const StatPill = ({ label, value, suffix = '' }: StatPillProps) => (
  <YStack
    width="100%"
    minWidth={0}
    gap="$1"
    backgroundColor="$surface"
    borderWidth={1}
    borderColor="$borderColor"
    borderRadius={12}
    paddingHorizontal="$3"
    paddingVertical="$2.5"
    shadowColor="rgba(0,0,0,0.06)"
    shadowOffset={{ width: 0, height: 1 }}
    shadowRadius={3}
    shadowOpacity={1}
    accessibilityLabel={`${label}: ${value}${suffix}`}
  >
    <Text color="$textMuted" fontFamily="$body" fontSize={12} lineHeight={16} numberOfLines={1}>
      {label}
    </Text>
    <Text
      color="$color"
      fontFamily="$mono"
      fontSize={18}
      lineHeight={24}
      fontWeight="600"
      numberOfLines={1}
    >
      {value}
      {suffix}
    </Text>
  </YStack>
);
