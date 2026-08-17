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
    width={44}
    height={44}
    minWidth={44}
    minHeight={44}
    borderRadius={999}
    backgroundColor="transparent"
    alignItems="center"
    justifyContent="center"
    cursor={disabled ? 'default' : 'pointer'}
    opacity={disabled ? 0.4 : 1}
    onPress={() => {
      if (!disabled) onCheckedChange(!checked);
    }}
  >
    <YStack
      width={44}
      height={24}
      borderRadius={999}
      backgroundColor={checked ? '$primary' : '$elevatedBg'}
      borderWidth={checked ? 0 : 1}
      borderColor="$borderColor"
      padding={2}
      justifyContent="center"
    >
      <YStack
        width={20}
        height={20}
        borderRadius={999}
        backgroundColor="$surface"
        x={checked ? 20 : 0}
        shadowColor="#000000"
        shadowOpacity={0.18}
        shadowRadius={2}
        shadowOffset={{ width: 0, height: 1 }}
      />
    </YStack>
  </YStack>
);
