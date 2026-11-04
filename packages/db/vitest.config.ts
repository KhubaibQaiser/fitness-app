import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    reporters: ['default', 'json'],
    outputFile: {
      json: fileURLToPath(
        new URL('../../.harness/state/test-results/gymos-db.json', import.meta.url),
      ),
    },
    include: ['src/**/*.test.ts'],
    passWithNoTests: true,
    testTimeout: 30_000,
    // PGlite migrate + seed routinely exceeds the 10s default on CI runners.
    hookTimeout: 60_000,
  },
});
