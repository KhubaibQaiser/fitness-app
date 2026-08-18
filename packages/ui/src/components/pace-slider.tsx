'use client';

import { useEffect, useId, useRef, useState } from 'react';
import type { GestureResponderEvent } from 'react-native';
import { Text, useTheme, XStack, YStack } from 'tamagui';
import { AlertTriangle, Info } from '../icons';
import { Badge } from './badge';
import { HitTarget } from './hit-target';
import {
  kcalToT,
  nearestTickLabel,
  positionedTicks,
  snapToTick,
  statusPillLabel,
  statusPillTone,
  stepKcal,
  tFromClientX,
  tToKcal,
  type PaceSliderWarning,
} from './pace-slider-math';
import { Muted } from './typography';

export type { PaceSliderWarning };
export type PaceSliderTone = 'deficit' | 'surplus' | 'neutral';

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
  warning?: PaceSliderWarning;
  floor?: number;
  compact?: boolean;
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

const TRACK_H = 8;
const THUMB = 20;
const HIT = 44;
const MARKER = 28;
const OVERLAY = 48;
const CAPTION_MIN = 40;

const fillToken = (warning: PaceSliderWarning): string => {
  if (warning === 'floor') return '$alertText';
  if (warning === 'beyond') return '$milestoneFill';
  return '$accentText';
};

const valueColor = (warning: PaceSliderWarning): string => {
  if (warning === 'floor') return '$alertText';
  if (warning === 'beyond') return '$milestoneText';
  return '$color';
};

