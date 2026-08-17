import { Text, XStack } from 'tamagui';

type GoalTagProps = {
  goal: string;
};

export const GoalTag = ({ goal }: GoalTagProps) => (
  <XStack
    alignSelf="flex-start"
    alignItems="center"
    maxWidth="100%"
    backgroundColor="$elevatedBg"
    borderRadius={999}
    paddingHorizontal="$2"
    paddingVertical="$0.5"
    accessibilityLabel={`Goal: ${goal}`}
  >
    <Text
      color="$textMuted"
      fontFamily="$heading"
      fontSize={12}
      lineHeight={16}
      fontWeight="500"
      numberOfLines={1}
    >
      {goal}
    </Text>
  </XStack>
);
