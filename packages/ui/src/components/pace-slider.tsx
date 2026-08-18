'use client';

import { useEffect, useId, useRef, useState } from 'react';
import type { GestureResponderEvent } from 'react-native';
import { Text, XStack, YStack } from 'tamagui';
import { Badge } from './badge';
import {
  kcalToT,
  nearestTickLabel,
  positionedTicks,
  stepKcal,
  tFromClientX,
  tToKcal,
} from './pace-slider-math';
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

type TrackNode = {
  measureInWindow?: (
    callback: (x: number, y: number, width: number, height: number) => void,
  ) => void;
  getBoundingClientRect?: () => { left: number; width: number };
  setPointerCapture?: (pointerId: number) => void;
  addEventListener?: (type: string, listener: (event: Event) => void) => void;
  removeEventListener?: (type: string, listener: (event: Event) => void) => void;
};

type PointerLike = {
  clientX?: number;
  pageX?: number;
  pointerId?: number;
  preventDefault?: () => void;
  currentTarget?: TrackNode;
  nativeEvent?: { clientX?: number; pageX?: number };
};

const TRACK_H = 6;
const THUMB = 22;
const HIT = 44;
const LABEL_W = 64;

const helperColor = (warning: PaceSliderWarning): string => {
  if (warning === 'floor') return '$alertText';
  if (warning === 'beyond') return '$milestoneText';
  if (warning === 'custom') return '$accentText';
  return '$textMuted';
};

const fillToken = (warning: PaceSliderWarning): string => {
  if (warning === 'floor') return '$alertText';
  if (warning === 'beyond') return '$milestoneFill';
  return '$accentText';
};

const clientXFromEvent = (event: Event): number | null => {
  if (!('clientX' in event)) return null;
  const { clientX } = event;
  return typeof clientX === 'number' ? clientX : null;
};

const pointerClientX = (event: PointerLike): number | null => {
  if (typeof event.clientX === 'number') return event.clientX;
  if (typeof event.nativeEvent?.clientX === 'number') return event.nativeEvent.clientX;
  if (typeof event.pageX === 'number') return event.pageX;
  if (typeof event.nativeEvent?.pageX === 'number') return event.nativeEvent.pageX;
  return null;
};