const captionColor = (warning: PaceSliderWarning): string => {
  if (warning === 'floor') return '$alertText';
  if (warning === 'beyond') return '$milestoneText';
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

const extremeTickLabel = (ticks: readonly PaceSliderTick[], invert: boolean): string => {
  const first = ticks[0];
  if (first === undefined) return '';
  let best = first;
  for (const tick of ticks) {
    if (invert ? tick.value < best.value : tick.value > best.value) best = tick;
  }
  return best.label;
};

const tickTooltipId = (kcal: number): string => `tick:${kcal}`;
const floorTooltipId = (kcal: number): string => `floor:${kcal}`;

const tooltipKcal = (id: string): number | null => {
  const kcal = Number(id.slice(id.indexOf(':') + 1));
  return Number.isFinite(kcal) ? kcal : null;
};

const isMarkerEventTarget = (target: EventTarget | null): boolean => {
  if (target === null || typeof Element === 'undefined' || typeof Node === 'undefined')
    return false;
  const el =
    target instanceof Element ? target : target instanceof Node ? target.parentElement : null;
  if (el === null) return false;
  return el.closest('[data-pace-marker], [id^="pace-marker-"]') !== null;
};

const blurActiveElement = (): void => {
  if (typeof document === 'undefined') return;
  const active = document.activeElement;
  if (active instanceof HTMLElement) active.blur();
};

const TickTooltip = ({
  pct,
  label,
  sublabel,
}: {
  pct: number;
  label: string;
  sublabel?: string;
}) => (
  <YStack
    position="absolute"
    left={`${pct}%`}
    top={OVERLAY + HIT / 2}
    x="-50%"
    alignItems="center"
    pointerEvents="none"
    zIndex={20}
  >
    <YStack
      position="absolute"
      bottom="100%"
      marginBottom={10}
      alignItems="center"
      pointerEvents="none"
    >
      <YStack
        backgroundColor="$color"
        paddingHorizontal={10}
        paddingVertical={6}
        borderRadius={10}
        width="max-content"
        maxWidth={240}
        shadowColor="rgba(0,0,0,0.18)"
        shadowOpacity={1}
        shadowRadius={16}
        shadowOffset={{ width: 0, height: 8 }}
      >
        <Text
          fontFamily="$heading"
          fontSize={12}
          lineHeight={16}
          fontWeight="600"
          color="$surface"
          letterSpacing={0.1}
          whiteSpace="nowrap"
          numberOfLines={1}
        >
          {sublabel !== undefined ? `${label}  ·  ${sublabel}` : label}
        </Text>
      </YStack>
      <YStack width={8} height={8} marginTop={-4} backgroundColor="$color" rotate="45deg" />
    </YStack>
  </YStack>
);

const TrackMarker = ({
  pct,
  label,
  sublabel,
  colorHex,
  active,
  open,
  tall,
  disabled,
  markerDomId,
  onOpen,
  onClose,
  onPin,
  onUnpin,
  onActivate,
  onSlideStart,
}: {
  pct: number;
  label: string;
  sublabel?: string;
  colorHex: string;
  active: boolean;
  open: boolean;
  tall?: boolean;
  disabled: boolean;
  markerDomId: string;
  onOpen: () => void;
  onClose: () => void;
  onPin: () => void;
  onUnpin: () => void;
  onActivate?: () => void;
  onSlideStart: (clientX: number, pointerId: number | undefined) => void;
}) => (
  <HitTarget
    id={markerDomId}
    {...{ 'data-pace-marker': 'true' }}
    position="absolute"
    left={`${pct}%`}
    top="50%"
    width={MARKER}
    height={MARKER}
    marginLeft={-MARKER / 2}
    marginTop={-MARKER / 2}
    alignItems="center"
    justifyContent="center"
    overflow="hidden"
    pointerEvents="auto"
    cursor={onActivate !== undefined && !disabled ? 'pointer' : 'default'}
    role="button"
    tabIndex={disabled ? -1 : 0}
    aria-label={sublabel !== undefined ? `${label}, ${sublabel}` : label}
    focusVisibleStyle={{
      outlineWidth: 2,
      outlineColor: '$focusRing',
      outlineStyle: 'solid',
      outlineOffset: 1,
    }}
    onMouseEnter={onOpen}
    onMouseLeave={onClose}
    onFocus={onPin}
    onBlur={onUnpin}
    onStartShouldSetResponder={() => false}
    onPointerDown={(event: PointerLike) => {
      const clientX = pointerClientX(event);
      if (clientX === null) {
        onPin();
        return;
      }
      event.preventDefault?.();
      onSlideStart(clientX, event.pointerId);
    }}
    onPress={() => {
      if (disabled) return;
      onActivate?.();
      onPin();
    }}
  >
    <YStack
      width={tall === true ? 3 : 2}
      height={tall === true ? 16 : 12}
      borderRadius={999}
      backgroundColor={colorHex}
      opacity={tall === true ? 0.55 : active || open ? 0.95 : 0.6}
    />
  </HitTarget>
);

export const PaceSlider = ({
  min,
  max,
  value,
  onChange,
  ticks,
  suggestedValue,
  tone = 'deficit',
  hint,
  warning = 'none',
  floor,
  compact = false,
  ariaLabel,
  disabled = false,
}: Props) => {
  const invert = tone === 'deficit';
  const labelId = useId();
  const theme = useTheme();
  const trackRef = useRef<TrackNode | null>(null);
  const draggingRef = useRef(false);
  const disabledRef = useRef(disabled);
  const applyRef = useRef<(clientX: number) => void>(() => undefined);
  const listenersRef = useRef<{ move: (event: Event) => void; up: () => void } | null>(null);
  const hoveringTooltipIdRef = useRef<string | null>(null);
  const skipNextPressRef = useRef(false);
  const [host, setHost] = useState<TrackNode | null>(null);
  const [dragging, setDragging] = useState(false);
  const [tooltipId, setTooltipId] = useState<string | null>(null);
  disabledRef.current = disabled;

  const openTooltip = (id: string) => {
    hoveringTooltipIdRef.current = id;
    setTooltipId(id);
  };

  const closeTooltip = (id: string) => {
    if (hoveringTooltipIdRef.current === id) hoveringTooltipIdRef.current = null;
    setTooltipId((current) => (current === id ? null : current));
  };

  const pinTooltip = (id: string) => {
    setTooltipId(id);
  };

  const unpinTooltip = (id: string) => {
    if (hoveringTooltipIdRef.current === id) return;
    setTooltipId((current) => (current === id ? null : current));
  };

  const dismissTooltip = () => {
    hoveringTooltipIdRef.current = null;
    setTooltipId(null);
  };

  const t = kcalToT(value, min, max, invert);
  const label = nearestTickLabel(value, ticks);
  const marks = positionedTicks(ticks, min, max, invert);
  const fill = fillToken(warning);
  const onSuggested =
    suggestedValue !== undefined && Math.abs(value - suggestedValue) <= 1 && warning === 'none';
  const pill = statusPillLabel(warning, label, onSuggested);
  const faintHex = String(theme.textFaint?.val ?? '#A1A1AA');
  const dangerHex = String(theme.alertText?.val ?? '#EF4444');
  const floorMark =
    floor !== undefined && floor >= Math.min(min, max) && floor <= Math.max(min, max)
      ? floor
      : null;
  const aggressiveLabel = extremeTickLabel(ticks, invert);

  applyRef.current = (clientX: number) => {
    const commit = (raw: number) => {
      onChange(snapToTick(raw, ticks, min, max));
    };
    const node = trackRef.current;
    if (node?.getBoundingClientRect !== undefined) {
      const rect = node.getBoundingClientRect();
      commit(tToKcal(tFromClientX(clientX, rect.left, rect.width), min, max, invert));
      return;
    }
    if (node?.measureInWindow !== undefined) {
      node.measureInWindow((x, _y, width) => {
        commit(tToKcal(tFromClientX(clientX, x, width), min, max, invert));
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
      endDrag();
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
    skipNextPressRef.current = true;
    setDragging(true);
    blurActiveElement();
    dismissTooltip();
    applyRef.current(clientX);
    if (pointerId !== undefined) target?.setPointerCapture?.(pointerId);
    attachWindow();
  };

  const endDrag = () => {
    draggingRef.current = false;
    setDragging(false);
    detachWindow();
    setTimeout(() => {
      skipNextPressRef.current = false;
    }, 0);
  };

  const startSlideFromMarker = (clientX: number, pointerId: number | undefined) => {
    beginDrag(clientX, pointerId, trackRef.current ?? undefined);
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

  useEffect(() => {
    const onPointerDownAway = (event: Event) => {
      if (isMarkerEventTarget(event.target)) return;
      dismissTooltip();
      blurActiveElement();
    };
    if (typeof window === 'undefined' || typeof window.addEventListener !== 'function') {
      return undefined;
    }
    window.addEventListener('pointerdown', onPointerDownAway);
    return () => {
      window.removeEventListener('pointerdown', onPointerDownAway);
    };
  }, []);

  useEffect(() => {
    if (tooltipId === null) return;
    if (hoveringTooltipIdRef.current === tooltipId) return;
    const kcal = tooltipKcal(tooltipId);
    if (kcal !== null && kcal !== value) setTooltipId(null);
  }, [tooltipId, value]);

  const caption =
    warning === 'floor'
      ? floor !== undefined
        ? `Below the ${floor.toLocaleString()} kcal minimum for this client — not recommended.`
        : 'Below the calorie minimum for this client — not recommended.'
      : warning === 'beyond'
        ? aggressiveLabel === ''
          ? 'Beyond the recommended pace — review with the client.'
          : `Beyond the recommended ${aggressiveLabel} pace — review with the client.`
        : onSuggested
          ? 'Suggested for this goal.'
          : null;

  const tooltipMarker = ((): { pct: number; label: string; sublabel: string } | null => {
    if (dragging || tooltipId === null) return null;
    const tick = marks.find((mark) => tickTooltipId(mark.value) === tooltipId);
    if (tick !== undefined) {
      return {
        pct: tick.t * 100,
        label: tick.label,
        sublabel:
          suggestedValue !== undefined && Math.abs(tick.value - suggestedValue) <= 1
            ? 'Suggested'
            : `${tick.value.toLocaleString()} kcal`,
      };
    }
    if (floorMark !== null && tooltipId === floorTooltipId(floorMark)) {
      return {
        pct: kcalToT(floorMark, min, max, invert) * 100,
        label: 'Calorie floor',
        sublabel: `${floorMark.toLocaleString()} kcal minimum`,
      };
    }
    return null;
  })();

  return (
    <YStack
      width="100%"
      backgroundColor="$surface"
      borderWidth={1}
      borderColor="$borderColor"
      borderRadius={16}
      padding={compact ? '$4' : '$6'}
      opacity={disabled ? 0.45 : 1}
      overflow="visible"
      onPointerDown={(event: { target?: EventTarget }) => {
        if (isMarkerEventTarget(event.target ?? null)) return;
        dismissTooltip();
      }}
    >
      <XStack
        alignItems="center"
        justifyContent="space-between"
        gap="$2"
        marginBottom="$1"
        minHeight={28}
        flexWrap="nowrap"
      >
        <Text
          id={labelId}
          fontFamily="$heading"
          fontWeight="600"
          fontSize={14}
          lineHeight={20}
          color="$color"
        >
          Pace
        </Text>
        {pill !== '' ? <Badge tone={statusPillTone(warning)} label={pill} /> : null}
      </XStack>

      <XStack alignItems="baseline" gap="$1.5" minHeight={compact ? 28 : 40} marginBottom="$0.5">
        <Text
          fontFamily="$mono"
          fontSize={compact ? 24 : 36}
          fontWeight={compact ? '600' : '700'}
          lineHeight={compact ? 28 : 40}
          letterSpacing={-0.4}
          color={valueColor(warning)}
        >
          {value.toLocaleString()}
        </Text>
        <Text fontFamily="$body" fontSize={14} lineHeight={20} color="$textMuted">
          kcal
        </Text>
      </XStack>
      <Muted fontSize={14} lineHeight={20} marginBottom="$5" minHeight={20}>
        {hint ?? ' '}
      </Muted>

      <YStack width="100%" height={HIT + OVERLAY} position="relative" marginBottom="$4">
        <YStack
          ref={(node: TrackNode | null) => {
            trackRef.current = node;
            setHost((current) => (current === node ? current : node));
          }}
          width="100%"
          height={HIT}
          marginTop={OVERLAY}
          justifyContent="center"
          cursor={disabled ? 'default' : dragging ? 'grabbing' : 'grab'}
          userSelect="none"
          role="slider"
          aria-labelledby={labelId}
          aria-label={ariaLabel}
          aria-valuemin={min}
          aria-valuemax={max}
          aria-valuenow={value}
          aria-valuetext={`${value.toLocaleString()} kilocalories${hint !== undefined ? `, ${hint}` : ''}`}
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
          onResponderRelease={endDrag}
          onPointerDown={onPointerDown}
          onPointerMove={(event: PointerLike) => {
            if (!draggingRef.current) return;
            const clientX = pointerClientX(event);
            if (clientX !== null) applyRef.current(clientX);
          }}
          onPointerUp={endDrag}
          onKeyDown={(event: { key?: string; shiftKey?: boolean; preventDefault?: () => void }) => {
            if (disabled) return;
            const key = event.key ?? '';
            const amount = event.shiftKey === true ? 100 : 25;
            if (key === 'ArrowRight' || key === 'ArrowUp') {
              event.preventDefault?.();
              onChange(stepKcal(value, min, max, invert, 1, amount));
            } else if (key === 'ArrowLeft' || key === 'ArrowDown') {
              event.preventDefault?.();
              onChange(stepKcal(value, min, max, invert, -1, amount));
            } else if (key === 'Home') {
              event.preventDefault?.();
              onChange(invert ? max : min);
            } else if (key === 'End') {
              event.preventDefault?.();
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
            <YStack
              position="absolute"
              left={0}
              width={`${t * 100}%`}
              height={TRACK_H}
              backgroundColor={fill}
              borderRadius={999}
            />
          </YStack>

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
            shadowColor="rgba(15,23,42,0.18)"
            shadowOpacity={1}
            shadowRadius={4}
            shadowOffset={{ width: 0, height: 1 }}
            pointerEvents="none"
          />

          {dragging ? (
            <YStack
              position="absolute"
              left={`${t * 100}%`}
              top={-OVERLAY + 4}
              x="-50%"
              paddingHorizontal="$2"
              paddingVertical="$1"
              borderRadius={8}
              backgroundColor={fill}
              pointerEvents="none"
            >
              <Text fontFamily="$mono" fontSize={12} fontWeight="600" color="$primaryFg">
                {value.toLocaleString()}
              </Text>
            </YStack>
          ) : null}
        </YStack>

        <YStack
          position="absolute"
          top={OVERLAY}
          right={0}
          bottom={0}
          left={0}
          pointerEvents="none"
        >
          {marks.map((mark) => {
            const id = tickTooltipId(mark.value);
            return (
              <TrackMarker
                key={`${mark.label}-${mark.value}`}
                pct={mark.t * 100}
                label={mark.label}
                sublabel={
                  suggestedValue !== undefined && Math.abs(mark.value - suggestedValue) <= 1
                    ? 'Suggested'
                    : `${mark.value.toLocaleString()} kcal`
                }
                colorHex={mark.t <= t ? 'rgba(255,255,255,0.75)' : faintHex}
                active={value === mark.value}
                open={!dragging && tooltipId === id}
                disabled={disabled}
                markerDomId={`pace-marker-${id.replace(':', '-')}`}
                onOpen={() => openTooltip(id)}
                onClose={() => closeTooltip(id)}
                onPin={() => {
                  if (skipNextPressRef.current) return;
                  pinTooltip(id);
                }}
                onUnpin={() => unpinTooltip(id)}
                onActivate={() => {
                  if (skipNextPressRef.current) return;
                  onChange(mark.value);
                }}
                onSlideStart={startSlideFromMarker}
              />
            );
          })}
          {floorMark !== null ? (
            <TrackMarker
              pct={kcalToT(floorMark, min, max, invert) * 100}
              label="Calorie floor"
              sublabel={`${floorMark.toLocaleString()} kcal minimum`}
              colorHex={dangerHex}
              active={false}
              open={!dragging && tooltipId === floorTooltipId(floorMark)}
              tall
              disabled={disabled}
              markerDomId={`pace-marker-${floorTooltipId(floorMark).replace(':', '-')}`}
              onOpen={() => openTooltip(floorTooltipId(floorMark))}
              onClose={() => closeTooltip(floorTooltipId(floorMark))}
              onPin={() => {
                if (skipNextPressRef.current) return;
                pinTooltip(floorTooltipId(floorMark));
              }}
              onUnpin={() => unpinTooltip(floorTooltipId(floorMark))}
              onSlideStart={startSlideFromMarker}
            />
          ) : null}
        </YStack>
        {tooltipMarker !== null ? (
          <TickTooltip
            pct={tooltipMarker.pct}
            label={tooltipMarker.label}
            sublabel={tooltipMarker.sublabel}
          />
        ) : null}
      </YStack>

      <XStack alignItems="flex-start" gap="$2" minHeight={CAPTION_MIN}>
        {caption !== null ? (
          <>
            {warning === 'none' ? (
              <Info size={14} color={captionColor(warning)} />
            ) : (
              <AlertTriangle size={15} color={captionColor(warning)} />
            )}
            <Text
              fontFamily="$body"
              fontSize={14}
              lineHeight={20}
              color={captionColor(warning)}
              flex={1}
            >
              {caption}
            </Text>
          </>
        ) : null}
      </XStack>
    </YStack>
  );
};
