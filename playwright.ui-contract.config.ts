import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  testMatch: 'ui-contract.visual.spec.ts',
  timeout: 120 * 1000,
  expect: {
    timeout: 15_000,
  },
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  globalSetup: './e2e/global-setup',
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: [['html', { open: 'never' }], ['list']],
  use: {
    baseURL: 'http://localhost:3000?no-sw=true',
    storageState: 'e2e/storage-state.json',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'on-first-retry',
    contextOptions: {
      ignoreHTTPSErrors: true,
    },
  },
  projects: [
    {
      name: 'ui-contract-chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: {
    command: 'npx vite',
    url: 'http://localhost:3000',
    reuseExistingServer: true,
    timeout: 180 * 1000,
  },
});
