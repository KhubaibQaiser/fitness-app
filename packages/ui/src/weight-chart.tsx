import { Text, YStack } from 'tamagui';

export type WeightPoint = { t: number; weightKg: number };

export type WeightChartProps = {
  points: WeightPoint[];
  goalWeightKg?: number | null;
  height?: number;
  stroke?: string;
  goalStroke?: string;
};

/**
 * Dependency-free SVG trend chart (react-native-web renders the tree; the
 * svg element itself is web-native — the charts façade probe for native
 * lands with the P3 shell). Shows the weigh-in series + optional goal line.
 */
export const WeightChart = ({
  points,
  goalWeightKg = null,
  height = 160,
  stroke = '#0f766e',
  goalStroke = '#f59e0b',
}: WeightChartProps) => {
  if (points.length < 2) {
    return (
      <YStack height={height} alignItems="center" justifyContent="center">
        <Text fontSize={13} color="$textMuted">
          Record a few weigh-ins to see the trend
        </Text>
      </YStack>
    );
  }

  const width = 640;
  const pad = 12;
  const sorted = [...points].sort((a, b) => a.t - b.t);
  const first = sorted[0];
  const last = sorted[sorted.length - 1];
  if (!first || !last) return null;

  const weights = sorted.map((p) => p.weightKg);
  const candidates = goalWeightKg === null ? weights : [...weights, goalWeightKg];
  const minW = Math.min(...candidates) - 0.5;
  const maxW = Math.max(...candidates) + 0.5;
  const spanT = Math.max(1, last.t - first.t);
  const spanW = Math.max(0.1, maxW - minW);

  const x = (t: number): number => pad + ((t - first.t) / spanT) * (width - pad * 2);
  const y = (w: number): number => pad + ((maxW - w) / spanW) * (height - pad * 2);

  const path = sorted
    .map((p, i) => `${i === 0 ? 'M' : 'L'}${x(p.t).toFixed(1)},${y(p.weightKg).toFixed(1)}`)
    .join(' ');

  return (
    <YStack width="100%" aspectRatio={width / height}>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        width="100%"
        height="100%"
        role="img"
        aria-label="Weight trend chart"
      >
        {goalWeightKg !== null ? (
          <line
            x1={pad}
            x2={width - pad}
            y1={y(goalWeightKg)}
            y2={y(goalWeightKg)}
            stroke={goalStroke}
            strokeDasharray="6 6"
            strokeWidth={2}
          />
        ) : null}
        <path d={path} fill="none" stroke={stroke} strokeWidth={3} strokeLinecap="round" />
        {sorted.map((p) => (
          <circle key={p.t} cx={x(p.t)} cy={y(p.weightKg)} r={3.5} fill={stroke} />
        ))}
      </svg>
    </YStack>
  );
};
