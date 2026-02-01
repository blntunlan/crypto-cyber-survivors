import { test, expect } from '@playwright/test';

/**
 * @deprecated AI Director V2: Wave system removed
 *
 * These tests now verify that the system shows a static "Active" phase
 * instead of cycling through wave phases. The difficulty is now driven
 * by market conditions rather than time-based waves.
 */
test.describe('Difficulty System (AI Director V2)', () => {
  test.beforeEach(async ({ page }) => {
    // Capture console logs
    page.on('console', msg => {
      console.log(`BROWSER [${msg.type()}]: ${msg.text()}`);
    });

    // Set localStorage to skip nickname entry and start with a known state
    await page.goto('/');
    await page.evaluate(() => {
      localStorage.setItem(
        'crypto_survivors_user',
        JSON.stringify({
          profileId: '00000000-0000-4000-a000-000000000000',
          nickname: 'WaveTester',
          createdAt: Date.now(),
          lastSeenAt: Date.now(),
        })
      );
    });
    await page.reload();

    // Handle Hub Menu (Click PLAY)
    const playHubBtn = page.getByRole('button', { name: 'PLAY' });
    await expect(playHubBtn).toBeVisible({ timeout: 10000 });
    await playHubBtn.click();
  });

  test('should display static "Active" phase (AI Director V2)', async ({ page }) => {
    // Start game
    await page.getByRole('button', { name: /LONG/i }).click();

    // Specific locator for the phase text
    const phaseValue = page.locator('span.font-black.uppercase.italic').first();

    // Should always show "Active" regardless of time
    await expect(phaseValue).toHaveText(/active/i);

    // Jump forward in time - should still show "Active"
    console.log('Jumping to 50s...');
    await page.evaluate(() => window.gameDebug.timeJump(50));
    await expect(phaseValue).toHaveText(/active/i);

    // Jump to 150s - should still show "Active"
    console.log('Jumping to 150s...');
    await page.evaluate(() => window.gameDebug.timeJump(150));
    await expect(phaseValue).toHaveText(/active/i);

    // Jump to 250s - should still show "Active"
    console.log('Jumping to 250s...');
    await page.evaluate(() => window.gameDebug.timeJump(250));
    await page.waitForTimeout(500);
    await expect(phaseValue).toHaveText(/active/i);
  });

  test('should show cyan color for Active phase', async ({ page }) => {
    await page.getByRole('button', { name: /LONG/i }).click();

    const phaseValue = page.locator('span.font-black.uppercase.italic').first();

    // Active phase should always be cyan (text-cyan-400)
    await expect(phaseValue).toHaveClass(/text-cyan-400/);

    // Even after time jump, should remain cyan
    await page.evaluate(() => window.gameDebug.timeJump(250));
    await page.waitForTimeout(500);
    await expect(phaseValue).toHaveClass(/text-cyan-400/);
  });
});
