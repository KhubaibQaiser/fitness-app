/**
 * Safe-area insets for shell chrome. Web returns zeros; native uses
 * react-native-safe-area-context via `.native` split.
 */
export type SafeAreaInsets = {
  top: number;
  right: number;
  bottom: number;
  left: number;
};

export const useSafeAreaInsets = (): SafeAreaInsets => ({
  top: 0,
  right: 0,
  bottom: 0,
  left: 0,
});
