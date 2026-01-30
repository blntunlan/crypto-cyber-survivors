import { chromium, type FullConfig } from '@playwright/test';

async function globalSetup(config: FullConfig) {
  const { baseURL, storageState } = config.projects[0].use;
  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();

  await page.goto(baseURL as string);
  await page.evaluate(() => {
    localStorage.setItem('has_seen_landing', 'true');
    localStorage.setItem('tutorial-completed', 'true');
    localStorage.setItem('game_lang', 'en'); // Default to English for tests
  });

  await page.context().storageState({ path: storageState as string });
  await browser.close();
}

export default globalSetup;
