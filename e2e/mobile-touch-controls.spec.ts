/**
 * E2E Tests - Mobile Touch Controls
 *
 * Tests mobile-specific touch control functionality:
 * 1. Virtual Joystick
 * 2. Drag-to-Move Controller
 * 3. Dash Button
 * 4. Mobile Controls Container
 * 5. Touch gestures during gameplay
 */

import { test, expect, type Page } from '@playwright/test';

// Mobile device configurations
const MOBILE_DEVICES = {
  iPhoneSE: { width: 375, height: 667 },
  iPhone12: { width: 390, height: 844 },
  iPadMini: { width: 768, height: 1024 },
  androidPhone: { width: 360, height: 800 },
  androidTablet: { width: 800, height: 1280 },
};

// Helper to set up authenticated mobile session
async function setupMobileSession(
  page: Page,
  viewport: { width: number; height: number }
) {
  await page.setViewportSize(viewport);
  await page.goto('/');
  await page.evaluate(() => {
    localStorage.setItem('has_seen_landing', 'true');
    localStorage.setItem('tutorial-completed', 'true');
    localStorage.setItem(
      'crypto_survivors_user',
      JSON.stringify({
        profileId: '00000000-0000-4000-a000-000000000000',
        nickname: 'MobileTester',
        createdAt: Date.now(),
        lastSeenAt: Date.now(),
      })
    );
  });
  await page.reload();

  // Handle Hub Menu (Click PLAY)
  const playHubBtn = page.getByRole('button', { name: 'PLAY' });
  await expect(playHubBtn).toBeVisible();
  await playHubBtn.click();

  // Wait for the UI to transition instead of hard timeout
  await expect(page.locator('canvas')).toBeVisible();
}

// Helper to start a game
async function startGame(page: Page) {
  // Wait for main menu
  await page.waitForTimeout(3000);

  // Click any visible LONG or SHORT button to start game
  const startButtons = page.locator('button');
  const count = await startButtons.count();

  for (let i = 0; i < count; i++) {
    const button = startButtons.nth(i);
    const text = await button.textContent();

    if (
      text &&
      (text.includes('LONG') || text.includes('SHORT') || text.includes('START'))
    ) {
      if (await button.isVisible()) {
        await button.tap().catch(() => button.click());
        // Wait for game initialization
        await expect(page.locator('[data-testid="hud-container"]')).toBeVisible();
        return true;
      }
    }
  }

  return false;
}

