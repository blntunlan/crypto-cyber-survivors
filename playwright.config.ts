import { defineConfig, devices } from '@playwright/test';

const chromeExecutablePath = process.env.PLAYWRIGHT_CHROME_EXECUTABLE_PATH;
const chromeLaunchOptions = chromeExecutablePath
  ? {
      launchOptions: {
        executablePath: chromeExecutablePath,
      },
    }
  : {};

/**
 * Playwright E2E Test Configuration
 *
 * Run: npm run test:e2e
 * Debug: npm run test:e2e:debug
 */
export default defineConfig({
  testDir: './e2e',

  // Max time for a single test
  timeout: 90 * 1000,

  // Max time for expect() assertions
  expect: {
    timeout: 10000,
  },

  // Run tests in parallel
  fullyParallel: true,

  // Fail the build on CI if test.only was left
  forbidOnly: !!process.env.CI,

  globalSetup: './e2e/global-setup',

  // Retry on CI only
  retries: process.env.CI ? 2 : 0,

  // Limit workers. The full browser matrix is resource-heavy enough that 50%
  // local parallelism can starve the Vite dev server and produce connection flakes.
  workers: process.env.CI ? 1 : 4,

  // Reporter
  reporter: [['html', { open: 'never' }], ['list']],

  // Shared settings
  use: {
    // Base URL for all tests
    baseURL: 'http://localhost:3000?no-sw=true',

    storageState: 'e2e/storage-state.json',

    // Collect trace on failure
    trace: 'on-first-retry',

    // Screenshot on failure
    screenshot: 'only-on-failure',

    // Video on failure
    video: 'on-first-retry',

    // Disable service worker in tests
    contextOptions: {
      ignoreHTTPSErrors: true,
    },
  },

  // Projects for different browsers
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'], ...chromeLaunchOptions },
    },

    {
      name: 'mobile-chrome',
      use: { ...devices['Pixel 5'], ...chromeLaunchOptions },
    },

    {
      name: 'firefox',
      workers: 1,
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },
  ],

  // Run local dev server before starting tests
  webServer: {
    command: 'npx vite',
    url: 'http://localhost:3000',
    reuseExistingServer: true,
    timeout: 180 * 1000,
  },
});
