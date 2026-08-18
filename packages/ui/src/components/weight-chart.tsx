'use client';

import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { AccessibilityInfo, type LayoutChangeEvent } from 'react-native';
import {
  Circle,
  Defs,
  Line,
  LinearGradient,
  Path,
  Stop,
  Svg,
  Text as SvgText,
} from 'react-native-svg';
import { isWeb, Text, useTheme, XStack, YStack } from 'tamagui';
import { HitTarget } from './hit-target';
import { Muted } from './typography';
import {
  AXIS_FONT_SIZE,
  CHART_PAD,
  CHART_VIEW_WIDTH,
  chartViewHeight,
  MILESTONE_FONT_SIZE,
  type ChartPad,
} from './weight-chart-layout';
import {
  areaFromLinePath,
  interpolateY,
  monotoneCubicPath,
  pathLength,
  type ChartPoint,
} from './weight-chart-path';

export type WeightPoint = { t: number; weightKg: number };

export type WeightChartMilestone = WeightPoint & { label: string };

export type WeightChartProps = {
  points: WeightPoint[];
  expectedPoints?: WeightPoint[];
  projectedPoints?: WeightPoint[];
  milestones?: WeightChartMilestone[];
  current?: WeightPoint | null;
  goalWeightKg?: number | null;
  unitLabel?: string;
  height?: number;
};

type LayoutPoint = ChartPoint & { t: number; weightKg: number };

type ChartLayout = {
  actual: LayoutPoint[];
  expected: LayoutPoint[];
  projected: LayoutPoint[];
  milestones: (LayoutPoint & { label: string })[];
  current: LayoutPoint | null;
  goalY: number | null;
  minW: number;
  maxW: number;
  tMin: number;
  tMax: number;
};

const DRAW_MS = 700;
const MONO = isWeb ? 'Roboto Mono' : 'RobotoMono';
const HIT_PX = 32;

const easeOutCubic = (t: number): number => 1 - (1 - t) ** 3;

const formatChartDate = (t: number): string =>
  new Intl.DateTimeFormat('en', {
    day: 'numeric',
    month: 'short',
    timeZone: 'UTC',
  }).format(new Date(t));

const mapSeries = (
  series: WeightPoint[],
  x: (t: number) => number,
  y: (w: number) => number,
): LayoutPoint[] =>
  [...series]
    .sort((a, b) => a.t - b.t)
    .map((p) => ({ x: x(p.t), y: y(p.weightKg), t: p.t, weightKg: p.weightKg }));

const buildLayout = ({
  points,
  expectedPoints,
  projectedPoints,
  milestones,
  current,
  goalWeightKg,
  viewWidth,
  viewHeight,
  pad,
}: {
  points: WeightPoint[];
  expectedPoints: WeightPoint[];
  projectedPoints: WeightPoint[];
  milestones: WeightChartMilestone[];
  current: WeightPoint | null;
  goalWeightKg: number | null;
  viewWidth: number;
  viewHeight: number;
  pad: ChartPad;
}): ChartLayout | null => {
  const domain = [
    ...points,
    ...expectedPoints,
    ...projectedPoints,
    ...milestones,
    ...(current !== null ? [current] : []),
  ];
  if (domain.length === 0) return null;

  const times = domain.map((p) => p.t);
  const weights = domain.map((p) => p.weightKg);
  if (goalWeightKg !== null) weights.push(goalWeightKg);
  const tMin = Math.min(...times);
  const tMax = Math.max(...times);
  const minW = Math.min(...weights) - 0.6;
  const maxW = Math.max(...weights) + 0.6;
  const spanT = Math.max(1, tMax - tMin);
  const spanW = Math.max(0.1, maxW - minW);
  const plotW = viewWidth - pad.left - pad.right;
  const plotH = viewHeight - pad.top - pad.bottom;
  const x = (t: number) => pad.left + ((t - tMin) / spanT) * plotW;
  const y = (w: number) => pad.top + ((maxW - w) / spanW) * plotH;

  if (expectedPoints.length < 2 && points.length < 1) return null;

  return {
    actual: mapSeries(points, x, y),
    expected: mapSeries(expectedPoints, x, y),
    projected: mapSeries(projectedPoints, x, y),
    milestones: [...milestones]
      .sort((a, b) => a.t - b.t)
      .map((p) => ({ x: x(p.t), y: y(p.weightKg), t: p.t, weightKg: p.weightKg, label: p.label })),
    current:
      current === null
        ? null
        : { x: x(current.t), y: y(current.weightKg), t: current.t, weightKg: current.weightKg },
    goalY: goalWeightKg === null ? null : y(goalWeightKg),
    minW,
    maxW,
    tMin,
    tMax,
  };
};