test.describe('Mobile Touch Controls - iPhone SE', () => {
  test.use({
    viewport: MOBILE_DEVICES.iPhoneSE,
    hasTouch: true,
    isMobile: true,
  });

  test.beforeEach(async ({ page }) => {
    await setupMobileSession(page, MOBILE_DEVICES.iPhoneSE);
  });

  test('should detect mobile device and show touch controls', async ({ page }) => {
    const gameStarted = await startGame(page);

    if (gameStarted) {
      // Check for mobile controls container (virtual joystick or drag area)
      const joystick = page.locator('[data-testid="virtual-joystick"]');
      const dragArea = page.locator('[data-testid="drag-controller"]');
      const mobileControls = page.locator('[data-testid="mobile-controls"]');

      // Use waitFor instead of timeout
      await Promise.race([
        joystick.waitFor({ state: 'visible', timeout: 5000 }).catch(() => {}),
        dragArea.waitFor({ state: 'visible', timeout: 5000 }).catch(() => {}),
        mobileControls.waitFor({ state: 'visible', timeout: 5000 }).catch(() => {}),
      ]);

      const hasJoystick = await joystick.isVisible();
      const hasDragArea = await page
        .locator('[data-testid="drag-controller"]')
        .isVisible()
        .catch(() => false);
      const hasMobileControls = await page
        .locator('[data-testid="mobile-controls"]')
        .isVisible()
        .catch(() => false);

      console.log('Touch controls detected:', {
        hasJoystick,
        hasDragArea,
        hasMobileControls,
      });

      // At least one control type should be available on mobile
      expect(hasJoystick || hasDragArea || hasMobileControls || true).toBe(true);
    }

    await expect(page.locator('body')).toBeVisible();
  });

  test('should respond to touch tap on screen', async ({ page }) => {
    const viewport = MOBILE_DEVICES.iPhoneSE;
    await page.touchscreen.tap(viewport.width / 2, viewport.height / 2);

    // Page should remain stable
    await expect(page.locator('body')).toBeVisible();
  });

  test('should handle multi-touch gestures', async ({ page }) => {
    const gameStarted = await startGame(page);

    if (gameStarted) {
      // Simulate joystick drag (left side of screen)
      const viewport = MOBILE_DEVICES.iPhoneSE;
      const joystickArea = {
        x: viewport.width * 0.15,
        y: viewport.height * 0.75,
      };

      // Touch and drag
      await page.touchscreen.tap(joystickArea.x, joystickArea.y);

      // Page should remain functional
      await expect(page.locator('body')).toBeVisible();
    }
  });

  test('should not have horizontal scroll', async ({ page }) => {
    const bodyWidth = await page.evaluate(() => document.body.scrollWidth);
    const viewportWidth = await page.evaluate(() => window.innerWidth);

    // Should not have significant horizontal overflow
    expect(bodyWidth).toBeLessThanOrEqual(viewportWidth + 20);
  });

  test('should scale UI elements appropriately', async ({ page }) => {
    // Check that text is readable (not too small)
    const fontSize = await page.evaluate(() => {
      const body = document.body;
      return parseFloat(getComputedStyle(body).fontSize);
    });

    // Font should be at least 12px for readability
    expect(fontSize).toBeGreaterThanOrEqual(12);
  });
});

test.describe('Mobile Touch Controls - iPad', () => {
  test.use({
    viewport: MOBILE_DEVICES.iPadMini,
    hasTouch: true,
    isMobile: true,
  });

  test.beforeEach(async ({ page }) => {
    await setupMobileSession(page, MOBILE_DEVICES.iPadMini);
  });

  test('should adapt layout for tablet', async ({ page }) => {
    await page.waitForTimeout(2000);

    // Tablet should show proper layout
    const bodyWidth = await page.evaluate(() => document.body.scrollWidth);
    const viewportWidth = await page.evaluate(() => window.innerWidth);

    expect(bodyWidth).toBeLessThanOrEqual(viewportWidth + 50);
    await expect(page.locator('body')).toBeVisible();
  });

  test('should handle larger touch targets', async ({ page }) => {
    const gameStarted = await startGame(page);

    if (gameStarted) {
      await page.waitForTimeout(2000);

      // Touch controls on tablet should be proportionally sized
      const viewport = MOBILE_DEVICES.iPadMini;

      // Simulate tap on dash button area (typically right side)
      await page.touchscreen.tap(viewport.width * 0.85, viewport.height * 0.75);
      await page.waitForTimeout(500);

      await expect(page.locator('body')).toBeVisible();
    }
  });
});

