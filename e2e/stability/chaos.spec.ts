import { test, expect } from '@playwright/test';

test.describe('Chaos Monkey Stability Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Capture console errors
    // The 'errors' array was declared but never used. Removing it as per instruction.
    page.on('console', msg => {
      if (msg.type() === 'error') {
        // If console errors need to be asserted later, the 'errors' array should be re-introduced
        // and its contents checked. For now, just logging the error.
        console.error(`Console error: ${msg.text()}`);
      }
    });

    // Mock user to skip intro
    await page.addInitScript(() => {
      localStorage.setItem(
        'crypto_survivors_user',
        JSON.stringify({
          playerId: '00000000-0000-4000-a000-000000000000',
          nickname: 'ChaosBot',
          createdAt: Date.now(),
          lastSeenAt: Date.now(),
        })
      );
    });

    await page.goto('/');

    // Navigate to Main Menu if on Hub
    const playHubBtn = page.getByRole('button', { name: 'PLAY' });
    await expect(playHubBtn).toBeVisible({ timeout: 10000 });
    await playHubBtn.click();
  });

  test('should survive random input spam in Main Menu', async ({ page }) => {
    // Wait for menu (LONG button is a good indicator of main menu)
    const longButton = page.getByRole('button', { name: /LONG/i }).first();
    await expect(longButton).toBeVisible({ timeout: 15000 });

    // Click random coordinates for 5 seconds
    const box = await page.evaluate(() => {
      return { w: window.innerWidth, h: window.innerHeight };
    });

    console.log('Starting random click spam...');
    const duration = 5000;
    const end = Date.now() + duration;

    while (Date.now() < end) {
      const x = Math.floor(Math.random() * box.w);
      const y = Math.floor(Math.random() * box.h);

      try {
        await page.mouse.click(x, y);
      } catch {
        // Ignore click errors (e.g. clicking on disabled elements)
      }

      // Small delay to be realistic-ish
      await page.waitForTimeout(50);
    }

    // Assert application is still alive and hasn't crashed
    // We check for either the start button, or the in-game HUD if a click started the game
    const anyStateIndicator = page.locator('text=/LONG|SHORT|PLAY|LEVEL|LVL/i').first();
    await expect(anyStateIndicator).toBeVisible();

    // Explicitly check for Error Boundary text
    await expect(page.locator('body')).not.toContainText(
      /Something went wrong|LIQUIDATED/i
    );
  });

  test('should survive random key mashing during gameplay', async ({ page }) => {
    // Start game
    const longButton = page.getByRole('button', { name: /LONG/i }).first();
    await expect(longButton).toBeVisible({ timeout: 30000 });

    // Ensure enabled (price loaded)
    await expect(longButton).toBeEnabled({ timeout: 30000 });
    await longButton.click();

    // Verify game started
    await expect(page.locator('text=/WARMUP|BUILDUP/i').first()).toBeVisible({
      timeout: 15000,
    });

    console.log('Starting random key mash...');
    const keys = [
      'ArrowUp',
      'ArrowDown',
      'ArrowLeft',
      'ArrowRight',
      ' ',
      'Enter',
      'Escape',
      'w',
      'a',
      's',
      'd',
    ];

    const duration = 5000;
    const end = Date.now() + duration;

    while (Date.now() < end) {
      const key = keys[Math.floor(Math.random() * keys.length)] as string;
      await page.keyboard.press(key);
      await page.waitForTimeout(50);
    }

    // Assert game is still running (HUD visible)
    await expect(page.locator('text=/LVL|LEVEL/i')).toBeVisible();
  });
});
