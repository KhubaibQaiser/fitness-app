'use client';

import { useEffect, useId, useMemo, useRef, useState } from 'react';
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
import { Text, useTheme, XStack, YStack } from 'tamagui';
import { HitTarget } from './hit-target';
import { Muted } from './typography';

export type WeightPoint = { t: number; weightKg: number };

export type WeightChartProps = {
  points: WeightPoint[];
  goalWeightKg?: number | null;
  height?: number;
};

type LayoutPoint = { x: number; y: number; t: number; weightKg: number };

const WIDTH = 640;
const PAD = { top: 20, right: 16, bottom: 28, left: 40 };

const buildLayout = (
  points: WeightPoint[],
  goalWeightKg: number | null,
  height: number,
): { sorted: LayoutPoint[]; goalY: number | null; minW: number; maxW: number } | null => {
  if (points.length < 2) return null;
  const sortedRaw = [...points].sort((a, b) => a.t - b.t);
  const first = sortedRaw[0];
  const last = sortedRaw[sortedRaw.length - 1];
  if (!first || !last) return null;

  const weights = sortedRaw.map((p) => p.weightKg);
  const candidates = goalWeightKg === null ? weights : [...weights, goalWeightKg];
  const minW = Math.min(...candidates) - 0.5;
  const maxW = Math.max(...candidates) + 0.5;
  const spanT = Math.max(1, last.t - first.t);
  const spanW = Math.max(0.1, maxW - minW);
  const plotW = WIDTH - PAD.left - PAD.right;
  const plotH = height - PAD.top - PAD.bottom;

  const x = (t: number) => PAD.left + ((t - first.t) / spanT) * plotW;
  const y = (w: number) => PAD.top + ((maxW - w) / spanW) * plotH;

  return {
    sorted: sortedRaw.map((p) => ({
      x: x(p.t),
      y: y(p.weightKg),
      t: p.t,
      weightKg: p.weightKg,
    })),
    goalY: goalWeightKg === null ? null : y(goalWeightKg),
    minW,
    maxW,
  };
};

const linePath = (pts: LayoutPoint[]) =>
  pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');

const areaPath = (pts: LayoutPoint[], height: number) => {
  if (pts.length === 0) return '';
  const first = pts[0];
  const last = pts[pts.length - 1];
  if (!first || !last) return '';
  const baseline = height - PAD.bottom;
  return `${linePath(pts)} L${last.x.toFixed(1)},${baseline} L${first.x.toFixed(1)},${baseline} Z`;
};

/**
 * Cross-platform weight trend (react-native-svg). Draw-in animation + web hover
 * tooltip; keyboard focus on points for WCAG. Theme tokens drive stroke colors.
 */
