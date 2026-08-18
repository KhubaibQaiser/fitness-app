'use client';

import { useId, useState } from 'react';
import type { GestureResponderEvent } from 'react-native';
import { Defs, LinearGradient, Rect, Stop, Svg } from 'react-native-svg';
import { Text, useTheme, XStack, YStack } from 'tamagui';
import { Badge } from './badge';
import { kcalToT, nearestTickLabel, stepKcal, tToKcal } from './pace-slider-math';
import { Muted } from './typography';

export type PaceSliderTone = 'deficit' | 'surplus' | 'neutral';
export type PaceSliderWarning = 'none' | 'custom' | 'beyond' | 'floor';

export type PaceSliderTick = {
  value: number;
  label: string;
};

type Props = {
  min: number;
  max: number;
  value: number;
  onChange: (value: number) => void;
  ticks: readonly PaceSliderTick[];
  suggestedValue?: number;
  tone?: PaceSliderTone;
  hint?: string;
  helper?: string;
  warning?: PaceSliderWarning;
  ariaLabel: string;
  disabled?: boolean;
};

const TRACK_H = 10;
const THUMB = 24;
const HIT = 44;

const helperColor = (warning: PaceSliderWarning): string => {
  if (warning === 'floor') return '$alertText';
  if (warning === 'beyond') return '$milestoneText';
  if (warning === 'custom') return '$accentText';
  return '$textMuted';
};

