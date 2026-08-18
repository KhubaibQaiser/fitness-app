export type ChartPad = {
  top: number;
  right: number;
  bottom: number;
  left: number;
};

/** Fallback viewBox width before the chart has been measured. */
export const CHART_VIEW_WIDTH = 640;

/** Padding sized for Mono/Body 14 axis labels and Caption 13 milestone labels. */
export const CHART_PAD: ChartPad = {
  top: 28,
  right: 20,
  bottom: 36,
  left: 56,
};

/** Design system Mono/Body — every numeric axis tick. */
export const AXIS_FONT_SIZE = 14;
/** Design system Caption/Medium — milestone callouts. */
export const MILESTONE_FONT_SIZE = 13;

/** ViewBox height that preserves the original chart aspect ratio. */
export const chartViewHeight = (renderedWidth: number, height: number): number =>
  (renderedWidth * height) / CHART_VIEW_WIDTH;
