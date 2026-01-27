import { test, expect } from '@playwright/test';

test.describe('Cycle Complete Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Clear localStorage to start fresh
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());

    // Set user to skip nickname entry
    await page.evaluate(() => {
      localStorage.setItem('tutorial-completed', 'true');
      localStorage.setItem(
        'crypto_survivors_user',
        JSON.stringify({
          profileId: '00000000-0000-4000-a000-000000000000',
          nickname: 'CycleTester',
          createdAt: Date.now(),
          lastSeenAt: Date.now(),
        })
      );
    });

    await page.reload();
  });

  test('should verify Cycle Complete flow via debug button', async ({
    page,
  }, testInfo) => {
    // Enable console logs - print to stderr to bypass reporter buffering
    page.on('console', msg => console.error(`BROWSER LOG: ${msg.text()}`));

    console.error(
      'STEP 1: Starting Game (Skipping manual start, direct EventBus trigger)'
    );
    console.error(`PROJECT NAME: ${testInfo.project.name}`);

    // 1b. Handle Hub Menu (Click PLAY)
    const playHubBtn = page.getByRole('button', { name: 'PLAY' });
    await expect(playHubBtn).toBeVisible({ timeout: 10000 });
    await playHubBtn.click();

    // 1. Wait for App to Load (Price visible - Main Menu)
    try {
      await expect(page.locator('text=$')).toBeVisible({ timeout: 15000 });
      console.error('STEP 1: App Loaded / Price Visible');
    } catch (e) {
      console.error('STEP 1 FAILED. Dumping content:');
      const content = await page.content();
      console.error(content.substring(0, 2000));
      throw e;
    }

    // Explicit wait for stability
    await page.waitForTimeout(2000);

    const isDesktop =
      testInfo.project.name === 'chromium' ||
      testInfo.project.name === 'desktop-chrome';
    console.error(`IS DESKTOP: ${isDesktop}`);

    // Use EventBus to trigger cycle complete for both Desktop and Mobile
    // This is more reliable than UI interactions which may vary by platform or environment
    console.error(
      `STEP 2: Triggering Event via EventBus (Platform: ${isDesktop ? 'Desktop' : 'Mobile'})`
    );

    await page.evaluate(() => {
      if ((window as any).GameHelpers) {
        (window as any).GameHelpers.triggerCycleComplete();
      } else {
        // Fallback or Error
        console.warn('GameHelpers not found, trying EventBus directly');
        (window as any).EventBus?.emit('cycleComplete', {
          cycleNumber: 1,
          totalElapsedSeconds: 300,
        });
      }
    });

    console.error('STEP 3: Waiting for Screen');
    try {
      await expect(page.locator('text=/CYCLE \\d+ COMPLETE/i')).toBeVisible({
        timeout: 15000,
      });
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
    await expect(page.locator('text=/LVL|LEVEL/i')).toBeVisible();
  });
});
