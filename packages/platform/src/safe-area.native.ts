import { useSafeAreaInsets as useRnaSafeAreaInsets } from 'react-native-safe-area-context';
import type { SafeAreaInsets } from './safe-area';

export type { SafeAreaInsets };

export const useSafeAreaInsets = (): SafeAreaInsets => {
  const insets = useRnaSafeAreaInsets();
  return {
    top: insets.top,
    right: insets.right,
    bottom: insets.bottom,
    left: insets.left,
  };
};