const dashFor = (length: number, progress: number): { dash: string; offset: number } => ({
  dash: `${length} ${length}`,
  offset: length * (1 - progress),
});

/**
 * Cross-platform weight journey (react-native-svg). Actual vs expected path,
 * projected continuation, milestone markers, draw-in animation, and hover/press
 * tooltip. Theme tokens drive stroke colors. Values are already in display units.
 */
export const WeightChart = ({
  points,
  expectedPoints = [],
  projectedPoints = [],
  milestones = [],
  current = null,
  goalWeightKg = null,
  unitLabel = 'kg',
  height = 240,
}: WeightChartProps) => {
  const theme = useTheme();
  const strokeGradId = `${useId().replace(/:/g, '')}-stroke`;
  const areaGradId = `${useId().replace(/:/g, '')}-area`;
  const [progress, setProgress] = useState(0);
  const [active, setActive] = useState<number | null>(null);
  const raf = useRef<number | null>(null);
  const [reduceMotion, setReduceMotion] = useState(false);
  const [boxWidth, setBoxWidth] = useState<number | null>(null);

  const viewWidth = boxWidth ?? CHART_VIEW_WIDTH;
  const viewHeight = chartViewHeight(viewWidth, height);
  const pad = CHART_PAD;

  const layout = useMemo(
    () =>
      buildLayout({
        points,
        expectedPoints,
        projectedPoints,
        milestones,
        current,
        goalWeightKg,
        viewWidth,
        viewHeight,
        pad,
      }),
    [
      points,
      expectedPoints,
      projectedPoints,
      milestones,
      current,
      goalWeightKg,
      viewWidth,
      viewHeight,
      pad,
    ],
  );

  const dataKey = useMemo(
    () =>
      [
        points.map((p) => `${p.t}:${p.weightKg}`).join(','),
        expectedPoints.map((p) => `${p.t}:${p.weightKg}`).join(','),
        projectedPoints.map((p) => `${p.t}:${p.weightKg}`).join(','),
        String(goalWeightKg ?? ''),
      ].join('|'),
    [points, expectedPoints, projectedPoints, goalWeightKg],
  );

  const onChartLayout = (event: LayoutChangeEvent) => {
    const next = event.nativeEvent.layout.width;
    if (next <= 0) return;
    setBoxWidth((currentWidth) =>
      currentWidth !== null && Math.abs(currentWidth - next) < 1 ? currentWidth : next,
    );
  };

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

  useEffect(() => {
    setActive(null);
    if (reduceMotion) {
      setProgress(1);
      return;
    }
    setProgress(0);
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / DRAW_MS);
      setProgress(easeOutCubic(t));
      if (t < 1) raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
    return () => {
      if (raf.current !== null) cancelAnimationFrame(raf.current);
    };
  }, [dataKey, reduceMotion]);

  const geometry = useMemo(() => {
    if (layout === null) return null;
    const actualPath = monotoneCubicPath(layout.actual);
    const firstActual = layout.actual[0];
    const lastActual = layout.actual[layout.actual.length - 1];
    return {
      actualPath,
      expectedPath: monotoneCubicPath(layout.expected),
      projectedPath: monotoneCubicPath(layout.projected),
      actualLen: Math.max(1, pathLength(layout.actual)),
      area:
        firstActual !== undefined && lastActual !== undefined && layout.actual.length >= 2
          ? areaFromLinePath(actualPath, firstActual.x, lastActual.x, viewHeight - pad.bottom)
          : '',
    };
  }, [layout, viewHeight, pad.bottom]);

  if (layout === null || geometry === null) {
    return (
      <YStack height={viewHeight} alignItems="center" justifyContent="center">
        <Muted>Record a few weigh-ins to see the trend</Muted>
      </YStack>
    );
  }

  const { actual, expected, minW, maxW, tMin, tMax, goalY } = layout;
  const gradientStart = String(theme.gradientStart?.val ?? '#0EA5E9');
  const gradientEnd = String(theme.gradientEnd?.val ?? '#2563EB');
  const primary = String(theme.primary?.val ?? '#1D4ED8');
  const goalStroke = String(theme.accent?.val ?? '#1D4ED8');
  const muted = String(theme.textMuted?.val ?? '#71717A');
  const faint = String(theme.placeholderColor?.val ?? '#A1A1AA');
  const grid = String(theme.borderColor?.val ?? '#E4E4E7');
  const milestoneFill = String(theme.milestoneFill?.val ?? '#F59E0B');
  const milestoneText = String(theme.milestoneText?.val ?? '#B45309');
  const wash = String(theme.primaryMuted?.val ?? '#EFF6FF');
  const surface = String(theme.cardBg?.val ?? '#FFFFFF');

  const { actualPath, expectedPath, projectedPath, actualLen, area } = geometry;
  const actualDash = dashFor(actualLen, progress);
  const lastActual = actual[actual.length - 1];
  const areaOpacity = Math.max(0, (progress - 0.35) / 0.65);
  const markerOpacity = Math.max(0, (progress - 0.55) / 0.45);
  const activePoint = active !== null ? actual[active] : null;
  const expectedAtActive =
    activePoint === undefined || activePoint === null
      ? null
      : interpolateY(expectedPoints.length > 0 ? expectedPoints : points, activePoint.t);
  const yTicks = [maxW, (maxW + minW) / 2, minW];
  const startLabel = actual[0] ?? expected[0];
  const endLabel = expected[expected.length - 1] ?? actual[actual.length - 1];
  const a11yStart = startLabel?.weightKg.toFixed(1) ?? '-';
  const a11yCurrent = (layout.current ?? lastActual)?.weightKg.toFixed(1) ?? a11yStart;
  const a11yGoal = goalWeightKg !== null ? goalWeightKg.toFixed(1) : 'none';

  return (
    <YStack width="100%" gap="$3">
      <YStack
        width="100%"
        aspectRatio={CHART_VIEW_WIDTH / height}
        overflow="visible"
        accessibilityRole="image"
        accessibilityLabel={`Weight journey from ${a11yStart} ${unitLabel} to goal ${a11yGoal} ${unitLabel}, currently ${a11yCurrent} ${unitLabel}`}
        position="relative"
        onLayout={onChartLayout}
      >
        <Svg viewBox={`0 0 ${viewWidth} ${viewHeight}`} width="100%" height="100%">
          <Defs>
            <LinearGradient
              id={strokeGradId}
              x1={pad.left}
              y1="0"
              x2={viewWidth - pad.right}
              y2="0"
              gradientUnits="userSpaceOnUse"
            >
              <Stop offset="0" stopColor={gradientStart} />
              <Stop offset="1" stopColor={gradientEnd} />
            </LinearGradient>
            <LinearGradient id={areaGradId} x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor={gradientEnd} stopOpacity={0.28} />
              <Stop offset="1" stopColor={gradientEnd} stopOpacity={0} />
            </LinearGradient>
          </Defs>

          {yTicks.map((w) => {
            const y =
              pad.top +
              ((maxW - w) / Math.max(0.1, maxW - minW)) * (viewHeight - pad.top - pad.bottom);
            return (
              <Line
                key={`grid-${w}`}
                x1={pad.left}
                x2={viewWidth - pad.right}
                y1={y}
                y2={y}
                stroke={grid}
                strokeWidth={1}
                strokeDasharray="4 6"
              />
            );
          })}

          {yTicks.map((w) => {
            const y =
              pad.top +
              ((maxW - w) / Math.max(0.1, maxW - minW)) * (viewHeight - pad.top - pad.bottom);
            return (
              <SvgText
                key={`ylabel-${w}`}
                // eslint-disable-next-line @typescript-eslint/no-deprecated -- SVG attribute
                x={pad.left - 8}
                // eslint-disable-next-line @typescript-eslint/no-deprecated -- SVG attribute
                y={y + AXIS_FONT_SIZE * 0.35}
                fill={muted}
                fontSize={AXIS_FONT_SIZE}
                fontFamily={MONO}
                fontWeight="600"
                textAnchor="end"
              >
                {w.toFixed(1)}
              </SvgText>
            );
          })}

          {startLabel !== undefined ? (
            <SvgText
              // eslint-disable-next-line @typescript-eslint/no-deprecated -- SVG attribute
              x={startLabel.x}
              // eslint-disable-next-line @typescript-eslint/no-deprecated -- SVG attribute
              y={viewHeight - 10}
              fill={muted}
              fontSize={AXIS_FONT_SIZE}
              fontFamily={MONO}
              fontWeight="600"
              textAnchor="start"
            >
              {formatChartDate(tMin)}
            </SvgText>
          ) : null}
          {endLabel !== undefined ? (
            <SvgText
              // eslint-disable-next-line @typescript-eslint/no-deprecated -- SVG attribute
              x={viewWidth - pad.right}
              // eslint-disable-next-line @typescript-eslint/no-deprecated -- SVG attribute
              y={viewHeight - 10}
              fill={muted}
              fontSize={AXIS_FONT_SIZE}
              fontFamily={MONO}
              fontWeight="600"
              textAnchor="end"
            >
              {formatChartDate(tMax)}
            </SvgText>
          ) : null}

          {goalY !== null ? (
            <Line
              x1={pad.left}
              x2={viewWidth - pad.right}
              y1={goalY}
              y2={goalY}
              stroke={goalStroke}
              strokeDasharray="6 6"
              strokeWidth={1.5}
              opacity={0.85}
            />
          ) : null}

          {expectedPath.length > 0 ? (
            <Path
              d={expectedPath}
              fill="none"
              stroke={faint}
              strokeWidth={2}
              strokeDasharray="6 6"
              strokeLinecap="round"
              strokeLinejoin="round"
              opacity={0.9 * Math.min(1, progress / 0.6)}
            />
          ) : null}

          {projectedPath.length > 0 ? (
            <Path
              d={projectedPath}
              fill="none"
              stroke={goalStroke}
              strokeWidth={2}
              strokeDasharray="7 6"
              strokeLinecap="round"
              opacity={0.55 * Math.max(0, (progress - 0.2) / 0.8)}
            />
          ) : null}

          {area.length > 0 ? (
            <Path d={area} fill={`url(#${areaGradId})`} opacity={areaOpacity} />
          ) : null}

          {actualPath.length > 0 && actual.length >= 2 ? (
            <Path
              d={actualPath}
              fill="none"
              stroke={`url(#${strokeGradId})`}
              strokeWidth={3}
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeDasharray={actualDash.dash}
              strokeDashoffset={actualDash.offset}
            />
          ) : null}

          {activePoint !== undefined && activePoint !== null ? (
            <Line
              x1={activePoint.x}
              x2={activePoint.x}
              y1={pad.top}
              y2={viewHeight - pad.bottom}
              stroke={faint}
              strokeWidth={1}
              strokeDasharray="2 4"
            />
          ) : null}

          {layout.milestones.map((item) => (
            <Circle
              key={`ms-${item.t}-${item.label}`}
              cx={item.x}
              cy={item.y}
              r={3.5}
              fill={milestoneFill}
              opacity={markerOpacity}
            />
          ))}
          {layout.milestones.map((item) => (
            <SvgText
              key={`ms-label-${item.t}-${item.label}`}
              // eslint-disable-next-line @typescript-eslint/no-deprecated -- SVG attribute
              x={item.x}
              // eslint-disable-next-line @typescript-eslint/no-deprecated -- SVG attribute
              y={item.y - MILESTONE_FONT_SIZE - 4}
              fill={milestoneText}
              fontSize={MILESTONE_FONT_SIZE}
              fontFamily={MONO}
              fontWeight="600"
              textAnchor="middle"
              opacity={markerOpacity}
            >
              {item.label}
            </SvgText>
          ))}

          {actual.map((p, index) => {
            const isCurrent =
              layout.current !== null && Math.abs(p.t - layout.current.t) < 86_400_000;
            if (isCurrent) return null;
            const isActive = active === index;
            return (
              <Circle
                key={p.t}
                cx={p.x}
                cy={p.y}
                r={isActive ? 6 : 4}
                fill={primary}
                stroke={surface}
                strokeWidth={1.5}
                opacity={markerOpacity}
              />
            );
          })}

          {layout.current !== null ? (
            <>
              <Circle
                cx={layout.current.x}
                cy={layout.current.y}
                r={11}
                fill={wash}
                opacity={0.55}
              />
              <Circle
                cx={layout.current.x}
                cy={layout.current.y}
                r={6.5}
                fill={primary}
                stroke={surface}
                strokeWidth={2}
                opacity={markerOpacity}
              />
            </>
          ) : null}
        </Svg>

        {actual.map((p, index) => (
          <HitTarget
            key={`hit-${p.t}`}
            position="absolute"
            left={`${((p.x - HIT_PX / 2) / viewWidth) * 100}%`}
            top={0}
            width={`${(HIT_PX / viewWidth) * 100}%`}
            height="100%"
            cursor="pointer"
            onPress={() => setActive((current) => (current === index ? null : index))}
            onMouseEnter={() => setActive(index)}
            onMouseLeave={() => setActive(null)}
            accessibilityRole="button"
            accessibilityLabel={`${p.weightKg.toFixed(1)} ${unitLabel} on ${formatChartDate(p.t)}`}
          />
        ))}

        {activePoint !== undefined && activePoint !== null ? (
          <YStack
            position="absolute"
            left={`${Math.min(72, Math.max(4, (activePoint.x / viewWidth) * 100 - 14))}%`}
            top={`${Math.max(2, (activePoint.y / viewHeight) * 100 - 28)}%`}
            pointerEvents="none"
            backgroundColor="$cardBg"
            borderWidth={1}
            borderColor="$borderColor"
            borderRadius={12}
            paddingHorizontal="$2.5"
            paddingVertical="$2"
            gap="$1"
            minWidth={132}
            shadowColor="rgba(0,0,0,0.18)"
            shadowOffset={{ width: 0, height: 8 }}
            shadowRadius={24}
            shadowOpacity={1}
          >
            <Muted fontSize={13}>{formatChartDate(activePoint.t)}</Muted>
            <Text fontFamily="$mono" fontSize={16} fontWeight="600" color="$color">
              {activePoint.weightKg.toFixed(1)} {unitLabel}
            </Text>
            {expectedAtActive !== null ? (
              <Muted fontSize={13}>
                Expected {expectedAtActive.toFixed(1)} {unitLabel}
                {` · ${activePoint.weightKg - expectedAtActive >= 0 ? '+' : ''}${(activePoint.weightKg - expectedAtActive).toFixed(1)} vs plan`}
              </Muted>
            ) : null}
          </YStack>
        ) : null}
      </YStack>

      <XStack
        justifyContent="space-between"
        alignItems="center"
        gap="$3"
        flexWrap="wrap"
        minHeight={22}
      >
        <Muted>
          {formatChartDate(tMin)} → {formatChartDate(tMax)}
        </Muted>
        <XStack alignItems="center" gap="$3" flexWrap="wrap">
          <XStack alignItems="center" gap="$1.5">
            <YStack width={14} height={3} borderRadius={999} backgroundColor="$primary" />
            <Muted>Weigh-ins</Muted>
          </XStack>
          <XStack alignItems="center" gap="$1.5">
            <XStack alignItems="center" gap={3}>
              <YStack width={5} height={2} borderRadius={999} backgroundColor="$textMuted" />
              <YStack width={5} height={2} borderRadius={999} backgroundColor="$textMuted" />
            </XStack>
            <Muted>Expected</Muted>
          </XStack>
          {goalWeightKg !== null ? (
            <XStack alignItems="center" gap="$1.5">
              <XStack alignItems="center" gap={3}>
                <YStack width={5} height={2} borderRadius={999} backgroundColor="$accent" />
                <YStack width={5} height={2} borderRadius={999} backgroundColor="$accent" />
              </XStack>
              <Muted>
                Goal {goalWeightKg.toFixed(1)} {unitLabel}
              </Muted>
            </XStack>
          ) : null}
        </XStack>
      </XStack>
    </YStack>
  );
};
