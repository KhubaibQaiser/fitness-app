import { describe, expect, it } from 'vitest';
import {
  areaFromLinePath,
  interpolateY,
  monotoneCubicPath,
  pathLength,
  sampleMonotoneY,
} from './weight-chart-path';

describe('weight chart path', () => {
  it('emits a line for two points and a cubic for three+', () => {
    expect(
      monotoneCubicPath([
        { x: 0, y: 10 },
        { x: 10, y: 0 },
      ]),
    ).toBe('M0.00,10.00 L10.00,0.00');
    expect(
      monotoneCubicPath([
        { x: 0, y: 10 },
        { x: 5, y: 5 },
        { x: 10, y: 0 },
      ]),
    ).toContain(' C');
  });

  it('does not overshoot a strictly decreasing series', () => {
    const pts = [
      { x: 0, y: 80 },
      { x: 10, y: 70 },
      { x: 20, y: 72 },
      { x: 30, y: 60 },
    ];
    for (let i = 0; i <= 20; i += 1) {
      const y = sampleMonotoneY(pts, i / 20);
      expect(y).not.toBeNull();
      if (y === null) return;
      expect(y).toBeLessThanOrEqual(80.001);
      expect(y).toBeGreaterThanOrEqual(59.999);
    }
    const mid = sampleMonotoneY(pts, 10 / 30);
    expect(mid).not.toBeNull();
    if (mid === null) return;
    expect(mid).toBeLessThanOrEqual(80);
    expect(mid).toBeGreaterThanOrEqual(70);
  });

  it('measures a horizontal segment length and closes an area', () => {
    expect(
      pathLength([
        { x: 0, y: 5 },
        { x: 10, y: 5 },
      ]),
    ).toBe(10);
    expect(areaFromLinePath('M0,1 L10,1', 0, 10, 8)).toBe('M0,1 L10,1 L10.00,8.00 L0.00,8.00 Z');
  });

  it('interpolates expected weight between sampled times', () => {
    const series = [
      { t: 0, weightKg: 80 },
      { t: 100, weightKg: 70 },
    ];
    expect(interpolateY(series, 50)).toBe(75);
    expect(interpolateY(series, -10)).toBe(80);
    expect(interpolateY(series, 200)).toBe(70);
  });
});
