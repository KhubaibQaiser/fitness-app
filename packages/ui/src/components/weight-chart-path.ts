export type ChartPoint = { x: number; y: number };

/** Fritsch–Carlson monotone cubic as an SVG path. Never overshoots local extrema. */
export const monotoneCubicPath = (points: ChartPoint[]): string => {
  if (points.length === 0) return '';
  const first = points[0];
  if (first === undefined) return '';
  if (points.length === 1) return `M${fmt(first.x)},${fmt(first.y)}`;
  if (points.length === 2) {
    const last = points[1];
    if (last === undefined) return `M${fmt(first.x)},${fmt(first.y)}`;
    return `M${fmt(first.x)},${fmt(first.y)} L${fmt(last.x)},${fmt(last.y)}`;
  }

  const xs = points.map((p) => p.x);
  const ys = points.map((p) => p.y);
  const m = monotoneTangents(xs, ys);
  const parts = [`M${fmt(first.x)},${fmt(first.y)}`];
  for (let i = 0; i < points.length - 1; i += 1) {
    const a = points[i];
    const b = points[i + 1];
    const ma = m[i];
    const mb = m[i + 1];
    if (a === undefined || b === undefined || ma === undefined || mb === undefined) continue;
    const dx = b.x - a.x;
    if (dx === 0) {
      parts.push(`L${fmt(b.x)},${fmt(b.y)}`);
      continue;
    }
    const c1x = a.x + dx / 3;
    const c1y = a.y + (ma * dx) / 3;
    const c2x = b.x - dx / 3;
    const c2y = b.y - (mb * dx) / 3;
    parts.push(`C${fmt(c1x)},${fmt(c1y)} ${fmt(c2x)},${fmt(c2y)} ${fmt(b.x)},${fmt(b.y)}`);
  }
  return parts.join(' ');
};

export const areaFromLinePath = (
  line: string,
  firstX: number,
  lastX: number,
  baselineY: number,
): string => {
  if (line.length === 0) return '';
  return `${line} L${fmt(lastX)},${fmt(baselineY)} L${fmt(firstX)},${fmt(baselineY)} Z`;
};

/** Approximate polyline/curve length by sampling cubic segments. */
export const pathLength = (points: ChartPoint[], samplesPerSegment = 16): number => {
  if (points.length < 2) return 0;
  if (points.length === 2) {
    const a = points[0];
    const b = points[1];
    if (a === undefined || b === undefined) return 0;
    return dist(a, b);
  }
  const xs = points.map((p) => p.x);
  const ys = points.map((p) => p.y);
  const m = monotoneTangents(xs, ys);
  let length = 0;
  for (let i = 0; i < points.length - 1; i += 1) {
    const a = points[i];
    const b = points[i + 1];
    const ma = m[i];
    const mb = m[i + 1];
    if (a === undefined || b === undefined || ma === undefined || mb === undefined) continue;
    const dx = b.x - a.x;
    let prev = a;
    for (let s = 1; s <= samplesPerSegment; s += 1) {
      const t = s / samplesPerSegment;
      const next = hermite(a, b, ma, mb, dx, t);
      length += dist(prev, next);
      prev = next;
    }
  }
  return length;
};

export const interpolateY = (
  points: { t: number; weightKg: number }[],
  t: number,
): number | null => {
  if (points.length === 0) return null;
  const first = points[0];
  const last = points[points.length - 1];
  if (first === undefined || last === undefined) return null;
  if (t <= first.t) return first.weightKg;
  if (t >= last.t) return last.weightKg;
  for (let i = 0; i < points.length - 1; i += 1) {
    const a = points[i];
    const b = points[i + 1];
    if (a === undefined || b === undefined || t < a.t || t > b.t) continue;
    const span = b.t - a.t;
    if (span === 0) return b.weightKg;
    return a.weightKg + ((b.weightKg - a.weightKg) * (t - a.t)) / span;
  }
  return last.weightKg;
};

const fmt = (n: number): string => n.toFixed(2);

const dist = (a: ChartPoint, b: ChartPoint): number => Math.hypot(b.x - a.x, b.y - a.y);

const hermite = (
  a: ChartPoint,
  b: ChartPoint,
  ma: number,
  mb: number,
  dx: number,
  t: number,
): ChartPoint => {
  if (dx === 0) return { x: b.x, y: a.y + (b.y - a.y) * t };
  const t2 = t * t;
  const t3 = t2 * t;
  const h00 = 2 * t3 - 3 * t2 + 1;
  const h10 = t3 - 2 * t2 + t;
  const h01 = -2 * t3 + 3 * t2;
  const h11 = t3 - t2;
  return {
    x: a.x + dx * t,
    y: h00 * a.y + h10 * ma * dx + h01 * b.y + h11 * mb * dx,
  };
};

const monotoneTangents = (xs: number[], ys: number[]): number[] => {
  const n = xs.length;
  const delta: number[] = [];
  for (let i = 0; i < n - 1; i += 1) {
    const x0 = xs[i];
    const x1 = xs[i + 1];
    const y0 = ys[i];
    const y1 = ys[i + 1];
    if (x0 === undefined || x1 === undefined || y0 === undefined || y1 === undefined) {
      delta.push(0);
      continue;
    }
    const dx = x1 - x0;
    delta.push(dx === 0 ? 0 : (y1 - y0) / dx);
  }
  const m: number[] = Array.from({ length: n }, () => 0);
  const firstDelta = delta[0] ?? 0;
  const lastDelta = delta[n - 2] ?? 0;
  m[0] = firstDelta;
  m[n - 1] = lastDelta;
  for (let i = 1; i < n - 1; i += 1) {
    const left = delta[i - 1] ?? 0;
    const right = delta[i] ?? 0;
    m[i] = left * right <= 0 ? 0 : (left + right) / 2;
  }
  for (let i = 0; i < n - 1; i += 1) {
    const d = delta[i] ?? 0;
    if (d === 0) {
      m[i] = 0;
      m[i + 1] = 0;
      continue;
    }
    const a = (m[i] ?? 0) / d;
    const b = (m[i + 1] ?? 0) / d;
    const s = a * a + b * b;
    if (s > 9) {
      const t = 3 / Math.sqrt(s);
      m[i] = t * a * d;
      m[i + 1] = t * b * d;
    }
  }
  return m;
};

/** Sample a monotone cubic at t in [0, 1] to verify no overshoot in tests. */
export const sampleMonotoneY = (points: ChartPoint[], t: number): number | null => {
  if (points.length === 0) return null;
  if (points.length === 1) return points[0]?.y ?? null;
  const xs = points.map((p) => p.x);
  const firstX = xs[0];
  const lastX = xs[xs.length - 1];
  if (firstX === undefined || lastX === undefined) return null;
  const x = firstX + (lastX - firstX) * t;
  const ys = points.map((p) => p.y);
  const m = monotoneTangents(xs, ys);
  for (let i = 0; i < points.length - 1; i += 1) {
    const a = points[i];
    const b = points[i + 1];
    const ma = m[i];
    const mb = m[i + 1];
    if (a === undefined || b === undefined || ma === undefined || mb === undefined) continue;
    if (x < a.x || x > b.x) continue;
    const dx = b.x - a.x;
    const localT = dx === 0 ? 1 : (x - a.x) / dx;
    return hermite(a, b, ma, mb, dx, localT).y;
  }
  return points[points.length - 1]?.y ?? null;
};
