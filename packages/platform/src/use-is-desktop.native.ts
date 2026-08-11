'use client';

import { useWindowDimensions } from 'react-native';

/** Desktop shell breakpoint — matches Tamagui `md` / common tablet+ width. */
export const DESKTOP_MIN_WIDTH_PX = 768;

/**
 * Viewport ≥ desktop breakpoint on native (phone / tablet).
 * Coach mobile is phone-first; tablets at ≥768 get the side-nav chrome.
 */
export const useIsDesktop = (minWidthPx = DESKTOP_MIN_WIDTH_PX): boolean => {
  const { width } = useWindowDimensions();
  return width >= minWidthPx;
};
