'use client';

import { useEffect, useRef, type ReactNode } from 'react';
import { Animated } from 'react-native';

export const FadeIn = ({
  children,
  visible = true,
  delay = 0,
}: {
  children: ReactNode;
  visible?: boolean;
  delay?: number;
}) => {
  const opacity = useRef(new Animated.Value(visible ? 1 : 0)).current;
  const translateY = useRef(new Animated.Value(visible ? 0 : 8)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: visible ? 1 : 0,
        duration: 220,
        delay,
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: visible ? 0 : -4,
        duration: 220,
        delay,
        useNativeDriver: true,
      }),
    ]).start();
  }, [delay, opacity, translateY, visible]);

  return (
    <Animated.View style={{ opacity, transform: [{ translateY }] }}>
      {visible ? children : null}
    </Animated.View>
  );
};
