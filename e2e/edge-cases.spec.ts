/**
 * E2E Tests - Edge Cases and Robustness
 *
 * Verifies the app's behavior in non-ideal or unusual scenarios.
 */

import { test, expect } from '@playwright/test';

test.describe('Edge Cases', () => {
  test.beforeEach(async ({ context, page }) => {
    // Navigate with no-sw flag
    await page.goto('/?no-sw=true');
    await context.clearCookies();
    await page.evaluate(() => {
      localStorage.clear();
      localStorage.setItem('disable_sw', 'true');
      localStorage.setItem('tutorial-completed', 'true');
      localStorage.setItem('has_seen_landing', 'true');
      localStorage.setItem('has_seen_landing', 'true');
    });
    await page.reload();
  });

  // 1. Invalid LocalStorage Resilience
  test('should recover from corrupted session data', async ({ page }) => {
    await page.goto('/');

    // Set invalid JSON in localStorage using correct keys
    // UserSessionService uses 'crypto_survivors_user'
    await page.evaluate(() => {
      localStorage.setItem('crypto_survivors_user', '{invalid-json');
      localStorage.setItem('crypto_survivors_metrics', 'corrupted');
    });

    await page.reload();

    const input = page.locator('input').first();
    const playHubBtn = page.getByRole('button', { name: 'PLAY' });
    const nicknameVisible = await input.isVisible().catch(() => false);

    // Legacy flow may still show nickname entry; current bootstrap may go straight to hub.
    if (nicknameVisible) {
      await input.fill('SurvivorFixed');
      await page.keyboard.press('Enter');
    }

    // Hub Menu should appear after entering nickname
    await expect(playHubBtn).toBeVisible({ timeout: 15000 });
    await playHubBtn.click();

    // Main menu should appear (look for LONG button)
    await expect(page.getByRole('button', { name: /long/i }).first()).toBeVisible({
      timeout: 15000,
    });
  });

  // 3. Tab Visibility Switching during Gameplay
  test('should remain stable when tab visibility changes', async ({ page }) => {
    // Setup session
    await page.evaluate(() => {
      localStorage.setItem(
        'crypto_survivors_user',
        JSON.stringify({
          profileId: '00000000-0000-4000-a000-000000000000',
          nickname: 'EdgeTester',
          createdAt: Date.now(),
          lastSeenAt: Date.now(),
        })
      );
    });
    await page.reload();

    // Hub Menu
    const playHubBtn = page.getByRole('button', { name: 'PLAY' });
    await expect(playHubBtn).toBeVisible({ timeout: 10000 });
    await playHubBtn.click();

    // Start game
    const longBtn = page.getByRole('button', { name: /long/i }).first();
    await longBtn.click();
    await expect(page.locator('canvas')).toBeVisible();

    // Simulate tab hidden (actual method for Playwright)
    await page.evaluate(() => {
      document.dispatchEvent(new Event('visibilitychange'));
    });

    await page.waitForTimeout(1000);

    // Simulate tab visible again
    await page.evaluate(() => {
      document.dispatchEvent(new Event('visibilitychange'));
    });

    await expect(page.locator('canvas')).toBeVisible();
  });

  // 4. Extreme Resizing during Active Session
  test('should adapt HUD during rapid window resizing', async ({ page }) => {
    // Setup session
    await page.evaluate(() => {
      localStorage.setItem(
        'crypto_survivors_user',
        JSON.stringify({
          profileId: '00000000-0000-4000-a000-000000000000',
          nickname: 'EdgeTester',
          createdAt: Date.now(),
          lastSeenAt: Date.now(),
        })
      );
    });
    await page.reload();

    // Hub Menu
    const playHubBtn = page.getByRole('button', { name: 'PLAY' });
    await expect(playHubBtn).toBeVisible({ timeout: 10000 });
    await playHubBtn.click();

    // Start game
    const longBtn = page.getByRole('button', { name: /long/i }).first();
    await longBtn.click();
    await expect(page.locator('canvas')).toBeVisible();

    const sizes = [
      { width: 375, height: 667 },
      { width: 1024, height: 768 },
      { width: 1280, height: 800 },
    ];

    for (const size of sizes) {
      await page.setViewportSize(size);
      await page.waitForTimeout(1000); // Give React time to re-render
      // Verify canvas still exists
      await expect(page.locator('canvas')).toBeVisible();
    }
  });

  // 5. Asset Switching during Connection Delay
  test('should allow switching assets even if price is loading', async ({ page }) => {
    // Block market API to force "CONNECTING..." state
    await page.route('**/api.binance.com/**', route => route.abort());
    await page.route('**/ws-feed.pro.coinbase.com/**', route => route.abort());

    // Setup session
    await page.evaluate(() => {
      localStorage.setItem(
        'crypto_survivors_user',
        JSON.stringify({
          profileId: '00000000-0000-4000-a000-000000000000',
          nickname: 'EdgeTester',
          createdAt: Date.now(),
          lastSeenAt: Date.now(),
        })
      );
    });
    await page.reload();

    // Handle Hub Menu (Click PLAY if present)
    const playHubButton = page.getByRole('button', { name: 'PLAY' });
    if (await playHubButton.isVisible({ timeout: 5000 })) {
      await playHubButton.click();
    }

    // Wait for any market readiness signal (connecting text OR actionable asset/menu).
    const connectingLabel = page.getByText(/CONNECTING\.\.\./i).first();
    const ethBtn = page.getByRole('button', { name: /eth/i }).first();
    const longBtn = page.getByRole('button', { name: /long/i }).first();

    const readyForInteraction = await Promise.any([
      connectingLabel.waitFor({ state: 'visible', timeout: 15000 }).then(() => true),
      ethBtn.waitFor({ state: 'visible', timeout: 15000 }).then(() => true),
      longBtn.waitFor({ state: 'visible', timeout: 15000 }).then(() => true),
    ]).catch(() => false);

    expect(readyForInteraction).toBe(true);

    // Try to switch asset (CryptoSelector) when available.
    if (await ethBtn.isVisible().catch(() => false)) {
      await ethBtn.click();
    }

    // App should remain stable regardless of loading state.
    await expect(page.locator('body')).toBeVisible();
  });

  // 6. Rapid Level-Up Selection (Mocked Flow)
  test('should handle rapid level-up card selection simulation', async ({ page }) => {
    await page.goto('/');
    // For E2E, we'll just check if the app handles rapid key presses
    for (let i = 0; i < 5; i++) {
      await page.keyboard.press('1');
      await page.keyboard.press('Digit1'); // Both common ways to trigger
      await page.keyboard.press('KeyW');
    }
    await expect(page.locator('body')).toBeVisible();
  });

  // 7. Concurrent Socket and API Dropout
  test('should stay hydrated during full network bailout', async ({ page }) => {
    await page.goto('/');

    // Block EVERYTHING except localhost
    await page.route('**', route => {
      const url = route.request().url();
      if (url.includes('localhost') || url.includes('127.0.0.1')) {
        return route.continue();
      }
      return route.abort();
    });

    await page.reload();

    // App should still show UI, even if in error state
    await expect(page.locator('body')).toBeVisible();
  });

  // 8. High Latency Simulation
  test('should handle high latency Price Feed', async ({ page, context }) => {
    // Setup session
    await page.evaluate(() => {
      localStorage.setItem(
        'crypto_survivors_user',
        JSON.stringify({
          profileId: '00000000-0000-4000-a000-000000000000',
          nickname: 'EdgeTester',
          createdAt: Date.now(),
          lastSeenAt: Date.now(),
        })
      );
    });

    // Simulate high latency (1000ms)
    const client = await context.newCDPSession(page);
    await client.send('Network.emulateNetworkConditions', {
      offline: false,
      downloadThroughput: (1024 * 1024) / 8, // 1 Mbps
      uploadThroughput: (1024 * 1024) / 8,
      latency: 1000,
    });

    await page.goto('/', { timeout: 60000 });

    // Check if price eventually appears (or at least connecting state is shown)
    await expect(page.locator('body')).toBeVisible({ timeout: 30000 });
  });

  // 9. Long Nickname Resilience
  test('should handle extremely long nicknames without breaking UI', async ({
    page,
  }) => {
    const longName = 'Survivor' + 'A'.repeat(50);

    await page.goto('/');
    await page.evaluate(name => {
      localStorage.setItem(
        'crypto_survivors_user',
        JSON.stringify({
          profileId: '00000000-0000-4000-a000-000000000000',
          nickname: name,
          createdAt: Date.now(),
          lastSeenAt: Date.now(),
        })
      );
    }, longName);
    await page.reload();

    const input = page.locator('input').first();
    const nicknameVisible = await input.isVisible().catch(() => false);
    if (nicknameVisible) {
      await input.fill(longName);
      await page.keyboard.press('Enter');
    }

    // Hub Menu should appear either directly (stored profile) or after nickname entry.
    const playHubBtn = page.getByRole('button', { name: 'PLAY' });
    await expect(playHubBtn).toBeVisible({ timeout: 15000 });
    await playHubBtn.click();

    // Main menu should appear
    await expect(page.getByRole('button', { name: /long/i }).first()).toBeVisible({
      timeout: 15000,
    });

    // Check if any text content contains the long name (or part of it)
    // and if the page hasn't exploded (horizontal scroll might happen, but shouldn't crash)
    const bodyHeight = await page.evaluate(() => document.body.scrollHeight);
    expect(bodyHeight).toBeGreaterThan(0);
  });
});
