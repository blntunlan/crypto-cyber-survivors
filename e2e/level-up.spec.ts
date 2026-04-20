import { test, expect } from './test';
import { goToMainMenuFromHub } from './support/game-helpers';

test.describe('Level Up Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Capture console for debugging
    page.on('console', msg => console.log(`BROWSER [${msg.type()}]: ${msg.text()}`));

    await page.goto('/?no-sw=true');
    await page.evaluate(() => {
      localStorage.setItem('tutorial-completed', 'true');
      localStorage.setItem('has_seen_landing', 'true');
      localStorage.setItem(
        'crypto_survivors_user',
        JSON.stringify({
          profileId: '00000000-0000-4000-a000-000000000000',
          nickname: 'LevelTester',
          createdAt: Date.now(),
          lastSeenAt: Date.now(),
        })
      );
    });
    await page.reload();
  });

  test('should show level up screen when XP is gained', async ({ page }) => {
    // Handle Hub Menu (Click PLAY)
    await goToMainMenuFromHub(page);

    const playButton = page.getByRole('button', { name: /LONG/i });
    await expect(playButton).toBeVisible();

    // Small wait to ensure market data is loaded (price > 0)
    await page.waitForTimeout(2000);
    await playButton.click();

    // Verify HUD elements appear to confirm we are in-game
    // Use a more generic selector that matches the wave phase text (ACTIVE)
    const phaseText = page.locator('text=/ACTIVE/i').first();
    await expect(phaseText).toBeVisible({ timeout: 10000 });

    // Trigger Level Up directly via exposed helper

    console.log('Triggering Level Up via GameHelpers...');
    await page.evaluate(() => {
      if ((window as any).GameHelpers) {
        (window as any).GameHelpers.triggerLevelUp();
      } else {
        throw new Error('GameHelpers not found!');
      }
    });

    // Verify state transition via debug overlay

    // Level up screen should appear
    await expect(page.getByText(/LEVEL UP/i)).toBeVisible({ timeout: 10000 });

    // Wait for slot reels to stop (~4 seconds)
    // We can wait for the 'Choose your upgrade' instruction or 'Select' buttons
    await expect(page.getByText(/Choose your upgrade/i)).toBeVisible({
      timeout: 10000,
    });

    // Should show 3 cards (buttons) when stopped
    const cards = page.locator('button.group');
    await expect(cards).toHaveCount(3);
  });

  test('should allow selecting a card and resume game', async ({ page }) => {
    // Handle Hub Menu (Click PLAY)
    await goToMainMenuFromHub(page);

    const playButton = page.getByRole('button', { name: /LONG/i });
    await expect(playButton).toBeVisible();
    await page.waitForTimeout(2000);
    await playButton.click();

    // Verify game started
    const phaseText = page.locator('text=/ACTIVE/i').first();
    await expect(phaseText).toBeVisible({ timeout: 10000 });

    // Trigger Level Up
    await page.evaluate(() => {
      if ((window as any).GameHelpers) {
        (window as any).GameHelpers.triggerLevelUp();
      } else {
        throw new Error('GameHelpers not found!');
      }
    });

    // Wait for level up screen and reels to stop
    await expect(page.getByText(/Choose your upgrade/i)).toBeVisible({
      timeout: 10000,
    });

    // Click the first card
    const firstCard = page.locator('button.group').first();
    await firstCard.click();

    // Level up screen should disappear
    await expect(page.getByText(/LEVEL UP/i)).not.toBeVisible();

    // HUD should still be visible (game resumed)
    await expect(page.locator('text=/LV|LVL|LEVEL/i').first()).toBeVisible();
  });
});
