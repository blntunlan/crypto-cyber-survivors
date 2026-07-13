import { test, expect } from './test';
import { goToMainMenuFromHub } from './support/game-helpers';

/**
 * @deprecated AI Director V2: Wave system removed
 *
 * These tests verify that the debug contract reports a static "Active"
 * phase instead of cycling through time-based wave phases.
 */
test.describe('Difficulty System (AI Director V2)', () => {
  test.beforeEach(async ({ page }) => {
    // Capture console logs
    page.on('console', msg => {
      console.log(`BROWSER [${msg.type()}]: ${msg.text()}`);
    });

    // Set localStorage to skip nickname entry and start with a known state
    await page.goto('/?no-sw=true');
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
    await goToMainMenuFromHub(page);
  });

  test('should report static "Active" phase (AI Director V2)', async ({ page }) => {
    await page.getByRole('button', { name: /LONG/i }).click();
    await expect(page.getByRole('button', { name: /Pause Game/i })).toBeVisible();

    await expect
      .poll(() => page.evaluate(() => window.gameDebug.snapshot().difficulty.wavePhase))
      .toBe('active');

    console.log('Jumping to 50s...');
    await page.evaluate(() => window.gameDebug.timeJump(50));
    await expect
      .poll(() => page.evaluate(() => window.gameDebug.snapshot().difficulty.wavePhase))
      .toBe('active');

    console.log('Jumping to 150s...');
    await page.evaluate(() => window.gameDebug.timeJump(150));
    await expect
      .poll(() => page.evaluate(() => window.gameDebug.snapshot().difficulty.wavePhase))
      .toBe('active');

    console.log('Jumping to 250s...');
    await page.evaluate(() => window.gameDebug.timeJump(250));
    await expect
      .poll(() => page.evaluate(() => window.gameDebug.snapshot().difficulty.wavePhase))
      .toBe('active');
  });

  test('should keep gameplay active after a large time jump', async ({ page }) => {
    await page.getByRole('button', { name: /LONG/i }).click();
    await expect(page.getByRole('button', { name: /Pause Game/i })).toBeVisible();

    await page.evaluate(() => window.gameDebug.timeJump(250));
    const snapshot = await page.evaluate(() => window.gameDebug.snapshot());
    expect(snapshot.gameState).toBe('PLAYING');
    expect(snapshot.difficulty.wavePhase).toBe('active');
    expect(snapshot.difficulty.totalElapsedSeconds).toBeGreaterThanOrEqual(250);
  });
});
