import { defineConfig } from 'vitest/config';
import path from 'path';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./tests/setup.ts'],
    pool: 'forks',
    include: [
      'tests/**/*.test.ts',
      'tests/**/*.test.tsx',
      'railway-market-server/test/**/*.test.ts',
    ],
    testTimeout: 15000,
    env: {
      SKIP_INTEGRATION: 'true',
    },
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      include: [
        'services/**',
        'components/**',
        'entry/**',
        'factories/**',
        'game-v2/**',
      ],
      exclude: ['**/*.d.ts', '**/index.ts'],
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    },
  },
});
