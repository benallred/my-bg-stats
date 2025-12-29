import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'lcov'],
      include: ['stats.js', 'stats/**/*.js', 'utils.js', 'formatting.js'],
      exclude: ['scripts/**', 'tests/**', 'node_modules/**', '**/*.test.js'],
      all: false,
      thresholds: {
        lines: 99.87,
        functions: 100,
        branches: 98.82,
        statements: 99.87,
      },
    },
  },
});
