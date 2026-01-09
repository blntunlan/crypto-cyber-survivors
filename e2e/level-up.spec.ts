import { test, expect } from '@playwright/test';

test.describe('Level Up Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Capture console for debugging
    page.on('console', msg => console.log(`BROWSER [${msg.type()}]: ${msg.text()}`));

    await page.goto('/');
    await page.evaluate(() => {
      localStorage.setItem(
        'crypto_survivors_user',
        JSON.stringify({
          playerId: 'e2e-tester',
          nickname: 'LevelTester',
          createdAt: Date.now(),
          lastSeenAt: Date.now(),
        })
      );
    });
    await page.reload();
  });

  test('should show level up screen when XP is gained', async ({ page }) => {
    const playButton = page.getByRole('button', { name: /LONG/i });
    await expect(playButton).toBeVisible();

    // Small wait to ensure market data is loaded (price > 0)
    await page.waitForTimeout(2000);
    await playButton.click();

    // Verify HUD elements appear
    const phaseText = page.locator('span.font-black.uppercase.italic').first();
    await expect(phaseText).toBeVisible({ timeout: 10000 });

    // Force level up via 'L' key
    console.log('Pressing L to level up...');
    await page.keyboard.press('l');

    // Level up screen should appear
    await expect(page.getByText(/LEVEL UP/i)).toBeVisible({ timeout: 10000 });

    // Wait for slot reels to stop (~4 seconds)
    // We can wait for the 'Choose your upgrade' instruction or 'Select' buttons
    await expect(page.getByText(/Choose your upgrade/i)).toBeVisible({ timeout: 10000 });

    // Should show 3 cards (buttons) when stopped
    const cards = page.locator('button.group');
    await expect(cards).toHaveCount(3);
  });

  test('should allow selecting a card and resume game', async ({ page }) => {
    const playButton = page.getByRole('button', { name: /LONG/i });
    await expect(playButton).toBeVisible();
    await page.waitForTimeout(2000);
    await playButton.click();

    await page.keyboard.press('l');

    // Wait for level up screen and reels to stop
    await expect(page.getByText(/Choose your upgrade/i)).toBeVisible({ timeout: 10000 });

    // Click the first card
    const firstCard = page.locator('button.group').first();
    await firstCard.click();

    // Level up screen should disappear
    await expect(page.getByText(/LEVEL UP/i)).not.toBeVisible();

    // HUD should still be visible (game resumed)
    await expect(page.locator('text=/LVL|LEVEL/i')).toBeVisible();
  });
});
