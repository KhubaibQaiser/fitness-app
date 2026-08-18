'use client';

import type { CSSProperties, SyntheticEvent } from 'react';
import { YStack } from 'tamagui';
import type { FormKeyboardRootProps } from './form-keyboard-root-types';

/**
 * Web: optional real `<form>` so the page is a form landmark. Submit is still
 * owned by the last-field chain (`preventDefault` avoids Enter-in-field-3 submit).
 * Keyboard avoidance is a native concern — see `.native.tsx`.
 */
export const FormKeyboardRoot = ({
  children,
  fill = false,
  asForm = false,
}: FormKeyboardRootProps) => {
  if (!asForm) {
    return (
      <YStack flex={fill ? 1 : undefined} width="100%" minHeight={fill ? 0 : undefined}>
        {children}
      </YStack>
    );
  }

  const style: CSSProperties = {
    width: '100%',
    display: 'flex',
    flexDirection: 'column',
    ...(fill ? { flex: 1, minHeight: 0 } : {}),
  };

  const onSubmit = (event: SyntheticEvent<HTMLFormElement>) => {
    event.preventDefault();
  };

  return (
    <form onSubmit={onSubmit} noValidate style={style}>
      {children}
    </form>
  );
};