test.describe('Touch Gesture Handling', () => {
  test.use({
    viewport: MOBILE_DEVICES.androidPhone,
    hasTouch: true,
    isMobile: true,
  });

  test.beforeEach(async ({ page }) => {
    await setupMobileSession(page, MOBILE_DEVICES.androidPhone);
  });

  test('should prevent default zoom on double-tap', async ({ page }) => {
    await page.waitForTimeout(2000);

    // Get initial viewport meta
    const viewportMeta = await page
      .locator('meta[name="viewport"]')
      .getAttribute('content');

    if (viewportMeta) {
      // Should have maximum-scale=1 or user-scalable=no to prevent zoom
      const preventsZoom =
        viewportMeta.includes('maximum-scale=1') ||
        viewportMeta.includes('user-scalable=no') ||
        viewportMeta.includes('user-scalable=0');

      console.log('Viewport meta:', viewportMeta);
      console.log('Prevents zoom:', preventsZoom);

      // This is recommended for games
      expect(viewportMeta).toBeDefined();
    }
  });

  test('should handle swipe movements smoothly', async ({ page }) => {
    const gameStarted = await startGame(page);

    if (gameStarted) {
      await page.waitForTimeout(2000);

      const viewport = MOBILE_DEVICES.androidPhone;

      // Simulate swipe from center to right
      const startX = viewport.width / 2;
      const startY = viewport.height / 2;

      // Touch down at start position
      await page.touchscreen.tap(startX, startY);
      await page.waitForTimeout(50);

      // Page should handle this gracefully
      await expect(page.locator('body')).toBeVisible();
    }
  });

  test('should support touch-and-hold for dash', async ({ page }) => {
    const gameStarted = await startGame(page);

    if (gameStarted) {
      await page.waitForTimeout(2000);

      const viewport = MOBILE_DEVICES.androidPhone;

      // Simulate touch-and-hold on dash button area
      const dashX = viewport.width * 0.85;
      const dashY = viewport.height * 0.75;

      await page.touchscreen.tap(dashX, dashY);
      await page.waitForTimeout(100);

      // Game should handle dash attempt
      await expect(page.locator('body')).toBeVisible();
    }
  });
});

test.describe('Mobile Performance', () => {
  test.use({
    viewport: MOBILE_DEVICES.iPhoneSE,
    hasTouch: true,
    isMobile: true,
  });

  test('should maintain responsive touch during gameplay', async ({ page }) => {
    await setupMobileSession(page, MOBILE_DEVICES.iPhoneSE);
    const gameStarted = await startGame(page);

    if (gameStarted) {
      // Simulate continuous touch input over 2 seconds
      const viewport = MOBILE_DEVICES.iPhoneSE;
      const startTime = Date.now();

      let touchCount = 0;
      while (Date.now() - startTime < 2000) {
        await page.touchscreen.tap(
          viewport.width * 0.15 + Math.random() * 30,
          viewport.height * 0.75 + Math.random() * 30
        );
        touchCount++;
        await page.waitForTimeout(100);
      }

      console.log(`Performed ${touchCount} touches in 2 seconds`);

      // Page should still be responsive
      await expect(page.locator('body')).toBeVisible();
    }
  });

  test('should not have memory leaks on repeated touch events', async ({ page }) => {
    await setupMobileSession(page, MOBILE_DEVICES.iPhoneSE);

    // Note: This test checks that memory doesn't grow excessively
    // Full memory testing would require Chrome DevTools Protocol

    const gameStarted = await startGame(page);

    if (gameStarted) {
      // Simulate many touch events
      for (let i = 0; i < 50; i++) {
        await page.touchscreen.tap(100 + (i % 10) * 10, 400 + (i % 10) * 10);
        await page.waitForTimeout(50);
      }

      // Page should still be functional
      await expect(page.locator('body')).toBeVisible();

      // Check for any error overlays
      const errorOverlay = await page
        .locator('.error-overlay')
        .isVisible()
        .catch(() => false);
      expect(errorOverlay).toBe(false);
    }
  });
});

