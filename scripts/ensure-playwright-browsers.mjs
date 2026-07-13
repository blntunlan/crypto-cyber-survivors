import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { chromium, firefox, webkit } from '@playwright/test';

const browserTypes = new Map([
  ['chromium', chromium],
  ['firefox', firefox],
  ['webkit', webkit],
]);
const requestedBrowsers =
  process.argv.length > 2 ? process.argv.slice(2) : [...browserTypes.keys()];
const unknownBrowsers = requestedBrowsers.filter(name => !browserTypes.has(name));

if (unknownBrowsers.length > 0) {
  console.error(`Unsupported Playwright browsers: ${unknownBrowsers.join(', ')}`);
  process.exit(1);
}

const installTimeout = Number(process.env.PLAYWRIGHT_INSTALL_TIMEOUT_MS ?? 1_200_000);
if (!Number.isFinite(installTimeout) || installTimeout <= 0) {
  console.error('PLAYWRIGHT_INSTALL_TIMEOUT_MS must be a positive number.');
  process.exit(1);
}

const require = createRequire(import.meta.url);
const playwrightCli = require.resolve('@playwright/test/cli');
const installResult = spawnSync(
  process.execPath,
  [playwrightCli, 'install', ...requestedBrowsers],
  {
    env: {
      ...process.env,
      PLAYWRIGHT_DOWNLOAD_CONNECTION_TIMEOUT:
        process.env.PLAYWRIGHT_DOWNLOAD_CONNECTION_TIMEOUT ?? '120000',
    },
    stdio: 'inherit',
    timeout: installTimeout,
  }
);

if (installResult.error) {
  console.error(`Playwright browser install failed: ${installResult.error.message}`);
  process.exit(1);
}

if (installResult.status !== 0) {
  process.exit(installResult.status ?? 1);
}

for (const browserName of requestedBrowsers) {
  const browserType = browserTypes.get(browserName);
  if (!browserType) {
    process.exit(1);
  }

  try {
    const browser = await browserType.launch({ headless: true });
    await browser.close();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`Playwright ${browserName} launch check failed: ${message}`);
    process.exit(1);
  }
}

console.log(`Verified Playwright browsers: ${requestedBrowsers.join(', ')}`);
