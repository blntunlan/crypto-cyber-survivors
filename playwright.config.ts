import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright E2E Test Configuration
 *
 * Run: npm run test:e2e
 * Debug: npm run test:e2e:debug
 */
export default defineConfig({
  testDir: './e2e',

  // Max time for a single test
  timeout: 30 * 1000,

  // Max time for expect() assertions
  expect: {
    timeout: 5000,
  },

  // Run tests in parallel
  fullyParallel: true,

  // Fail the build on CI if test.only was left
  forbidOnly: !!process.env.CI,

  // Retry on CI only
  retries: process.env.CI ? 2 : 0,

  // Limit workers on CI
  workers: process.env.CI ? 1 : undefined,

  // Reporter
  reporter: [['html', { open: 'never' }], ['list']],

  // Shared settings
  use: {
    // Base URL for all tests
    baseURL: 'http://localhost:3000',

    // Collect trace on failure
    trace: 'on-first-retry',

    // Screenshot on failure
    screenshot: 'only-on-failure',

    // Video on failure
    video: 'on-first-retry',
  },

  // Projects for different browsers
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },

    {
      name: 'mobile-chrome',
      use: { ...devices['Pixel 5'] },
    },

    // Uncomment for Firefox/Safari testing
    // {
    //   name: 'firefox',
    //   use: { ...devices['Desktop Firefox'] },
    // },
    // {
    //   name: 'webkit',
    //   use: { ...devices['Desktop Safari'] },
    // },
  ],

  // Run local dev server before starting tests
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: true,
    timeout: 120 * 1000,
  },
});
