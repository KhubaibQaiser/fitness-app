import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // Plain .test.ts only — most of this package is Tamagui/RN components
    // (.tsx) that need a real app/bundler context, not a unit-test runner.
    include: ['src/**/*.test.ts'],
    passWithNoTests: true,
  },
});