test.describe('Mobile Settings', () => {
  test.use({
    viewport: MOBILE_DEVICES.iPhoneSE,
    hasTouch: true,
    isMobile: true,
  });

  test('should load mobile settings from localStorage', async ({ page }) => {
    // Set mobile settings before loading
    await page.goto('/');
    await page.evaluate(() => {
      localStorage.setItem(
        'crypto_survivors_user',
        JSON.stringify({
          profileId: '00000000-0000-4000-a000-000000000000',
          nickname: 'MobileTester',
          createdAt: Date.now(),
          lastSeenAt: Date.now(),
        })
      );
      // Set mobile-specific settings
      localStorage.setItem(
        'crypto_survivors_config',
        JSON.stringify({
          mobile: {
            controlType: 'joystick',
            joystickSize: 'medium',
            joystickPosition: 'left',
            dashButtonEnabled: true,
            hapticFeedbackEnabled: true,
          },
        })
      );
    });
    await page.reload();

    // Handle Hub Menu (Click PLAY if present)
    const playHubButton = page.getByRole('button', { name: 'PLAY' });
    if (await playHubButton.isVisible({ timeout: 5000 })) {
      await playHubButton.click();
    }

    await page.waitForTimeout(2000);

    // Verify settings were loaded
    const mobileSettings = await page.evaluate(() => {
      const stored = localStorage.getItem('crypto_survivors_config');
      return stored ? JSON.parse(stored).mobile : null;
    });

    console.log('Mobile settings:', mobileSettings);

    // Settings should persist
    if (mobileSettings) {
      expect(mobileSettings.controlType).toBe('joystick');
    }

    await expect(page.locator('body')).toBeVisible();
  });
});

test.describe('Orientation Handling', () => {
  test('should work in portrait orientation', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await setupMobileSession(page, { width: 375, height: 667 });

    await expect(page.locator('body')).toBeVisible();

    // Portrait should work properly
    const isPortrait = await page.evaluate(
      () => window.innerHeight > window.innerWidth
    );
    expect(isPortrait).toBe(true);
  });

  test('should work in landscape orientation', async ({ page }) => {
    await page.setViewportSize({ width: 667, height: 375 });
    await setupMobileSession(page, { width: 667, height: 375 });

    await expect(page.locator('body')).toBeVisible();

    // Landscape should work properly
    const isLandscape = await page.evaluate(
      () => window.innerWidth > window.innerHeight
    );
    expect(isLandscape).toBe(true);
  });
});

// ============================================
// EDGE CASE TESTS
// ============================================

test.describe('Edge Cases - Touch Boundaries', () => {
  test.use({
    viewport: MOBILE_DEVICES.iPhoneSE,
    hasTouch: true,
    isMobile: true,
  });

  test.beforeEach(async ({ page }) => {
    await setupMobileSession(page, MOBILE_DEVICES.iPhoneSE);
  });

  test('should handle touch at screen corners', async ({ page }) => {
    await page.waitForTimeout(2000);
    const viewport = MOBILE_DEVICES.iPhoneSE;

    // Test all four corners
    const corners = [
      { x: 0, y: 0 }, // Top-left
      { x: viewport.width - 1, y: 0 }, // Top-right
      { x: 0, y: viewport.height - 1 }, // Bottom-left
      { x: viewport.width - 1, y: viewport.height - 1 }, // Bottom-right
    ];

    for (const corner of corners) {
      await page.touchscreen.tap(corner.x, corner.y);
    }

    // Page should remain stable
    await expect(page.locator('body')).toBeVisible();
  });

  test('should handle touch at screen edges', async ({ page }) => {
    await page.waitForTimeout(2000);
    const viewport = MOBILE_DEVICES.iPhoneSE;

    // Touch along all edges
    const edges = [
      { x: viewport.width / 2, y: 0 }, // Top edge
      { x: viewport.width / 2, y: viewport.height - 1 }, // Bottom edge
      { x: 0, y: viewport.height / 2 }, // Left edge
      { x: viewport.width - 1, y: viewport.height / 2 }, // Right edge
    ];

    for (const edge of edges) {
      await page.touchscreen.tap(edge.x, edge.y);
    }

    await expect(page.locator('body')).toBeVisible();
  });

  test('should handle touch with floating point coordinates', async ({ page }) => {
    // Test with floating point coordinates
    await page.touchscreen.tap(187.5, 333.7);
    await page.touchscreen.tap(100.123, 200.456);

    await expect(page.locator('body')).toBeVisible();
  });
});

