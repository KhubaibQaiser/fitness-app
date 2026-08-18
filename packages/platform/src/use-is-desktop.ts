'use client';

import { useEffect, useState } from 'react';

/** Desktop shell breakpoint — must match Tamagui `md` media. */
export const DESKTOP_MIN_WIDTH_PX = 768;

/**
 * Viewport ≥ desktop breakpoint. Useful for runtime UI details on web/native.
 * Do not use for web shell first-paint structure decisions — shell visibility
 * should be media/CSS-driven to avoid hydration-time layout swaps.
 *
 * Returns false until mounted on web.
 */
export const useIsDesktop = (minWidthPx = DESKTOP_MIN_WIDTH_PX): boolean => {
  const [isDesktop, setIsDesktop] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
      return;
    }
    const query = window.matchMedia(`(min-width: ${minWidthPx}px)`);
    const sync = () => {
      setIsDesktop(query.matches);
    };
    sync();
    query.addEventListener('change', sync);
    return () => {
      query.removeEventListener('change', sync);
    };
  }, [minWidthPx]);

  return isDesktop;
};
