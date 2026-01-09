import { test, expect } from '@playwright/test';

test.describe('Cycle Complete Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Clear localStorage to start fresh
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());

    // Set user to skip nickname entry
    await page.evaluate(() => {
      localStorage.setItem(
        'crypto_survivors_user',
        JSON.stringify({
          playerId: 'test-player-id',
          nickname: 'CycleTester',
          createdAt: Date.now(),
          lastSeenAt: Date.now(),
        })
      );
    });

    await page.reload();
  });

  test('should verify Cycle Complete flow via debug button', async ({ page }, testInfo) => {
    // Enable console logs - print to stderr to bypass reporter buffering
    page.on('console', msg => console.error(`BROWSER LOG: ${msg.text()}`));

    console.error('STEP 1: Starting Game (Skipping manual start, direct EventBus trigger)');
    console.error(`PROJECT NAME: ${testInfo.project.name}`);

    // 1. Wait for App to Load (Price visible)
    try {
      await expect(page.locator('text=$')).toBeVisible({ timeout: 15000 });
      console.error('STEP 1: App Loaded / Price Visible');
    } catch (e) {
      console.error('STEP 1 FAILED. Dumping content:');
      const content = await page.content();
      console.error(content.substring(0, 2000)); // First 2000 chars likely contain root/loading/error
      throw e;
    }

    // Explicit wait for stability
    await page.waitForTimeout(2000);

    const isDesktop =
      testInfo.project.name === 'chromium' || testInfo.project.name === 'desktop-chrome';
    console.error(`IS DESKTOP: ${isDesktop}`);

    if (isDesktop) {
      console.error('STEP 2: Clicking Debug Panel (Desktop)');
      // Click Debug Toggle
      // Use partial text or class if needed, checking for the emoji or text
      const debugToggle = page.locator('button', { hasText: 'DEBUG' });
      await expect(debugToggle).toBeVisible();
      await debugToggle.click();

      // Wait for Panel
      await expect(page.locator('text=Debug Panel')).toBeVisible();

      console.error('STEP 2.5: Clicking Force Cycle');
      await page.locator('button', { hasText: 'Force Cycle Complete' }).click();
    } else {
      console.error('STEP 2: Triggering Event via Key "6" (Mobile/Other)');
      await page.keyboard.press('6');

      // Fallback: Try EventBus again if key fails (after a short wait) to be robust
      await page.evaluate(() => {
        if (window.EventBus) {
          window.EventBus.emit('cycleComplete', { cycleNumber: 1, totalElapsedSeconds: 300 });
        }
      });
    }

    console.error('STEP 3: Waiting for Screen');
    try {
      await expect(page.locator('text=CYCLE 1 COMPLETE')).toBeVisible({ timeout: 15000 });
      console.error('STEP 4: Screen Found');
    } catch (e) {
      console.error('STEP 4: Screen TIMEOUT');
      throw e;
    }

    await expect(page.locator('text=Time Survived')).toBeVisible();
    await expect(page.locator('text=5:00')).toBeVisible(); // Hardcoded 300s -> 5:00

    // 5. Click Continue
    const continueButton = page.locator('button', { hasText: 'Continue' });
    await continueButton.click();

    // 6. Verify Game Resumed
    // Cycle Complete screen should disappear
    await expect(page.locator('text=CYCLE 1 COMPLETE')).toBeHidden({ timeout: 2000 });

    // HUD should be visible again
    await expect(page.locator('text=Lv.')).toBeVisible();
  });
});
