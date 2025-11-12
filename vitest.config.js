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
        lines: 100,
        functions: 99,
        branches: 91,
        statements: 98,
      },
    },
  },
});
