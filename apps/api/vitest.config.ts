import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    reporters: ['default', 'json'],
    outputFile: {
      json: fileURLToPath(
        new URL('../../.harness/state/test-results/gymos-api.json', import.meta.url),
      ),
    },
    include: ['tests/**/*.test.ts'],
    passWithNoTests: true,
    testTimeout: 60_000,
    hookTimeout: 60_000,
  },
});
