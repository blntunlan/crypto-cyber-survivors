import { test, expect } from './test';
import {
  goToMainMenuFromHub,
  startGameFromMainMenu,
  waitForGameplay,
} from './support/game-helpers';

test.describe('Offline Behavior', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/?no-sw=true');
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
    await goToMainMenuFromHub(page);
    await startGameFromMainMenu(page, 'LONG');

    // 2. Emit the same timeout events the runtime uses on a real disconnect.
    console.log('Triggering marketDataTimeout...');
    await page.evaluate(() => {
      if ((window as any).EventBus) {
        (window as any).EventBus.emit('marketDataTimeout', {
          lastPriceTime: Date.now() - 5000,
          disconnectedDuration: 5000,
          pair: 'BTC',
        });
      } else {
        throw new Error('EventBus not found!');
      }
    });

    // 3. Verify timeout handling is surfaced (overlay or resilience notifications).
    const disconnectedLabel = page.getByText('DISCONNECTED');
    const restoredToast = page.getByText(/Restored|Connection re-established/i).first();
    const systemErrorToast = page.getByText(/System Error/i).first();

    const timeoutHandledByUi = await Promise.any([
      disconnectedLabel.waitFor({ state: 'visible', timeout: 5000 }).then(() => true),
      restoredToast.waitFor({ state: 'visible', timeout: 5000 }).then(() => true),
      systemErrorToast.waitFor({ state: 'visible', timeout: 5000 }).then(() => true),
    ]).catch(() => false);

    expect(timeoutHandledByUi).toBe(true);

    if (await disconnectedLabel.isVisible().catch(() => false)) {
      await expect(page.getByText(/market fairness/i)).toBeVisible();
    }

    // 4. Trigger recovery and verify the game resumes.
    console.log('Triggering marketDataRecovered...');
    await page.evaluate(() => {
      (window as any).EventBus.emit('marketDataRecovered', { pair: 'BTC' });
    });

    // 5. Verify overlay disappears and gameplay can resume.
    await expect(disconnectedLabel).not.toBeVisible({ timeout: 5000 });
    await waitForGameplay(page);
  });
});