const pointerIdFromEvent = (event: Event): number | undefined => {
  if (!('pointerId' in event)) return undefined;
  const { pointerId } = event;
  return typeof pointerId === 'number' ? pointerId : undefined;
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
  const labelId = useId();
  const trackRef = useRef<TrackNode | null>(null);
  const draggingRef = useRef(false);
  const disabledRef = useRef(disabled);
  const applyRef = useRef<(clientX: number) => void>(() => undefined);
  const listenersRef = useRef<{ move: (event: Event) => void; up: () => void } | null>(null);
  const [host, setHost] = useState<TrackNode | null>(null);
  const [dragging, setDragging] = useState(false);
  disabledRef.current = disabled;

  const t = kcalToT(value, min, max, invert);
  const label = nearestTickLabel(value, ticks);
  const marks = positionedTicks(ticks, min, max, invert);
  const fill = fillToken(warning);
  const onSuggested =
    suggestedValue !== undefined && Math.abs(value - suggestedValue) <= 1 && warning === 'none';
  const recommendedStart = marks[0]?.t;
  const recommendedEnd = marks[marks.length - 1]?.t;

  applyRef.current = (clientX: number) => {
    const node = trackRef.current;
    if (node?.getBoundingClientRect !== undefined) {
      const rect = node.getBoundingClientRect();
      onChange(tToKcal(tFromClientX(clientX, rect.left, rect.width), min, max, invert));
      return;
    }
    if (node?.measureInWindow !== undefined) {
      node.measureInWindow((x, _y, width) => {
        onChange(tToKcal(tFromClientX(clientX, x, width), min, max, invert));
      });
    }
  };

  const detachWindow = () => {
    const listeners = listenersRef.current;
    if (listeners === null || typeof window === 'undefined') return;
    window.removeEventListener('pointermove', listeners.move);
    window.removeEventListener('pointerup', listeners.up);
    window.removeEventListener('pointercancel', listeners.up);
    listenersRef.current = null;
  };

  const attachWindow = () => {
    if (typeof window === 'undefined' || typeof window.addEventListener !== 'function') return;
    detachWindow();
    const move = (event: Event) => {
      if (!draggingRef.current) return;
      const clientX = clientXFromEvent(event);
      if (clientX === null) return;
      applyRef.current(clientX);
    };
    const up = () => {
      draggingRef.current = false;
      setDragging(false);
      detachWindow();
    };
    listenersRef.current = { move, up };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
    window.addEventListener('pointercancel', up);
  };

  const beginDrag = (
    clientX: number,
    pointerId: number | undefined,
    target: TrackNode | undefined,
  ) => {
    if (disabledRef.current) return;
    draggingRef.current = true;
    setDragging(true);
    applyRef.current(clientX);
    if (pointerId !== undefined) target?.setPointerCapture?.(pointerId);
    attachWindow();
  };

  const onPointerDown = (event: PointerLike) => {
    const clientX = pointerClientX(event);
    if (clientX === null) return;
    event.preventDefault?.();
    beginDrag(clientX, event.pointerId, event.currentTarget ?? trackRef.current ?? undefined);
  };

  const onResponderGrant = (event: GestureResponderEvent) => {
    beginDrag(event.nativeEvent.pageX, undefined, trackRef.current ?? undefined);
  };

  const onResponderMove = (event: GestureResponderEvent) => {
    applyRef.current(event.nativeEvent.pageX);
  };

  useEffect(() => {
    const node = host;
    if (node?.addEventListener === undefined) return undefined;
    const onDown = (event: Event) => {
      event.preventDefault();
      const clientX = clientXFromEvent(event);
      if (clientX === null) return;
      beginDrag(clientX, pointerIdFromEvent(event), node);
    };
    node.addEventListener('pointerdown', onDown);
    return () => {
      node.removeEventListener?.('pointerdown', onDown);
      detachWindow();
    };
  }, [host]);

  return (
    <YStack gap="$3" width="100%" opacity={disabled ? 0.45 : 1} overflow="visible">
      <YStack alignItems="center" gap="$1.5">
        <XStack alignItems="center" gap="$2" flexWrap="wrap" justifyContent="center">
          <Text
            id={labelId}
            fontFamily="$heading"
            fontWeight="600"
            fontSize={12}
            lineHeight={16}
            letterSpacing={0.6}
            textTransform="uppercase"
            color={helperColor(warning)}
          >
            {label}
          </Text>
          {onSuggested ? <Badge tone="accent" label="Suggested" /> : null}
          {warning === 'beyond' ? <Badge tone="milestone" label="Beyond recommended" /> : null}
          {warning === 'floor' ? <Badge tone="alert" label="Below calorie floor" /> : null}
          {warning === 'custom' ? <Badge tone="accent" label="Custom" /> : null}
        </XStack>
        <XStack alignItems="baseline" gap="$1.5" justifyContent="center">
          <Text
            fontFamily="$mono"
            fontSize={24}
            fontWeight="600"
            lineHeight={28}
            letterSpacing={-0.4}
            color={warning === 'floor' ? '$alertText' : '$color'}
          >
            {value.toLocaleString()}
          </Text>
          <Text fontFamily="$body" fontSize={13} lineHeight={18} color="$textMuted">
            kcal
          </Text>
        </XStack>
        {hint ? (
          <Muted fontSize={12} lineHeight={16}>
            {hint}
          </Muted>
        ) : null}
      </YStack>

      <YStack width="100%" gap="$2">
        <YStack
          ref={(node: TrackNode | null) => {
            trackRef.current = node;
            setHost((current) => (current === node ? current : node));
          }}
          width="100%"
          height={HIT}
          justifyContent="center"
          cursor={disabled ? 'default' : dragging ? 'grabbing' : 'grab'}
          userSelect="none"
          role="slider"
          aria-labelledby={labelId}
          aria-label={ariaLabel}
          aria-valuemin={min}
          aria-valuemax={max}
          aria-valuenow={value}
          aria-valuetext={`${label}, ${value} kilocalories`}
          aria-disabled={disabled}
          aria-orientation="horizontal"
          tabIndex={disabled ? -1 : 0}
          focusVisibleStyle={{
            outlineWidth: 2,
            outlineColor: '$focusRing',
            outlineStyle: 'solid',
            outlineOffset: 4,
          }}
          onStartShouldSetResponder={() => !disabled}
          onMoveShouldSetResponder={() => draggingRef.current}
          onResponderGrant={onResponderGrant}
          onResponderMove={onResponderMove}
          onResponderRelease={() => {
            draggingRef.current = false;
            setDragging(false);
            detachWindow();
          }}
          onPointerDown={onPointerDown}
          onPointerMove={(event: PointerLike) => {
            if (!draggingRef.current) return;
            const clientX = pointerClientX(event);
            if (clientX !== null) applyRef.current(clientX);
          }}
          onPointerUp={() => {
            draggingRef.current = false;
            setDragging(false);
            detachWindow();
          }}
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
          style={{ touchAction: 'none' }}
        >
          <YStack
            height={TRACK_H}
            width="100%"
            borderRadius={999}
            backgroundColor="$track"
            overflow="hidden"
            pointerEvents="none"
          >
            {recommendedStart !== undefined &&
            recommendedEnd !== undefined &&
            recommendedEnd - recommendedStart > 0.02 ? (
              <YStack
                position="absolute"
                left={`${Math.min(recommendedStart, recommendedEnd) * 100}%`}
                width={`${Math.abs(recommendedEnd - recommendedStart) * 100}%`}
                height={TRACK_H}
                backgroundColor="$accentWash"
              />
            ) : null}
            <YStack
              position="absolute"
              left={0}
              width={`${t * 100}%`}
              height={TRACK_H}
              backgroundColor={fill}
              borderRadius={999}
            />
          </YStack>

          {marks.map((mark) => (
            <YStack
              key={`${mark.label}-${mark.value}`}
              position="absolute"
              top={(HIT - 12) / 2}
              left={`${mark.t * 100}%`}
              width={2}
              height={12}
              marginLeft={-1}
              borderRadius={999}
              backgroundColor="$borderColor"
              pointerEvents="none"
            />
          ))}

          {suggestedValue !== undefined ? (
            <YStack
              position="absolute"
              top={(HIT - 16) / 2}
              left={`${kcalToT(suggestedValue, min, max, invert) * 100}%`}
              width={2}
              height={16}
              marginLeft={-1}
              borderRadius={999}
              backgroundColor="$accentText"
              pointerEvents="none"
            />
          ) : null}

          <YStack
            position="absolute"
            top={(HIT - THUMB) / 2}
            left={`${t * 100}%`}
            width={THUMB}
            height={THUMB}
            marginLeft={-THUMB / 2}
            borderRadius={999}
            backgroundColor="$surface"
            borderWidth={2}
            borderColor={fill}
            scale={dragging ? 1.06 : 1}
            shadowColor="rgba(15,23,42,0.18)"
            shadowOpacity={1}
            shadowRadius={dragging ? 8 : 4}
            shadowOffset={{ width: 0, height: dragging ? 3 : 1 }}
            pointerEvents="none"
          />
        </YStack>

        <YStack width="100%" height={20} position="relative">
          {marks.map((mark) => {
            const active = nearestTickLabel(value, ticks) === mark.label;
            return (
              <YStack
                key={`label-${mark.label}`}
                position="absolute"
                left={`${mark.t * 100}%`}
                width={LABEL_W}
                marginLeft={-LABEL_W / 2}
                alignItems="center"
                cursor={disabled ? 'default' : 'pointer'}
                onPress={() => {
                  if (!disabled) onChange(mark.value);
                }}
                hoverStyle={{ opacity: 0.8 }}
                zIndex={active ? 2 : 1}
              >
                <Text
                  fontFamily="$heading"
                  fontSize={11}
                  lineHeight={16}
                  fontWeight={active ? '600' : '500'}
                  color={active ? '$accentText' : '$textFaint'}
                  letterSpacing={0.2}
                >
                  {mark.label}
                </Text>
              </YStack>
            );
          })}
        </YStack>
      </YStack>

      {helper ? (
        <Text
          fontFamily="$body"
          fontSize={12}
          lineHeight={18}
          color={helperColor(warning)}
          textAlign="center"
        >
          {helper}
        </Text>
      ) : null}
    </YStack>
  );
};
