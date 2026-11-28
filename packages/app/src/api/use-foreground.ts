'use client';

import { useSyncExternalStore } from 'react';

const subscribe = (onChange: () => void) => {
  document.addEventListener('visibilitychange', onChange);
  return () => {
    document.removeEventListener('visibilitychange', onChange);
  };
};

/** Web build: true while the tab is visible. See `use-foreground.native.ts` for native. */
export const useForeground = (): boolean =>
  useSyncExternalStore(
    subscribe,
    () => document.visibilityState !== 'hidden',
    () => true,
  );
