import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { test as base, expect } from '@playwright/test';

const currentDir = path.dirname(fileURLToPath(import.meta.url));
const runtimeMocksPath = path.join(currentDir, 'support', 'runtime-mocks.js');

export const test = base.extend({
  page: async ({ page }, use) => {
    await page.addInitScript({ path: runtimeMocksPath });
    await use(page);
  },
});

export { expect };
export type { Page } from '@playwright/test';
