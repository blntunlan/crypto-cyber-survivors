/**
 * E2E Tests - Main Game Flow
 *
 * Tests the complete user journey:
 * 1. Nickname Entry
 * 2. Hub Menu
 * 3. Main Menu
 * 4. Game Start
 * 5. Gameplay
 * 6. Game Over
 */

import { test, expect } from '@playwright/test';

test.describe('Game Flow', () => {
  test.beforeEach(async ({ context, page }) => {
    // 1. Clear all state (localStorage + cookies) to start fresh ONLY on the first try
    // Use ?no-sw=true to skip service worker which causes reload loops in E2E
    await page.goto('/?no-sw=true');
    await context.clearCookies();
    await page.evaluate(() => {
      localStorage.clear();
      localStorage.setItem('disable_sw', 'true');
    });
    // Wait for the app to be ready (look for root but not necessarily content yet)
    await expect(page.locator('#root')).toBeAttached();
  });

  test('should display nickname entry screen on first visit', async ({ page }) => {
    await page.goto('/');
    // Wait for the nickname screen to appear
    await expect(page.locator('input').first()).toBeVisible({ timeout: 10000 });
  });

  test('should allow entering nickname and proceed to hub menu', async ({ page }) => {
    await page.goto('/');

    // Enter nickname
    const nicknameInput = page.locator('input').first();
    await nicknameInput.waitFor({ state: 'visible', timeout: 10000 });
    await nicknameInput.fill('E2ETestPlayer');

    // Submit
    await page.keyboard.press('Enter');

    // Wait for Hub Menu - look for PLAY button (resilient to key name if translation slow)
    const playBtn = page.getByRole('button', { name: /PLAY|hub\.play/i });
    await expect(playBtn).toBeVisible({ timeout: 15000 });
    // Should also see the nickname in Hub
    await expect(page.locator('text=E2ETestPlayer')).toBeVisible();
  });

  test('should navigate from hub to main menu and start game', async ({ page }) => {
    await page.goto('/');

    // 1. Login
    const nicknameInput = page.locator('input').first();
    await nicknameInput.fill('FlowTester');
    await page.keyboard.press('Enter');

    // 2. Hub Menu -> Main Menu
    const playHubBtn = page.getByRole('button', { name: 'PLAY' });
    await expect(playHubBtn).toBeVisible({ timeout: 10000 });
    await playHubBtn.click();

    // 3. Main Menu -> Start Game
    const longBtn = page.getByRole('button', { name: /long/i }).first();
    await expect(longBtn).toBeVisible({ timeout: 10000 });
    await longBtn.click();

    // 4. Confirm in-game
    await expect(page.locator('text=/LV|LVL|LEVEL/i')).toBeVisible({ timeout: 15000 });
    await expect(page.locator('canvas')).toBeVisible();
  });

  test('should display crypto pair selection on main menu', async ({ page }) => {
    // Skip nickname entry via localStorage
    await page.goto('/');
    await page.evaluate(() => {
      localStorage.setItem(
        'crypto_survivors_user',
        JSON.stringify({
          playerId: '00000000-0000-4000-a000-000000000000',
          nickname: 'PairTester',
          createdAt: Date.now(),
          lastSeenAt: Date.now(),
        })
      );
    });
    await page.reload();

    // Hub -> Main
    await page.getByRole('button', { name: 'PLAY' }).click();

    // Check for pair selection (BTC, ETH, SOL)
    await expect(page.getByRole('button', { name: /btc/i }).first()).toBeVisible();
    await expect(page.getByRole('button', { name: /eth/i }).first()).toBeVisible();
    await expect(page.getByRole('button', { name: /sol/i }).first()).toBeVisible();
  });
});

test.describe('Performance', () => {
  test('should load within reasonable time', async ({ page }) => {
    const startTime = Date.now();
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
    const loadTime = Date.now() - startTime;
    console.log(`Page load time: ${loadTime}ms`);
    // Should load within 10 seconds
    expect(loadTime).toBeLessThan(10000);
  });
});