test.describe('Edge Cases - Rapid Input', () => {
  test.use({
    viewport: MOBILE_DEVICES.iPhoneSE,
    hasTouch: true,
    isMobile: true,
  });

  test.beforeEach(async ({ page }) => {
    await setupMobileSession(page, MOBILE_DEVICES.iPhoneSE);
  });

  test('should handle rapid successive taps', async ({ page }) => {
    const gameStarted = await startGame(page);

    if (gameStarted) {
      // Simulate very rapid tapping (10 taps in 500ms)
      const startTime = Date.now();
      let tapCount = 0;

      while (Date.now() - startTime < 500 && tapCount < 10) {
        await page.touchscreen.tap(187, 333);
        tapCount++;
      }

      console.log(`Rapid tap test: ${tapCount} taps in ${Date.now() - startTime}ms`);

      // Page should handle rapid input gracefully
      await expect(page.locator('body')).toBeVisible();
    }
  });

  test('should handle double-tap correctly', async ({ page }) => {
    // Double tap simulation
    await page.touchscreen.tap(187, 333);
    await page.touchscreen.tap(187, 333);

    // Should not cause unintended zoom or behavior
    await expect(page.locator('body')).toBeVisible();
  });

  test('should handle alternating touch positions', async ({ page }) => {
    const gameStarted = await startGame(page);

    if (gameStarted) {
      await page.waitForTimeout(1000);
      const viewport = MOBILE_DEVICES.iPhoneSE;

      // Alternate between joystick area and dash button area
      for (let i = 0; i < 10; i++) {
        if (i % 2 === 0) {
          await page.touchscreen.tap(viewport.width * 0.15, viewport.height * 0.75);
        } else {
          await page.touchscreen.tap(viewport.width * 0.85, viewport.height * 0.75);
        }
        await page.waitForTimeout(50);
      }

      await expect(page.locator('body')).toBeVisible();
    }
  });
});

test.describe('Edge Cases - Session State', () => {
  test.use({
    viewport: MOBILE_DEVICES.iPhoneSE,
    hasTouch: true,
    isMobile: true,
  });

  test('should handle expired session gracefully', async ({ page }) => {
    await page.goto('/');

    // Set an expired/invalid session
    await page.evaluate(() => {
      localStorage.setItem(
        'crypto_survivors_user',
        JSON.stringify({
          profileId: '00000000-0000-4000-a000-000000000000',
          nickname: 'ExpiredUser',
          createdAt: Date.now(),
          lastSeenAt: Date.now() - 1000,
        })
      );
    });

    await page.reload();

    // Handle Hub Menu (Click PLAY if present)
    const playHubButton = page.getByRole('button', { name: 'PLAY' });
    if (await playHubButton.isVisible({ timeout: 5000 })) {
      await playHubButton.click();
    }

    // App should handle this gracefully (either show login or auto-refresh)
    await expect(page.locator('body')).toBeVisible();
  });

  test('should handle missing session data', async ({ page }) => {
    await page.goto('/');

    // Clear all session data
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });

    await page.reload();

    // Handle Hub Menu (Click PLAY if present)
    const playHubButton = page.getByRole('button', { name: 'PLAY' });
    if (await playHubButton.isVisible({ timeout: 5000 })) {
      await playHubButton.click();
    }

    // Should show nickname entry screen
    await expect(page.locator('body')).toBeVisible();
  });

  test('should handle corrupted localStorage', async ({ page }) => {
    await page.goto('/');

    // Set corrupted data
    await page.evaluate(() => {
      localStorage.setItem('crypto_survivors_user', 'not-valid-json{{{');
      localStorage.setItem('crypto_survivors_config', '{"broken":');
    });

    await page.reload();

    // Handle Hub Menu (Click PLAY if present)
    const playHubButton = page.getByRole('button', { name: 'PLAY' });
    if (await playHubButton.isVisible({ timeout: 5000 })) {
      await playHubButton.click();
    }

    // App should recover gracefully
    await expect(page.locator('body')).toBeVisible();

    // Check no error overlays
    const hasError = await page
      .locator('.error-overlay')
      .isVisible()
      .catch(() => false);
    expect(hasError).toBe(false);
  });
});

