import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    reporters: ['default', 'json'],
    outputFile: {
      json: fileURLToPath(
        new URL('../../.harness/state/test-results/gymos-web.json', import.meta.url),
      ),
    },
    include: ['lib/**/*.test.ts'],
    passWithNoTests: true,
  },
});
