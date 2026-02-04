import { test, expect } from '@playwright/test';

test.describe('Offline Behavior', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => {
      localStorage.setItem('tutorial-completed', 'true');
      localStorage.setItem('has_seen_landing', 'true');
      localStorage.setItem(
        'crypto_survivors_user',
        JSON.stringify({
          profileId: '00000000-0000-4000-a000-000000000000',
          nickname: 'OfflineTester',
          createdAt: Date.now(),
        })
      );
    });
    await page.reload();
  });

  test('should show disconnected overlay when offline during gameplay', async ({
    page,
  }) => {
    // 1. Start game
    const playHubBtn = page.getByRole('button', { name: 'PLAY' });
    await expect(playHubBtn).toBeVisible();
    await playHubBtn.click();

    // Wait for price to be loaded (not "CONNECTING...")
    await expect(page.getByText('CONNECTING...')).not.toBeVisible({ timeout: 15000 });

    const longBtn = page.getByRole('button', { name: /LONG/i });
    await expect(longBtn).toBeVisible();
    await longBtn.click();

    // Confirm in-game
    await expect(page.locator('text=/LV|LVL|LEVEL/i').first()).toBeVisible({
      timeout: 10000,
    });

    // 2. Trigger marketDataTimeout event via EventBus
    console.log('Triggering marketDataTimeout...');
    await page.evaluate(() => {
      if ((window as any).EventBus) {
        (window as any).EventBus.emit('marketDataTimeout', {
          lastPriceTime: Date.now() - 31000,
          disconnectedDuration: 31000,
          pair: 'BTC',
        });
      } else {
        throw new Error('EventBus not found!');
      }
    });

    // 3. Verify disconnected overlay appears
    await expect(page.getByText('DISCONNECTED')).toBeVisible({ timeout: 5000 });
    await expect(page.getByText(/market fairness/i)).toBeVisible();

    // 4. Trigger recovery
    console.log('Triggering marketDataRecovered...');
    await page.evaluate(() => {
      (window as any).EventBus.emit('marketDataRecovered', { pair: 'BTC' });
    });

    // 5. Verify overlay disappears and we are back to MENU (as per useMarketTimeout.ts)
    await expect(page.getByText('DISCONNECTED')).not.toBeVisible({ timeout: 5000 });
    await expect(page.getByText(/Market Sentiment Engine/i)).toBeVisible();
  });
});
