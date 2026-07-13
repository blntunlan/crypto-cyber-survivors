import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium, type FullConfig } from '@playwright/test';

const currentDir = path.dirname(fileURLToPath(import.meta.url));
const runtimeMocksPath = path.join(currentDir, 'support', 'runtime-mocks.js');

async function globalSetup(config: FullConfig) {
  const project = config.projects[0];
  if (!project) {
    throw new Error('No projects found in Playwright config');
  }
  const { baseURL, storageState } = project.use;
  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();
  await page.addInitScript({ path: runtimeMocksPath });

  await page.goto(baseURL as string, {
    waitUntil: 'commit',
    timeout: 30_000,
  });
  await page.evaluate(() => {
    localStorage.setItem('has_seen_landing', 'true');
    localStorage.setItem('tutorial-completed', 'true');
    localStorage.setItem('game_lang', 'en'); // Default to English for tests
  });
  await page.locator('#root > *').first().waitFor({
    state: 'visible',
    timeout: 150_000,
  });

  await page.context().storageState({ path: storageState as string });
  await browser.close();
}

export default globalSetup;