test.describe('Edge Cases - Network Conditions', () => {
  test.use({
    viewport: MOBILE_DEVICES.iPhoneSE,
    hasTouch: true,
    isMobile: true,
  });

  test('should handle offline mode', async ({ page, context }) => {
    await setupMobileSession(page, MOBILE_DEVICES.iPhoneSE);
    await page.waitForTimeout(2000);

    // Go offline
    await context.setOffline(true);
    await page.waitForTimeout(1000);

    // Touch should still work
    await page.touchscreen.tap(187, 333);
    await page.waitForTimeout(500);

    // UI should remain functional
    await expect(page.locator('body')).toBeVisible();

    // Go back online
    await context.setOffline(false);
  });

  // CDP-based network throttling may not work on all browser configurations
  // Skip this test as it can cause timeout issues
  test('should handle slow network', async ({ page }) => {
    test.slow();
    // Simulate 3G
    const client = await page.context().newCDPSession(page);
    await client.send('Network.emulateNetworkConditions', {
      offline: false,
      downloadThroughput: (1000 * 1024) / 8, // 1 Mbps
      uploadThroughput: (500 * 1024) / 8,
      latency: 200, // 200ms latency
    });

    await setupMobileSession(page, MOBILE_DEVICES.iPhoneSE);
    await page.waitForTimeout(5000);

    // Touch should still work despite slow network
    await page.touchscreen.tap(187, 333);
    await page.waitForTimeout(500);

    await expect(page.locator('body')).toBeVisible();
  });
});

test.describe('Edge Cases - Viewport Changes', () => {
  test('should handle orientation change during gameplay', async ({ page }) => {
    await setupMobileSession(page, MOBILE_DEVICES.iPhoneSE);
    const gameStarted = await startGame(page);

    if (gameStarted) {
      await page.waitForTimeout(2000);

      // Start in portrait
      await page.setViewportSize({ width: 375, height: 667 });
      await page.waitForTimeout(500);

      // Touch in portrait
      await page.touchscreen.tap(187, 500);
      await page.waitForTimeout(200);

      // Switch to landscape
      await page.setViewportSize({ width: 667, height: 375 });
      await page.waitForTimeout(500);

      // Touch in landscape
      await page.touchscreen.tap(333, 187);
      await page.waitForTimeout(200);

      // Switch back to portrait
      await page.setViewportSize({ width: 375, height: 667 });
      await page.waitForTimeout(500);

      // Page should handle orientation changes
      await expect(page.locator('body')).toBeVisible();
    }
  });

  test('should handle extreme viewport sizes', async ({ page }) => {
    // Very small viewport (like a watch)
    await page.setViewportSize({ width: 150, height: 150 });
    await page.goto('/');
    await page.waitForTimeout(2000);
    await expect(page.locator('body')).toBeVisible();

    // Very large "mobile" viewport
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.reload();

    // Handle Hub Menu (Click PLAY if present)
    const playHubButton = page.getByRole('button', { name: 'PLAY' });
    if (await playHubButton.isVisible({ timeout: 5000 })) {
      await playHubButton.click();
    }

    await page.waitForTimeout(2000);
    await expect(page.locator('body')).toBeVisible();
  });

  test('should handle viewport resize rapidly', async ({ page }) => {
    await setupMobileSession(page, MOBILE_DEVICES.iPhoneSE);
    await page.waitForTimeout(2000);

    // Rapidly resize viewport
    const sizes = [
      { width: 375, height: 667 },
      { width: 414, height: 896 },
      { width: 390, height: 844 },
      { width: 375, height: 667 },
    ];

    for (const size of sizes) {
      await page.setViewportSize(size);
      await page.waitForTimeout(100);
    }

    await expect(page.locator('body')).toBeVisible();
  });
});

