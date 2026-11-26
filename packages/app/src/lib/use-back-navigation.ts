'use client';

import { useRouter } from 'solito/navigation';

/**
 * Web build: a Cancel or Back press keeps the browser back it always had (Solito's back is Next's
 * `router.back()`). `parentHref` is used only by the native build, see `use-back-navigation.native.ts`.
 */
export const useBackOr = (_parentHref: string) => useRouter().back;
