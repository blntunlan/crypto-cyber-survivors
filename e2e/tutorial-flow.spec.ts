import { test, expect } from '@playwright/test';

test.describe('Tutorial Flow', () => {
  // We want to test the tutorial, so we DO NOT set 'tutorial-completed' here.
  // We start with a fresh session.

  test.beforeEach(async ({ page, context }) => {
    await page.goto('/?no-sw=true');
    await context.clearCookies();
    await page.evaluate(() => {
      localStorage.clear();
      localStorage.setItem('disable_sw', 'true');
      localStorage.setItem('has_seen_landing', 'true');
      // Intentionally NOT setting tutorial-completed

      // We DO set the user to bypass nickname entry if we want to focus on tutorial content,
      // BUT normally tutorial starts AFTER nickname.
      // Let's go through the full "New User" flow: Nickname -> Tutorial.
    });
    await page.reload();
  });

  test('should guide new user through full tutorial', async ({ page }) => {
    // 1. Nickname Entry
    const nicknameInput = page.locator('input').first();
    await expect(nicknameInput).toBeVisible();
    await nicknameInput.fill('Newbie');
    await page.keyboard.press('Enter');

    // 2. Tutorial Step 1: Language Selection
    // Tutorial overlay should appear
    await expect(page.locator('.tutorial-overlay')).toBeVisible({ timeout: 10000 });
    // Check for Language Title
    await expect(page.getByText(/Language|Language/i).first()).toBeVisible();

    // Using the Tutorial Overlay "Next" flow (or clicking the option if the step requires it)
    // The first step (language) usually requires picking one or clicking next?
    // Based on config, it has NextTrigger: 'click'.
    // Let's assume we can just click "Next" or the spotlight area.

    // There should be a "Next" or "Skip" button in the tooltip
    const nextBtn = page.getByRole('button', { name: /Next|Got it/i });
    await expect(nextBtn).toBeVisible();
    await nextBtn.click();

    // 3. Tutorial Step 2: Theme Selection
    await expect(page.getByText(/Visual Style|Theme/i).first()).toBeVisible();
    await nextBtn.click();

    // 4. Tutorial Step 3: Welcome
    await expect(page.getByText(/Welcome to Crypto/i)).toBeVisible();
    await nextBtn.click();

    // 5. Steps loop... we can skip to the end or verify a few critical ones

    // Verify "How to Play" (Movement)
    await expect(page.getByText(/Movement/i)).toBeVisible();
    await nextBtn.click();

    // Speed/Dash
    await expect(page.getByText(/Dash/i)).toBeVisible();
    await nextBtn.click();

    // Position (Long/Short)
    await expect(page.getByText(/Long position/i)).toBeVisible();
    await nextBtn.click();

    // Leverage
    await expect(page.getByText(/Leverage/i)).toBeVisible();
    await nextBtn.click();

    // Skip the rest
    const skipBtn = page.getByRole('button', { name: /Skip/i });
    if (await skipBtn.isVisible()) {
      await skipBtn.click();
    }

    // 6. Should be in Hub now
    // Tutorial overlay should be gone
    await expect(page.locator('.tutorial-overlay')).not.toBeVisible();

    // Should see PLAY button
    await expect(page.getByRole('button', { name: 'PLAY' })).toBeVisible();
  });

  test('should allow skipping tutorial immediately', async ({ page }) => {
    // 1. Nickname Entry
    const nicknameInput = page.locator('input').first();
    await nicknameInput.fill('Skipper');
    await page.keyboard.press('Enter');

    // 2. Wait for Tutorial
    await expect(page.locator('.tutorial-overlay')).toBeVisible({ timeout: 10000 });

    // 3. Click Skip
    const skipBtn = page.getByRole('button', { name: /Skip/i });
    await expect(skipBtn).toBeVisible();
    await skipBtn.click();

    // 4. Verify gone
    await expect(page.locator('.tutorial-overlay')).not.toBeVisible();
    await expect(page.getByRole('button', { name: 'PLAY' })).toBeVisible();

    // 5. Reload and ensure it stays gone (persistence)
    await page.reload();
    await expect(page.locator('.tutorial-overlay')).not.toBeVisible();
  });
});