export const WeightChart = ({ points, goalWeightKg = null, height = 200 }: WeightChartProps) => {
  const theme = useTheme();
  const gradId = useId().replace(/:/g, '');
  const [progress, setProgress] = useState(0);
  const [active, setActive] = useState<number | null>(null);
  const raf = useRef<number | null>(null);

  const layout = useMemo(
    () => buildLayout(points, goalWeightKg, height),
    [points, goalWeightKg, height],
  );

  useEffect(() => {
    setProgress(0);
    setActive(null);
    const start = performance.now();
    const duration = 700;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      // easeOutCubic
      setProgress(1 - (1 - t) ** 3);
      if (t < 1) raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
    return () => {
      if (raf.current !== null) cancelAnimationFrame(raf.current);
    };
  }, [layout]);

  if (!layout) {
    return (
      <YStack
        height={height}
        alignItems="center"
        justifyContent="center"
        backgroundColor="$elevatedBg"
        borderRadius={14}
        borderWidth={1}
        borderColor="$borderColor"
      >
        <Muted>Record a few weigh-ins to see the trend</Muted>
      </YStack>
    );
  }

  const { sorted, goalY, minW, maxW } = layout;
  const visibleCount = Math.max(2, Math.ceil(sorted.length * Math.max(progress, 0.02)));
  const visible = sorted.slice(0, visibleCount);
  const stroke = String(theme.primary?.val ?? '#0f766e');
  const goalStroke = String(theme.accent?.val ?? '#f59e0b');
  const muted = String(theme.textMuted?.val ?? '#3d4f48');
  const grid = String(theme.borderColor?.val ?? '#c5d0cd');
  const activePoint = active !== null ? sorted[active] : null;

  const yTicks = [maxW, (maxW + minW) / 2, minW];

  return (
    <YStack width="100%" gap="$2">
      <YStack
        width="100%"
        aspectRatio={WIDTH / height}
        borderRadius={14}
        overflow="hidden"
        backgroundColor="$elevatedBg"
        borderWidth={1}
        borderColor="$borderColor"
        accessibilityRole="image"
        accessibilityLabel="Weight trend chart"
        position="relative"
      >
        <Svg viewBox={`0 0 ${WIDTH} ${height}`} width="100%" height="100%">
          <Defs>
            <LinearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor={stroke} stopOpacity={0.28} />
              <Stop offset="1" stopColor={stroke} stopOpacity={0} />
            </LinearGradient>
          </Defs>

          {yTicks.map((w) => {
            const y =
              PAD.top + ((maxW - w) / Math.max(0.1, maxW - minW)) * (height - PAD.top - PAD.bottom);
            return (
              <Line
                key={w}
                x1={PAD.left}
                x2={WIDTH - PAD.right}
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
              PAD.top + ((maxW - w) / Math.max(0.1, maxW - minW)) * (height - PAD.top - PAD.bottom);
            /* react-native-svg Text uses SVG x/y attrs (not Tamagui layout props) */
            return (
              <SvgText
                key={`label-${w}`}
                // eslint-disable-next-line @typescript-eslint/no-deprecated -- SVG attribute
                x={PAD.left - 8}
                // eslint-disable-next-line @typescript-eslint/no-deprecated -- SVG attribute
                y={y + 4}
                fill={muted}
                fontSize={11}
                fontWeight="600"
                textAnchor="end"
              >
                {w.toFixed(1)}
              </SvgText>
            );
          })}

          {goalY !== null ? (
            <Line
              x1={PAD.left}
              x2={WIDTH - PAD.right}
              y1={goalY}
              y2={goalY}
              stroke={goalStroke}
              strokeDasharray="6 6"
              strokeWidth={2}
              opacity={0.9}
            />
          ) : null}

          <Path d={areaPath(visible, height)} fill={`url(#${gradId})`} opacity={progress} />
          <Path
            d={linePath(visible)}
            fill="none"
            stroke={stroke}
            strokeWidth={3}
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {sorted.map((p, index) => {
            const shown = index < visibleCount;
            const isActive = active === index;
            return (
              <Circle
                key={p.t}
                cx={p.x}
                cy={p.y}
                r={isActive ? 7 : 4.5}
                fill={stroke}
                opacity={shown ? 1 : 0}
              />
            );
          })}
        </Svg>

        {/* Hit targets layered in % space — hover on web, press on native */}
        {sorted.map((p, index) => (
          <HitTarget
            key={`hit-${p.t}`}
            position="absolute"
            left={`${((p.x - 16) / WIDTH) * 100}%`}
            top={0}
            width={`${(32 / WIDTH) * 100}%`}
            height="100%"
            cursor="pointer"
            onPress={() => setActive(index)}
            onMouseEnter={() => setActive(index)}
            onMouseLeave={() => setActive(null)}
            accessibilityRole="button"
            accessibilityLabel={`${p.weightKg.toFixed(1)} kilograms on ${new Date(p.t).toLocaleDateString()}`}
          />
        ))}
      </YStack>

      <XStack justifyContent="space-between" alignItems="center" minHeight={22}>
        {activePoint ? (
          <Text fontFamily="$heading" fontWeight="700" fontSize={14} color="$color">
            {activePoint.weightKg.toFixed(1)} kg · {new Date(activePoint.t).toLocaleDateString()}
          </Text>
        ) : (
          <Muted>
            {(() => {
              const first = sorted[0];
              const last = sorted[sorted.length - 1];
              if (!first || !last) return '';
              return `${new Date(first.t).toLocaleDateString()} → ${new Date(last.t).toLocaleDateString()}`;
            })()}
          </Muted>
        )}
        {goalWeightKg !== null ? (
          <XStack alignItems="center" gap="$1.5">
            <YStack width={14} height={2} backgroundColor="$accent" />
            <Muted>Goal {goalWeightKg} kg</Muted>
          </XStack>
        ) : null}
      </XStack>
    </YStack>
  );
};
