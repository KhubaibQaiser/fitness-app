import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['src/**/*.test.ts'],
    passWithNoTests: true,
    testTimeout: 30_000,
    // PGlite migrate + seed routinely exceeds the 10s default on CI runners.
    hookTimeout: 60_000,
  },
});