export const PaceSlider = ({
  min,
  max,
  value,
  onChange,
  ticks,
  suggestedValue,
  tone = 'deficit',
  hint,
  helper,
  warning = 'none',
  ariaLabel,
  disabled = false,
}: Props) => {
  const invert = tone === 'deficit';
  const gradientId = useId().replace(/:/g, '');
  const theme = useTheme();
  const [trackWidth, setTrackWidth] = useState(0);

  const t = kcalToT(value, min, max, invert);
  const label = nearestTickLabel(value, ticks);
  const onSuggested =
    suggestedValue !== undefined && Math.abs(value - suggestedValue) <= 1 && warning === 'none';

  const start = String(theme.gradientStart?.val ?? '#0EA5E9');
  const mid = String(theme.gradientEnd?.val ?? '#2563EB');
  const warn = String(theme.milestoneStroke1?.val ?? '#FBBF24');
  const danger = String(theme.alertText?.val ?? '#EF4444');
  const track = String(theme.track?.val ?? '#E4E4E7');

  const applyX = (locationX: number) => {
    if (disabled || trackWidth <= 0) return;
    const nextT = locationX / trackWidth;
    onChange(tToKcal(nextT, min, max, invert));
  };

  const onGrantOrMove = (event: GestureResponderEvent) => {
    applyX(event.nativeEvent.locationX);
  };

  const thumbLeft = trackWidth === 0 ? 0 : t * trackWidth - THUMB / 2;

  return (
    <YStack gap="$2" width="100%" opacity={disabled ? 0.45 : 1}>
      <YStack alignItems="center" gap="$1" minHeight={44}>
        <XStack alignItems="center" gap="$2">
          <Text fontFamily="$heading" fontWeight="600" fontSize={16} lineHeight={22} color="$color">
            {label}
          </Text>
          {onSuggested ? <Badge tone="accent" label="Suggested" /> : null}
          {warning === 'beyond' ? <Badge tone="milestone" label="Beyond recommended" /> : null}
          {warning === 'floor' ? <Badge tone="alert" label="Below calorie floor" /> : null}
        </XStack>
        {hint ? (
          <Text
            fontFamily="$mono"
            fontSize={12}
            lineHeight={16}
            fontWeight="500"
            color="$textMuted"
          >
            {hint}
          </Text>
        ) : null}
      </YStack>

      <YStack
        width="100%"
        height={HIT}
        justifyContent="center"
        cursor={disabled ? 'default' : 'pointer'}
        role="slider"
        aria-label={ariaLabel}
        aria-valuemin={min}
        aria-valuemax={max}
        aria-valuenow={value}
        aria-valuetext={`${label}, ${value} kilocalories`}
        aria-disabled={disabled}
        tabIndex={disabled ? -1 : 0}
        focusVisibleStyle={{
          outlineWidth: 2,
          outlineColor: '$focusRing',
          outlineStyle: 'solid',
        }}
        onLayout={(event) => {
          setTrackWidth(event.nativeEvent.layout.width);
        }}
        onStartShouldSetResponder={() => !disabled}
        onMoveShouldSetResponder={() => !disabled}
        onResponderGrant={onGrantOrMove}
        onResponderMove={onGrantOrMove}
        onKeyDown={(event: { key?: string; shiftKey?: boolean }) => {
          if (disabled) return;
          const key = event.key ?? '';
          const amount = event.shiftKey === true ? 50 : 10;
          if (key === 'ArrowRight' || key === 'ArrowUp') {
            onChange(stepKcal(value, min, max, invert, 1, amount));
          } else if (key === 'ArrowLeft' || key === 'ArrowDown') {
            onChange(stepKcal(value, min, max, invert, -1, amount));
          } else if (key === 'Home') {
            onChange(invert ? max : min);
          } else if (key === 'End') {
            onChange(invert ? min : max);
          }
        }}
      >
        {trackWidth > 0 ? (
          <Svg width={trackWidth} height={TRACK_H}>
            <Defs>
              <LinearGradient id={gradientId} x1="0" y1="0" x2="1" y2="0">
                {tone === 'neutral'
                  ? [
                      <Stop key="n0" offset="0%" stopColor={track} />,
                      <Stop key="n1" offset="100%" stopColor={mid} />,
                    ]
                  : [
                      <Stop key="d0" offset="0%" stopColor={start} />,
                      <Stop key="d1" offset="50%" stopColor={mid} />,
                      <Stop key="d2" offset="78%" stopColor={warn} />,
                      <Stop key="d3" offset="100%" stopColor={danger} />,
                    ]}
              </LinearGradient>
            </Defs>
            <Rect width={trackWidth} height={TRACK_H} rx={999} fill={`url(#${gradientId})`} />
          </Svg>
        ) : (
          <YStack height={TRACK_H} width="100%" borderRadius={999} backgroundColor="$track" />
        )}

        {suggestedValue !== undefined && trackWidth > 0 ? (
          <YStack
            position="absolute"
            left={kcalToT(suggestedValue, min, max, invert) * trackWidth - 5}
            width={10}
            height={10}
            borderRadius={2}
            backgroundColor="$accentText"
            transform={[{ rotate: '45deg' }]}
            pointerEvents="none"
          />
        ) : null}

        <YStack
          position="absolute"
          left={thumbLeft}
          width={THUMB}
          height={THUMB}
          borderRadius={999}
          backgroundColor="$surface"
          borderWidth={2}
          borderColor={
            warning === 'floor' ? '$alertText' : warning === 'beyond' ? '$warning' : '$accentText'
          }
          shadowColor="#000000"
          shadowOpacity={0.18}
          shadowRadius={2}
          shadowOffset={{ width: 0, height: 1 }}
          pointerEvents="none"
        />
      </YStack>

      <XStack justifyContent="space-between" paddingHorizontal="$1">
        {ticks.map((tick) => {
          const active = nearestTickLabel(value, ticks) === tick.label;
          return (
            <YStack
              key={tick.label}
              minHeight={44}
              minWidth={44}
              alignItems="center"
              justifyContent="center"
              cursor={disabled ? 'default' : 'pointer'}
              onPress={() => {
                if (!disabled) onChange(tick.value);
              }}
            >
              <Muted
                fontSize={12}
                lineHeight={16}
                fontWeight={active ? '600' : '500'}
                color={active ? '$accentText' : '$textFaint'}
              >
                {tick.label}
              </Muted>
            </YStack>
          );
        })}
      </XStack>

      {helper ? (
        <Text fontFamily="$body" fontSize={12} lineHeight={16} color={helperColor(warning)}>
          {helper}
        </Text>
      ) : null}
    </YStack>
  );
};
