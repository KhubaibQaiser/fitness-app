'use client';

import type { CSSProperties, ReactNode, SyntheticEvent } from 'react';
import { YStack } from 'tamagui';

type FormKeyboardRootProps = {
  children: ReactNode;
  /** Stretch to fill a screen column (AppScreen). Auth cards leave this false. */
  fill?: boolean;
  /** When false, skip the `<form>` wrapper (non-form screens). */
  enabled?: boolean;
};

/**
 * Web: real `<form>` so Enter is a form event. Submit is still owned by the
 * last-field chain (`preventDefault` here avoids "Enter in field 3 submits").
 */
export const FormKeyboardRoot = ({
  children,
  fill = false,
  enabled = true,
}: FormKeyboardRootProps) => {
  if (!enabled) {
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
