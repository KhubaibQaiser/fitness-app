'use client';

import { useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Animated } from 'react-native';
import { Defs, LinearGradient, Path, Stop, Svg } from 'react-native-svg';
import { useTheme, YStack } from 'tamagui';

export type WeaveLineMode = 'splash' | 'loading' | 'idle' | 'lost-signal';

type WeaveLineProps = {
  id: string;
  mode?: WeaveLineMode;
  height?: number;
  coachVividness?: number;
  clientVividness?: number;
};

const CLIENT_PATH =
  'M0,20 C15,32 30,32 45,20 C60,8 75,8 90,20 C105,32 120,32 135,20 C150,8 165,8 180,20 C195,32 210,32 225,20 C240,8 255,8 270,20 C285,32 300,32 300,20';
const COACH_PATH =
  'M0,20 C15,8 30,8 45,20 C60,32 75,32 90,20 C105,8 120,8 135,20 C150,32 165,32 180,20 C195,8 210,8 225,20 C240,32 255,32 270,20 C285,8 300,8 300,20';

/** Over-estimate of the braid length — only drives the splash draw-in dash. */
const PATH_LENGTH = 380;
const DRAW_MS = 1200;
const PULSE_MS = 900;

const clamp = (value: number): number => Math.min(Math.max(value, 0), 1);

const easeOutCubic = (t: number): number => 1 - (1 - t) ** 3;

export const WeaveLine = ({
  id,
  mode = 'idle',
  height = 40,
  coachVividness = 1,
  clientVividness = 1,
}: WeaveLineProps) => {
  const theme = useTheme();
  const [reduceMotion, setReduceMotion] = useState(false);
  const [drawn, setDrawn] = useState(1);
  const pulse = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    let cancelled = false;
    void AccessibilityInfo.isReduceMotionEnabled().then((value) => {
      if (!cancelled) setReduceMotion(value);
    });
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduceMotion);
    return () => {
      cancelled = true;
      sub.remove();
    };
  }, []);

  // Splash: the threads draw themselves in once.
  useEffect(() => {
    if (mode !== 'splash' || reduceMotion) {
      setDrawn(1);
      return;
    }
    setDrawn(0);
    let frame: number | null = null;
    const start = Date.now();
    const tick = () => {
      const elapsed = Math.min(1, (Date.now() - start) / DRAW_MS);
      setDrawn(easeOutCubic(elapsed));
      if (elapsed < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => {
      if (frame !== null) cancelAnimationFrame(frame);
    };
  }, [mode, reduceMotion]);

  // Loading: the whole weave pulses, so per-side vividness still reads through.
  useEffect(() => {
    if (mode !== 'loading' || reduceMotion) {
      pulse.setValue(1);
      return;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 0.45, duration: PULSE_MS, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 1, duration: PULSE_MS, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [mode, pulse, reduceMotion]);

  const coachStart = String(theme.weaveStroke1?.val ?? '#0EA5E9');
  const coachEnd = String(theme.weaveStroke2?.val ?? '#2563EB');
  const clientStart = String(theme.clientWeaveStroke1?.val ?? '#FB923C');
  const clientEnd = String(theme.clientWeaveStroke2?.val ?? '#F43F5E');
  const lost = String(theme.textFaint?.val ?? '#A1A1AA');

  const coachOpacity = clamp(coachVividness);
  const clientOpacity = clamp(clientVividness);
  const dashOffset = PATH_LENGTH * (1 - drawn);
  const coachId = `weave-k-${id}`;
  const clientId = `weave-c-${id}`;

  if (mode === 'lost-signal') {
    return (
      <YStack
        width="100%"
        height={height}
        accessibilityRole="image"
        accessibilityLabel="Relationship signal lost"
      >
        <Svg viewBox="0 0 300 40" width="100%" height={height}>
          <Path d="M0,14 L300,14" stroke={lost} strokeWidth={2} fill="none" opacity={0.6} />
          <Path d="M0,26 L300,26" stroke={lost} strokeWidth={2} fill="none" opacity={0.6} />
        </Svg>
      </YStack>
    );
  }

  return (
    <YStack
      width="100%"
      height={height}
      accessibilityRole="image"
      accessibilityLabel="Coaching relationship weave"
    >
      <Animated.View style={{ opacity: pulse }}>
        <Svg viewBox="0 0 300 40" width="100%" height={height}>
          <Defs>
            <LinearGradient id={coachId} x1="0" y1="0" x2="1" y2="0">
              <Stop offset="0%" stopColor={coachStart} />
              <Stop offset="100%" stopColor={coachEnd} />
            </LinearGradient>
            <LinearGradient id={clientId} x1="0" y1="0" x2="1" y2="0">
              <Stop offset="0%" stopColor={clientStart} />
              <Stop offset="100%" stopColor={clientEnd} />
            </LinearGradient>
          </Defs>
          <Path
            d={COACH_PATH}
            stroke={`url(#${coachId})`}
            strokeWidth={2.5}
            fill="none"
            strokeLinecap="round"
            opacity={coachOpacity}
            strokeDasharray={PATH_LENGTH}
            strokeDashoffset={dashOffset}
          />
          <Path
            d={CLIENT_PATH}
            stroke={`url(#${clientId})`}
            strokeWidth={2.5}
            fill="none"
            strokeLinecap="round"
            opacity={clientOpacity}
            strokeDasharray={PATH_LENGTH}
            strokeDashoffset={dashOffset}
          />
        </Svg>
      </Animated.View>
    </YStack>
  );
};
