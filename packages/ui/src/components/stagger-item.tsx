'use client';

import { useEffect, useRef, type ReactNode } from 'react';
import { Animated } from 'react-native';

export const StaggerItem = ({ children, index }: { children: ReactNode; index: number }) => {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(10)).current;

  useEffect(() => {
    const delay = Math.max(0, index) * 40;
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: 240,
        delay,
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: 0,
        duration: 240,
        delay,
        useNativeDriver: true,
      }),
    ]).start();
  }, [index, opacity, translateY]);

  return <Animated.View style={{ opacity, transform: [{ translateY }] }}>{children}</Animated.View>;
};
