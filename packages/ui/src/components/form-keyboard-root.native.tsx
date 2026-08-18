'use client';

import type { ReactNode } from 'react';
import { KeyboardAvoidingView, Platform } from 'react-native';
import { YStack } from 'tamagui';

type FormKeyboardRootProps = {
  children: ReactNode;
  fill?: boolean;
  enabled?: boolean;
};

/**
 * iOS: pad the screen when the keyboard opens so Next-focused fields and the
 * sticky footer stay visible. Android uses `softwareKeyboardLayoutMode: resize`.
 */
export const FormKeyboardRoot = ({
  children,
  fill = false,
  enabled = true,
}: FormKeyboardRootProps) => {
  const body = (
    <YStack flex={fill ? 1 : undefined} width="100%" minHeight={fill ? 0 : undefined}>
      {children}
    </YStack>
  );

  if (!enabled || Platform.OS !== 'ios') return body;

  return (
    <KeyboardAvoidingView
      behavior="padding"
      style={fill ? { flex: 1, width: '100%' } : { width: '100%' }}
    >
      {body}
    </KeyboardAvoidingView>
  );
};
