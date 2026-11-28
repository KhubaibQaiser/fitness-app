import { useSyncExternalStore } from 'react';
import { AppState } from 'react-native';

const subscribe = (onChange: () => void) => {
  const subscription = AppState.addEventListener('change', onChange);
  return () => {
    subscription.remove();
  };
};

/** Native build: true unless the app is in the background. See `use-foreground.ts` for web. */
export const useForeground = (): boolean =>
  useSyncExternalStore(
    subscribe,
    () => AppState.currentState !== 'background',
    () => true,
  );
