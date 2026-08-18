import { describe, expect, it } from 'vitest';
import {
  AXIS_FONT_SIZE,
  CHART_PAD,
  CHART_VIEW_WIDTH,
  chartViewHeight,
  MILESTONE_FONT_SIZE,
} from './weight-chart-layout';

describe('weight chart layout', () => {
  it('maps the measured width to CSS-pixel viewBox height', () => {
    expect(chartViewHeight(CHART_VIEW_WIDTH, 240)).toBe(240);
    expect(chartViewHeight(320, 240)).toBe(120);
    expect(chartViewHeight(960, 240)).toBe(360);
  });

  it('keeps axis labels at body size and padding wide enough for them', () => {
    expect(AXIS_FONT_SIZE).toBeGreaterThanOrEqual(14);
    expect(MILESTONE_FONT_SIZE).toBeGreaterThanOrEqual(13);
    expect(CHART_PAD.left).toBeGreaterThan(AXIS_FONT_SIZE * 3);
    expect(CHART_PAD.bottom).toBeGreaterThan(AXIS_FONT_SIZE * 2);
  });
});
