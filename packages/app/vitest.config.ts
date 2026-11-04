import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    reporters: ['default', 'json'],
    outputFile: {
      json: fileURLToPath(
        new URL('../../.harness/state/test-results/gymos-app.json', import.meta.url),
      ),
    },
    // Plain .test.ts only — most of this package is Tamagui/RN components
    // (.tsx) that need a real app/bundler context, not a unit-test runner.
    include: ['src/**/*.test.ts'],
    passWithNoTests: true,
  },
});
