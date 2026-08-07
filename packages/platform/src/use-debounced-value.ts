'use client';

import { useEffect, useState } from 'react';

/**
 * Debounce a rapidly changing value (e.g. search input) before it drives
 * network queries. Input stays instant; query key updates after `delayMs`.
 */
export const useDebouncedValue = <T>(value: T, delayMs = 300): T => {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(id);
  }, [value, delayMs]);

  return debounced;
};
