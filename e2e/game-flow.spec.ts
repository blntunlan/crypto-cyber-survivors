/**
 * E2E Tests - Main Game Flow
 *
 * Tests the complete user journey:
 * 1. Landing Page
 * 2. Hub Menu
 * 3. Main Menu
 * 4. Game Start
 */

import { test, expect } from './test';
import { goToMainMenuFromHub, startGameFromMainMenu } from './support/game-helpers';

async function launchFromLanding(page: import('@playwright/test').Page): Promise<void> {
  const launchButton = page
    .getByRole('button', {
      name: /EXECUTE|START|LAUNCH|BAŞLAT|landing\.hero\.start/i,
    })
    .first();
  await expect(launchButton).toBeVisible({ timeout: 15000 });
  await launchButton.click();
  await expect(page.getByRole('button', { name: /play/i }).first()).toBeVisible({
    timeout: 15000,
  });
}

test.describe('Game Flow @smoke', () => {
  test.beforeEach(async ({ context, page }) => {
    // 1. Clear all state (localStorage + cookies) to start fresh ONLY on the first try
    // Use ?no-sw=true to skip service worker which causes reload loops in E2E
    await page.goto('/?no-sw=true');
    await context.clearCookies();
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
      localStorage.setItem('disable_sw', 'true');
      localStorage.setItem('tutorial-completed', 'true');
      // Ensure menu->game transition can initialize a valid session in E2E
      localStorage.setItem(
        'crypto_survivors_user',
        JSON.stringify({
          profileId: '00000000-0000-4000-a000-000000000000',
          nickname: 'FlowTester',
          createdAt: Date.now(),
        })
      );
    });
    // Wait for the app to be ready (look for root but not necessarily content yet)
    await expect(page.locator('#root')).toBeAttached();
  });

  test('should display landing page on first visit', async ({ page }) => {
    await page.goto('/?no-sw=true');
    await expect(
      page
        .getByRole('button', {
          name: /EXECUTE|START|LAUNCH|BAŞLAT|landing\.hero\.start/i,
        })
        .first()
    ).toBeVisible({ timeout: 15000 });
  });

  test('should launch from landing and proceed to hub menu', async ({ page }) => {
    await page.goto('/?no-sw=true');

    await launchFromLanding(page);
    const hasSeenLanding = await page.evaluate(() =>
      localStorage.getItem('has_seen_landing')
    );
    expect(hasSeenLanding).toBe('true');
  });

  test('should navigate from hub to main menu and start game', async ({ page }) => {
    await page.goto('/?no-sw=true');
    await launchFromLanding(page);

    await goToMainMenuFromHub(page);
    await startGameFromMainMenu(page, 'LONG');
  });

  test('should display crypto pair selection on main menu', async ({ page }) => {
    // Skip landing via localStorage
    await page.goto('/?no-sw=true');
    await page.evaluate(() => {
      localStorage.setItem('has_seen_landing', 'true');
      localStorage.setItem(
        'crypto_survivors_user',
        JSON.stringify({
          profileId: '00000000-0000-4000-a000-000000000000',
          nickname: 'PairTester',
          createdAt: Date.now(),
          lastSeenAt: Date.now(),
        })
      );
    });
    await page.reload();

    // Hub -> Main
    await goToMainMenuFromHub(page);

    // Check for pair selection (BTC, ETH, SOL)
    await expect(page.getByRole('button', { name: /^BTC$/i }).first()).toBeVisible();
    await expect(page.getByRole('button', { name: /^ETH$/i }).first()).toBeVisible();
    await expect(page.getByRole('button', { name: /^SOL$/i }).first()).toBeVisible();
  });
});

test.describe('Performance', () => {
  test('should load within reasonable time', async ({ page }) => {
    const startTime = Date.now();
    await page.goto('/?no-sw=true');
    await page.waitForLoadState('domcontentloaded');
    const loadTime = Date.now() - startTime;
    console.log(`Page load time: ${loadTime}ms`);
    // Should load within 10 seconds
    expect(loadTime).toBeLessThan(10000);
  });
});
