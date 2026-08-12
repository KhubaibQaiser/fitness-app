'use client';

import { YStack } from 'tamagui';

export const IosSwitch = ({
  checked,
  onCheckedChange,
  disabled = false,
  'aria-label': ariaLabel,
}: {
  checked: boolean;
  onCheckedChange: (next: boolean) => void;
  disabled?: boolean;
  'aria-label'?: string;
}) => (
  <YStack
    role="switch"
    aria-checked={checked}
    aria-label={ariaLabel}
    width={51}
    height={31}
    minWidth={51}
    minHeight={31}
    borderRadius={999}
    backgroundColor={checked ? '$primary' : '$elevatedBg'}
    borderWidth={checked ? 0 : 1}
    borderColor="$borderColor"
    padding={2}
    justifyContent="center"
    cursor={disabled ? 'default' : 'pointer'}
    opacity={disabled ? 0.4 : 1}
    onPress={() => {
      if (!disabled) onCheckedChange(!checked);
    }}
  >
    <YStack
      width={27}
      height={27}
      borderRadius={999}
      backgroundColor="#ffffff"
      x={checked ? 20 : 0}
      shadowColor="#000000"
      shadowOpacity={0.18}
      shadowRadius={2}
      shadowOffset={{ width: 0, height: 1 }}
    />
  </YStack>
);
