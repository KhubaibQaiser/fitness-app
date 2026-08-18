'use client';

import { KeyboardAvoidingView, Platform } from 'react-native';
import { YStack } from 'tamagui';
import type { FormKeyboardRootProps } from './form-keyboard-root-types';

/**
 * iOS: pad the screen when the keyboard opens so Next-focused fields and the
 * sticky footer stay visible. Android uses `softwareKeyboardLayoutMode: resize`.
 * `asForm` is a web-only landmark and is ignored here.
 */
export const FormKeyboardRoot = ({
  children,
  fill = false,
  avoidKeyboard = false,
}: FormKeyboardRootProps) => {
  const body = (
    <YStack flex={fill ? 1 : undefined} width="100%" minHeight={fill ? 0 : undefined}>
      {children}
    </YStack>
  );

  if (!avoidKeyboard || Platform.OS !== 'ios') return body;

  return (
    <KeyboardAvoidingView
      behavior="padding"
      style={fill ? { flex: 1, width: '100%' } : { width: '100%' }}
    >
      {body}
    </KeyboardAvoidingView>
  );
};
