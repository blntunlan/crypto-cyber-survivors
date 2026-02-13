/**
 * E2E Tests - Z-Index Screen Stacking
 *
 * Tests that overlay screens (GameOver, Settings, Pause) correctly
 * stack above gameplay HUD elements.
 */

import { test, expect } from '@playwright/test';

test.describe('Z-Index Screen Stacking', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/?no-sw=true');
    await page.evaluate(() => {
      localStorage.clear();
      localStorage.setItem('disable_sw', 'true');
      localStorage.setItem('tutorial-completed', 'true');
      localStorage.setItem('has_seen_landing', 'true');
      localStorage.setItem('game_lang', 'en');
      localStorage.setItem(
        'crypto_survivors_user',
        JSON.stringify({
          profileId: '00000000-0000-4000-a000-000000000000',
          nickname: 'ZIndexTester',
          createdAt: Date.now(),
        })
      );
    });
    await page.reload();

    // Navigate to Main Menu
    const playHubBtn = page.getByRole('button', { name: 'PLAY' });
    await expect(playHubBtn).toBeVisible({ timeout: 10000 });
    await playHubBtn.click();
    await expect(page.getByText(/Market Sentiment Engine/i)).toBeVisible({
      timeout: 15000,
    });
  });

  test('Settings panel should appear above HUD elements', async ({ page }) => {
    // Start game
    await page.getByRole('button', { name: /Long/i }).click();
    await expect(page.locator('#wave-timer-text')).toBeVisible({ timeout: 15000 });

    // Open pause menu first (Escape key)
    await page.keyboard.press('Escape');
    await expect(page.getByText(/PAUSED/i)).toBeVisible({ timeout: 5000 });

    // Open settings from pause menu
    const settingsButton = page.getByRole('button', { name: /settings/i });
    await expect(settingsButton).toBeVisible();
    await settingsButton.click();

    // Settings panel should be visible and above pause menu
    await expect(
      page.getByRole('heading', {
        name: /Settings|settings\.title/i,
      })
    ).toBeVisible({ timeout: 5000 });
    await expect(page.getByText(/Visuals|settings\.visuals/i)).toBeVisible({
      timeout: 5000,
    });

    // Close settings
    const closeButton = page.getByRole('button', { name: /Close|settings\.close/i });
    await expect(closeButton).toBeVisible();
    await closeButton.click();

    // Pause menu should still be visible
    await expect(page.getByText(/PAUSED/i)).toBeVisible();
  });

  test('Pause menu should appear above gameplay HUD', async ({ page }) => {
    // Start game
    await page.getByRole('button', { name: /Long/i }).click();
    await expect(page.locator('#wave-timer-text')).toBeVisible({ timeout: 15000 });

    // Open pause menu
    await page.keyboard.press('Escape');
    await expect(page.getByText(/PAUSED/i)).toBeVisible({ timeout: 5000 });

    // Resume button should be clickable (not blocked by HUD)
    const resumeButton = page.getByRole('button', { name: /resume/i });
    await expect(resumeButton).toBeVisible();
    await resumeButton.click();

    // Pause menu should close, game should continue
    await expect(page.getByText(/PAUSED/i)).not.toBeVisible();
    await expect(page.locator('#wave-timer-text')).toBeVisible();
  });

  test('GameOver screen should appear above all HUD elements', async ({ page }) => {
    // Start game
    await page.getByRole('button', { name: /Long/i }).click();
    await expect(page.locator('#wave-timer-text')).toBeVisible({ timeout: 15000 });

    // Trigger game over via test helper (cheat key '4' now changes luck)
    await expect
      .poll(
        async () =>
          await page.evaluate(() =>
            Boolean((window as { GameHelpers?: unknown }).GameHelpers)
          ),
        { timeout: 5000 }
      )
      .toBe(true);
    await page.evaluate(() => {
      const helpers = (window as { GameHelpers?: { triggerGameOver?: () => void } })
        .GameHelpers;
      helpers?.triggerGameOver?.();
    });

    // GameOver (LIQUIDATED) screen should be visible
    await expect(page.getByText(/LIQUIDATED/i)).toBeVisible({ timeout: 5000 });

    // Back to Terminal button should be clickable
    const backButton = page.getByRole('button', { name: /Back to Terminal/i });
    await expect(backButton).toBeVisible();
    await backButton.click();

    // Should be back at Hub Menu
    await expect(page.getByRole('button', { name: 'PLAY' })).toBeVisible({
      timeout: 10000,
    });
  });

  test('LevelUp screen should appear above gameplay HUD', async ({ page }) => {
    // Start game
    await page.getByRole('button', { name: /Long/i }).click();
    await expect(page.locator('#wave-timer-text')).toBeVisible({ timeout: 15000 });

    // Trigger level up via cheat (key 'L')
    await page.keyboard.press('L');

    // Wait for level up screen - look for upgrade cards or level up text
    await expect(page.getByText(/Level Up|Choose|Select/i).first()).toBeVisible({
      timeout: 5000,
    });
  });
});