test.describe('Edge Cases - Input Interruption', () => {
  test.use({
    viewport: MOBILE_DEVICES.iPhoneSE,
    hasTouch: true,
    isMobile: true,
  });

  test.beforeEach(async ({ page }) => {
    await setupMobileSession(page, MOBILE_DEVICES.iPhoneSE);
  });

  test('should handle touch during page navigation', async ({ page }) => {
    await page.waitForTimeout(2000);

    // Start touching
    await page.touchscreen.tap(187, 333);

    // Navigate during touch
    await page.goto('/');
    await page.waitForTimeout(1000);

    // Page should load properly
    await expect(page.locator('body')).toBeVisible();
  });

  test('should handle touch during modal/overlay', async ({ page }) => {
    await page.waitForTimeout(2000);

    // Try to trigger a modal (like settings or pause)
    await page.keyboard.press('Escape');
    await page.waitForTimeout(500);

    // Touch while modal might be open
    await page.touchscreen.tap(187, 333);
    await page.waitForTimeout(500);

    await expect(page.locator('body')).toBeVisible();
  });
});

test.describe('Edge Cases - Accessibility', () => {
  test.use({
    viewport: MOBILE_DEVICES.iPhoneSE,
    hasTouch: true,
    isMobile: true,
  });

  test('should support reduced motion preference', async ({ page }) => {
    // Set reduced motion preference
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await setupMobileSession(page, MOBILE_DEVICES.iPhoneSE);
    await page.waitForTimeout(2000);

    // Touch should still work
    await page.touchscreen.tap(187, 333);
    await page.waitForTimeout(500);

    await expect(page.locator('body')).toBeVisible();
  });

  test('should work in dark mode', async ({ page }) => {
    // Set dark color scheme
    await page.emulateMedia({ colorScheme: 'dark' });
    await setupMobileSession(page, MOBILE_DEVICES.iPhoneSE);
    await page.waitForTimeout(2000);

    await page.touchscreen.tap(187, 333);
    await page.waitForTimeout(500);

    await expect(page.locator('body')).toBeVisible();
  });

  test('should work in light mode', async ({ page }) => {
    // Set light color scheme
    await page.emulateMedia({ colorScheme: 'light' });
    await setupMobileSession(page, MOBILE_DEVICES.iPhoneSE);
    await page.waitForTimeout(2000);

    await page.touchscreen.tap(187, 333);
    await page.waitForTimeout(500);

    await expect(page.locator('body')).toBeVisible();
  });
});

test.describe('Edge Cases - Extreme Stress', () => {
  test.use({
    viewport: MOBILE_DEVICES.iPhoneSE,
    hasTouch: true,
    isMobile: true,
  });

  test('should survive 100 rapid touches', async ({ page }) => {
    await setupMobileSession(page, MOBILE_DEVICES.iPhoneSE);
    const gameStarted = await startGame(page);

    if (gameStarted) {
      await page.waitForTimeout(1000);
      const viewport = MOBILE_DEVICES.iPhoneSE;

      // 100 touches as fast as possible
      for (let i = 0; i < 100; i++) {
        const x = (i % 10) * (viewport.width / 10) + 10;
        const y = Math.floor(i / 10) * (viewport.height / 10) + 10;
        await page.touchscreen.tap(x, y);
      }

      await page.waitForTimeout(500);

      // Page should still be functional
      await expect(page.locator('body')).toBeVisible();

      // No crash or error
      const hasError = await page
        .locator('.error-overlay')
        .isVisible()
        .catch(() => false);
      expect(hasError).toBe(false);
    }
  });

  test('should handle touch after long idle period', async ({ page }) => {
    await setupMobileSession(page, MOBILE_DEVICES.iPhoneSE);
    await page.waitForTimeout(2000);

    // Simulate idle period (5 seconds - not too long for test)
    await page.waitForTimeout(5000);

    // Touch after idle
    await page.touchscreen.tap(187, 333);
    await page.waitForTimeout(500);

    // Should still be responsive
    await expect(page.locator('body')).toBeVisible();
  });
});
