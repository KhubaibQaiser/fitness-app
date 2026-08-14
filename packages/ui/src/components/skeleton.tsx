'use client';

import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type ComponentProps,
  type ReactNode,
} from 'react';
import { AccessibilityInfo, Animated } from 'react-native';
import { YStack } from 'tamagui';

const PulseContext = createContext<Animated.Value | null>(null);

const useReduceMotion = (enabled: boolean) => {
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    const sync = (value: boolean) => {
      if (!cancelled) setReduceMotion(value);
    };
    void AccessibilityInfo.isReduceMotionEnabled().then(sync);
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', sync);
    return () => {
      cancelled = true;
      sub.remove();
    };
  }, [enabled]);

  return reduceMotion;
};

const usePulseLoop = (opacity: Animated.Value, active: boolean) => {
  const reduceMotion = useReduceMotion(active);

  useEffect(() => {
    if (!active) return;
    if (reduceMotion) {
      opacity.setValue(0.7);
      return;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 1,
          duration: 750,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0.45,
          duration: 750,
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [active, opacity, reduceMotion]);
};

const usePulseOpacity = (): Animated.Value => {
  const shared = useContext(PulseContext);
  const local = useRef(new Animated.Value(0.55)).current;
  usePulseLoop(local, shared === null);
  return shared ?? local;
};

/** One pulse drives every bone in the region — cheaper than per-bone loops. */
export const SkeletonRegion = ({
  children,
  label = 'Loading',
  gap,
}: {
  children: ReactNode;
  label?: string;
  gap?: ComponentProps<typeof YStack>['gap'];
}) => {
  const opacity = useRef(new Animated.Value(0.55)).current;
  usePulseLoop(opacity, true);

  return (
    <PulseContext.Provider value={opacity}>
      <YStack width="100%" gap={gap} role="status" aria-busy aria-live="polite" aria-label={label}>
        {children}
      </YStack>
    </PulseContext.Provider>
  );
};

type SkeletonProps = {
  width?: number | `${number}%`;
  height?: number;
  borderRadius?: number | '$radiusControl' | '$radiusCard';
  flex?: number;
  children?: ReactNode;
};

/** Pulsing bone. Pass children to size the bone to real chrome (chips, buttons). */
export const Skeleton = ({
  width,
  height,
  borderRadius = '$radiusControl',
  flex,
  children,
}: SkeletonProps) => {
  const opacity = usePulseOpacity();

  return (
    <Animated.View
      style={{
        opacity,
        ...(flex !== undefined ? { flex } : null),
        ...(width === '100%' ? { width: '100%' as const } : null),
        ...(children !== undefined ? { alignSelf: 'flex-start' as const } : null),
      }}
    >
      {children ?? (
        <YStack
          width={width}
          height={height}
          borderRadius={borderRadius}
          backgroundColor="$elevatedBg"
          flex={flex}
        />
      )}
    </Animated.View>
  );
};

export const SkeletonCircle = ({ size }: { size: number }) => (
  <Skeleton width={size} height={size} borderRadius={999} />
);
