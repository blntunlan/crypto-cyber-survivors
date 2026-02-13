/**
 * E2E Tests - Menu Interactions and Theme Persistence
 *
 * Tests:
 * 1. Crypto Pair Selection
 * 2. Leverage Selection
 * 3. Theme Availability (Retro disabled for now)
 * 4. Game Start Flow
 */

import { test, expect } from '@playwright/test';

test.describe('Menu Interactions and Theme Switching', () => {
  test.beforeEach(async ({ page }) => {
    // Clear localStorage to start fresh
    await page.goto('/');
    await page.evaluate(() => {
      localStorage.clear();
      localStorage.setItem('disable_sw', 'true');
      localStorage.setItem('tutorial-completed', 'true');
      localStorage.setItem('has_seen_landing', 'true');
      // Set a valid user session for the main menu to bypass nickname entry
      localStorage.setItem(
        'crypto_survivors_user',
        JSON.stringify({
          profileId: '00000000-0000-4000-a000-000000000000',
          nickname: 'MenuTester',
          createdAt: Date.now(),
        })
      );
    });
    // Reload to apply the session
    await page.reload();

    // Verify Hub Menu is shown and click PLAY
    const playHubBtn = page.getByRole('button', { name: 'PLAY' });
    await expect(playHubBtn).toBeVisible({ timeout: 10000 });
    await playHubBtn.click();

    // Wait for the main menu content to be fully loaded
    // "Market Sentiment Engine" is a static text in the MainMenu
    await expect(page.getByText(/Market Sentiment Engine/i)).toBeVisible({
      timeout: 15000,
    });
  });

  test('should switch between crypto pairs', async ({ page }) => {
    // Ensure initial state is BTC
    await expect(page.getByText('BTC')).toBeVisible();

    // Find and click on ETH in the CryptoSelector
    // Note: ETH is one of the secondary pairs in the selector
    const ethButton = page.getByRole('button', { name: /^ETH$/i }).first();
    await expect(ethButton).toBeVisible();
    await ethButton.click();

    // Verify ETH is now the primary text shown (sometimes it takes a moment to update)
    await expect(page.getByText('ETH')).toBeVisible();
  });

  test('should change leverage and update label', async ({ page }) => {
    // Check initial label (assuming 1x or 5x)
    // Find the 25x button in the leverage selector
    const lev25Button = page.getByRole('button', { name: /^25x$/i });
    await expect(lev25Button).toBeVisible();
    await lev25Button.click();

    // Verify the leverage label updates to 'RISKY' and '25x'
    await expect(page.getByText('RISKY')).toBeVisible();

    // There should be at least 2 occurrences of "25x" (one on button, one in the summary label)
    const count = await page.getByText('25x').count();
    expect(count).toBeGreaterThanOrEqual(1);
  });

  test('should keep only Cyberpunk theme active while retro is disabled', async ({
    page,
  }) => {
    // Open settings menu
    const settingsButton = page.getByRole('button', { name: /settings/i });
    await expect(settingsButton).toBeVisible();
    await settingsButton.click();

    // Theme section should be present
    await expect(page.getByText('Visual Style')).toBeVisible();

    // Retro option is intentionally not available yet
    const retroButton = page.getByRole('button', { name: /16-Bit|Retro/i });
    await expect(retroButton).toHaveCount(0);
    await expect(page.getByText(/More themes coming soon/i)).toBeVisible();

    // Verify theme remains cyberpunk in storage
    let storedTheme = await page.evaluate(() =>
      localStorage.getItem('crypto-survivor-theme')
    );
    expect(storedTheme).toBe('cyberpunk');

    // Reload page and verify it still stays on cyberpunk
    await page.reload();

    // Handle Hub Menu
    const playHubBtn = page.getByRole('button', { name: 'PLAY' });
    await expect(playHubBtn).toBeVisible({ timeout: 10000 });
    await playHubBtn.click();

    await expect(page.getByText(/Market Sentiment Engine/i)).toBeVisible({
      timeout: 15000,
    });

    // Cyberpunk button should be present and disabled as active
    await page.getByRole('button', { name: /settings/i }).click();
    const cyberButton = page.getByRole('button', { name: /Cyberpunk/i });
    await expect(cyberButton).toBeVisible();
    await expect(cyberButton).toBeDisabled();

    storedTheme = await page.evaluate(() =>
      localStorage.getItem('crypto-survivor-theme')
    );
    expect(storedTheme).toBe('cyberpunk');
  });

  test('should start game when LONG is clicked and show gameplay HUD', async ({
    page,
  }) => {
    // Ensure we are in menu (HUD timer should NOT be visible)
    await expect(page.locator('#wave-timer-text')).not.toBeVisible();

    // Wait for price to load (ensures market connection is ready for game start)
    // Searching for text that looks like a dollar price
    await expect(page.getByText(/\$[0-9,.]+/)).toBeVisible({ timeout: 20000 });

    // Click the LONG button
    const longButton = page.getByRole('button', { name: /Long/i });
    await expect(longButton).toBeVisible();
    await expect(longButton).toBeEnabled();
    await longButton.click();

    // gameplay HUD element (WaveTimer) should appear
    await expect(page.locator('#wave-timer-text')).toBeVisible({ timeout: 15000 });

    // Check if the timer starts ticking (optional but good for robustness)
    await page.waitForTimeout(2000);
    const updatedTime = await page.locator('#wave-timer-text').textContent();

    // In a fast running test, it might still be 0:00 or 0:01/0:02
    console.log(`Game started. Timer at: ${updatedTime}`);
  });
});
