/**
 * HUD Elements E2E Tests
 *
 * Verifies that all newly added or refined HUD elements (Health Bar, Kernel Status,
 * Combo Panel, Milestones, Achievements, and Clutch) render correctly and
 * respond to their respective events.
 */
import { test, expect } from '@playwright/test';

test.describe('HUD Elements E2E', () => {
  test.beforeEach(async ({ context, page }) => {
    // 1. Clear state and skip nickname entry
    await context.clearCookies();
    await page.addInitScript(() => {
      localStorage.clear();
      localStorage.setItem('disable_sw', 'true');
      localStorage.setItem('tutorial-completed', 'true');
      localStorage.setItem('has_seen_landing', 'true');
      localStorage.setItem(
        'crypto_survivors_user',
        JSON.stringify({
          profileId: '00000000-0000-4000-a000-000000000000',
          nickname: 'HUDTester',
          createdAt: Date.now(),
          lastSeenAt: Date.now(),
        })
      );
    });

    await page.goto('/?no-sw=true');

    // Wait for the app to be ready
    await expect(page.locator('#root')).toBeAttached();

    // Verify Nickname is visible on Hub Menu BEFORE navigating away
    await expect(page.locator('text=HUDTester')).toBeVisible({ timeout: 15 * 1000 });

    // 3. Navigate through Hub Menu to Main Menu
    const hubPlayBtn = page.getByRole('button', { name: 'PLAY' });
    await expect(hubPlayBtn).toBeVisible({ timeout: 10 * 1000 });
    await hubPlayBtn.click();

    // 4. Start game from Main Menu (using "Long" button)
    const safeLeverageButton = page.getByRole('button', { name: /^1x$/i }).first();
    if (await safeLeverageButton.isVisible().catch(() => false)) {
      await safeLeverageButton.click();
    }

    const mainMenuLongBtn = page.locator('button', { hasText: /Long/i }).first();
    await expect(mainMenuLongBtn).toBeVisible({ timeout: 15000 });

    // Wait for price to load (button enabled)
    await expect(mainMenuLongBtn).toBeEnabled({ timeout: 30000 });
    await mainMenuLongBtn.click();

    // Give it a moment to start
    await page.waitForTimeout(2000);

    // 5. Confirm we are in-game via reliable HUD/gameplay signals.
    const inGameSignals = [
      page.locator('#game-ui-overlay'),
      page.locator('canvas').first(),
      page.locator('#wave-timer-text'),
      page.getByText(/Survival|LIQUIDATED|GAME OVER/i).first(),
    ];

    const hasInGameSignal = await Promise.any(
      inGameSignals.map(locator =>
        locator.waitFor({ state: 'visible', timeout: 15000 }).then(() => true)
      )
    ).catch(() => false);

    expect(hasInGameSignal).toBe(true);
  });

  test('should verify permanent HUD components (Health & Kernel)', async ({ page }) => {
    // GameUI is lazy-loaded, so we must wait for it to be attached
    await expect(page.locator('#game-ui-overlay')).toBeAttached({ timeout: 10 * 1000 });

    // Verify sub-components via stable text markers
    // LiveFeed: shows "Live Feed" (Desktop only) and "ENT" (Entry)
    const isMobile = page.viewportSize()?.width && page.viewportSize()!.width < 768;
    if (!isMobile) {
      await expect(page.locator('text=/Live Feed/i')).toBeVisible();
      await expect(page.getByText(/^(Entry|ENT)$/i).first()).toBeVisible();
      // KernelStatus: shows stat labels from registry (Desktop only)
      await expect(page.locator('text=/DMG/i').first()).toBeVisible();
    } else {
      // Mobile HUD uses compact labels; verify persistent health/status anchors.
      await expect(page.getByText(/^LEVEL$/i).first()).toBeVisible();
      await expect(page.getByText(/^P&L$/i).first()).toBeVisible();
    }
  });

  test('should verify Combo Panel on feedback trigger', async ({ page }) => {
    // We need streak >= 5 for panel to show.
    // Emitting real events via EventBus is most reliable for the full flow
    await page.evaluate(() => {
      for (let i = 0; i < 6; i++) {
        window.EventBus.emit('enemyKilled', {
          x: Math.random() * 800,
          y: Math.random() * 600,
          type: 'grunt',
        });
      }
    });

    // Combo panel should become visible (it lerps in, so we wait)
    const comboStreak = page.locator('#combo-streak-count');
    await expect(comboStreak).toBeVisible({ timeout: 10 * 1000 });
    await expect(comboStreak).toHaveText('6');
  });

  test('should verify Milestone Announcements', async ({ page }) => {
    await page.evaluate(() => {
      window.EventBus.emit('comboMilestone', {
        name: '100 HIT STREAK',
        kills: 100,
        multiplier: 3.0,
        color: '#FFD700',
        sound: 'combo2',
      });
    });

    await expect(page.locator('text=100 HIT STREAK')).toBeVisible();
  });

  test('should verify Achievement Popups', async ({ page }) => {
    await page.evaluate(() => {
      window.EventBus.emit('milestoneAchieved', {
        id: 'achievement_paper_hands',
        name: 'PAPER HANDS',
        icon: '🧻',
        color: '#FFFFFF',
        type: 'trading',
        threshold: 1,
      });
    });

    await expect(page.locator('text=PAPER HANDS')).toBeVisible();
    await expect(page.locator('text=🧻')).toBeVisible();
  });

  test('should verify Clutch Announcement (manual trigger check)', async ({ page }) => {
    await page.evaluate(() => {
      window.EventBus.emit('milestoneAchieved', {
        id: 'clutch_manual',
        name: 'CLUTCH!',
        icon: '🔥',
        color: '#FF4500',
        type: 'combat',
        threshold: 1,
      });
    });

    await expect(page.locator('text=CLUTCH!')).toBeVisible();
  });

  test('should verify Volatility Shock feedback', async ({ page }) => {
    await page.evaluate(() => {
      window.EventBus.emit('volatilityShock', {
        intensity: 1.2,
        direction: 'up',
        isHighLeverage: false,
      });
    });

    // Volatility shock triggers a milestone announcement
    await expect(page.locator('text=VOLATILITY SHOCK!')).toBeVisible();
  });
});
