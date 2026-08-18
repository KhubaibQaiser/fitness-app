'use client';

import { InputAccessoryView, Pressable } from 'react-native';
import { Text, XStack } from 'tamagui';
import type { KeyboardToolbarProps } from './keyboard-toolbar-types';

const ToolButton = ({
  label,
  onPress,
  disabled = false,
  bold = false,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  bold?: boolean;
}) => (
  <Pressable
    onPress={onPress}
    disabled={disabled}
    accessibilityRole="button"
    accessibilityLabel={label}
    accessibilityState={{ disabled }}
    hitSlop={8}
    style={{ minWidth: 44, minHeight: 44, justifyContent: 'center', paddingHorizontal: 8 }}
  >
    <Text
      color={disabled ? '$textMuted' : '$primary'}
      fontFamily="$heading"
      fontWeight={bold ? '700' : '500'}
      fontSize={16}
    >
      {label}
    </Text>
  </Pressable>
);

/** iOS decimal/number/phone pads have no return key — this is the Next/Done control. */
export const KeyboardToolbar = ({
  nativeID,
  canPrev,
  canNext,
  doneLabel,
  onPrev,
  onNext,
  onDone,
}: KeyboardToolbarProps) => (
  <InputAccessoryView nativeID={nativeID}>
    <XStack
      backgroundColor="$elevatedBg"
      borderTopWidth={1}
      borderTopColor="$borderColor"
      paddingHorizontal="$1"
      alignItems="center"
      justifyContent="space-between"
      minHeight={44}
    >
      <XStack>
        <ToolButton label="Previous" onPress={onPrev} disabled={!canPrev} />
        <ToolButton label="Next" onPress={onNext} disabled={!canNext} />
      </XStack>
      <ToolButton label={doneLabel} onPress={onDone} bold />
    </XStack>
  </InputAccessoryView>
);
