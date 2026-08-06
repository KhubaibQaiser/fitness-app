'use client';

import { useEffect, useState } from 'react';

/** Desktop shell breakpoint — matches Tamagui `md` / common tablet+ width. */
export const DESKTOP_MIN_WIDTH_PX = 768;

/**
 * Viewport ≥ desktop breakpoint. Web uses matchMedia (reliable with Next +
 * react-native-web). Native (P3) can swap to Dimensions / useWindowDimensions.
 *
 * Mobile-first: returns false until mounted to avoid SSR/desktop mismatch flash
 * of the side nav.
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
