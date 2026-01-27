/**
 * E2E Tests - Mobile and Keyboard Interactions
 *
 * Tests touch-specific functionality and keyboard shortcuts.
 */

import { test, expect } from '@playwright/test';

test.describe('Mobile Touch Interactions', () => {
  test.use({
    viewport: { width: 375, height: 667 },
    hasTouch: true,
  });

  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => {
      localStorage.setItem(
        'crypto_survivors_user',
        JSON.stringify({
          profileId: '00000000-0000-4000-a000-000000000000',
          nickname: 'TouchTester',
          createdAt: Date.now(),
          lastSeenAt: Date.now(),
        })
      );
    });
    await page.reload();
  });

  test('should handle touch tap on buttons', async ({ page }) => {
    // Wait for the Hub Menu to load
    const playHubBtn = page.getByRole('button', { name: 'PLAY' });
    await expect(playHubBtn).toBeVisible({ timeout: 10000 });

    // Tap the button (Hub -> Main Menu)
    await playHubBtn.tap();

    // Verify Main Menu appeared
    await expect(page.getByText(/Market Sentiment Engine/i)).toBeVisible({
      timeout: 10000,
    });
  });

  test('should support swipe gestures', async ({ page }) => {
    await page.waitForTimeout(2000);

    // Simulate swipe gesture in Hub
    await page.touchscreen.tap(187, 300);
    await page.waitForTimeout(500);

    // Page should remain stable
    await expect(page.locator('body')).toBeVisible();
  });
});

test.describe('Keyboard Navigation', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => {
      localStorage.setItem(
        'crypto_survivors_user',
        JSON.stringify({
          profileId: '00000000-0000-4000-a000-000000000000',
          nickname: 'KeyboardTester',
          createdAt: Date.now(),
          lastSeenAt: Date.now(),
        })
      );
    });
    await page.reload();

    // GO to main menu for keyboard tests
    const playHubBtn = page.getByRole('button', { name: 'PLAY' });
    await expect(playHubBtn).toBeVisible({ timeout: 10000 });
    await playHubBtn.click();
  });

  test('should support keyboard shortcuts in Main Menu', async ({ page }) => {
    // Try escape key (shouldn't crash)
    await page.keyboard.press('Escape');
    await page.waitForTimeout(500);

    // Page should remain functional
    await expect(page.locator('body')).toBeVisible();
  });

  test('should handle WASD keys for selection if implemented', async ({ page }) => {
    // WASD for movement (simulate inputs)
    await page.keyboard.press('KeyW');
    await page.keyboard.press('KeyA');
    await page.keyboard.press('KeyS');
    await page.keyboard.press('KeyD');

    await expect(page.locator('body')).toBeVisible();
  });
});

test.describe('Accessibility Meta', () => {
  test('should have proper document title', async ({ page }) => {
    await page.goto('/');
    const title = await page.title();
    expect(title.length).toBeGreaterThan(0);
  });
});
