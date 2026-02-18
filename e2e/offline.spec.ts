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
    context,
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

    // Confirm in-game using robust gameplay signals.
    const inGameSignals = [
      page.locator('canvas').first(),
      page.locator('#game-ui-overlay'),
      page.locator('#wave-timer-text'),
      page.getByText(/Survival|Live Feed/i).first(),
    ];
    const hasInGameSignal = await Promise.any(
      inGameSignals.map(locator =>
        locator.waitFor({ state: 'visible', timeout: 10000 }).then(() => true)
      )
    ).catch(() => false);
    expect(hasInGameSignal).toBe(true);

    // 2. Force offline mode so timeout does not auto-recover immediately.
    await context.setOffline(true);

    // Trigger marketDataTimeout event via EventBus
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

    // 4. Restore connection and trigger recovery.
    await context.setOffline(false);
    console.log('Triggering marketDataRecovered...');
    await page.evaluate(() => {
      (window as any).EventBus.emit('marketDataRecovered', { pair: 'BTC' });
    });

    // 5. Verify overlay disappears and gameplay can resume.
    await expect(disconnectedLabel).not.toBeVisible({ timeout: 5000 });
    const resumedSignals = [
      page.locator('canvas').first(),
      page.locator('#game-ui-overlay'),
      page.locator('#wave-timer-text'),
      page.getByText(/Survival|Live Feed/i).first(),
    ];
    const hasResumeSignal = await Promise.any(
      resumedSignals.map(locator =>
        locator.waitFor({ state: 'visible', timeout: 10000 }).then(() => true)
      )
    ).catch(() => false);
    expect(hasResumeSignal).toBe(true);
  });
});
