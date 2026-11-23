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
  // Disabled 2026-11-24 (U3, Expo SDK 58): RN 0.88 deprecates InputAccessoryView with no core
  // replacement; it still works. Replace before the RN release that removes it (the 0.88 notes
  // point to react-native-keyboard-controller, a new dependency the owner has not approved).
  // eslint-disable-next-line @typescript-eslint/no-deprecated -- see the dated note above
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
