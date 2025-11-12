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
        lines: 98,
        functions: 100,
        branches: 90,
        statements: 98,
      },
    },
  },
});
