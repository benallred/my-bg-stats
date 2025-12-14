import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'lcov'],
      include: ['stats.js'],
      exclude: ['scripts/**', 'tests/**', 'node_modules/**', '**/*.test.js'],
      all: false,
      thresholds: {
        lines: 99.77,
        functions: 100,
        branches: 96.1,
        statements: 99.77,
      },
    },
  },
});
