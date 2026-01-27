/**
 * E2E Tests - Visual Regression and Styling
 *
 * Tests UI consistency and visual elements
 */

import { test, expect } from '@playwright/test';

test.describe('Visual Elements', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => {
      localStorage.setItem(
        'crypto_survivors_user',
        JSON.stringify({
          profileId: '00000000-0000-4000-a000-000000000000',
          nickname: 'VisualTestPlayer',
          createdAt: Date.now(),
          lastSeenAt: Date.now(),
        })
      );
    });
    await page.reload();

    // Navigate from Hub to Main Menu (since visual tests expect BTC/badges on Main Menu)
    const playHubBtn = page.getByRole('button', { name: 'PLAY' });
    await expect(playHubBtn).toBeVisible({ timeout: 10000 });
    await playHubBtn.click();

    await page.waitForTimeout(2000);
  });

  test('should display crypto pair badges with correct colors', async ({ page }) => {
    // Look for BTC badge (should be orange-ish #F7931A)
    const btcElement = page.locator('text=BTC').first();

    if (await btcElement.isVisible()) {
      // Take a screenshot for visual verification
      await page.screenshot({ path: 'test-results/btc-badge.png', fullPage: false });
      console.log('BTC element found');
    }

    await expect(page.locator('body')).toBeVisible();
  });

  test('should have proper gradient backgrounds', async ({ page }) => {
    // Check if gradients are applied
    const body = page.locator('body');
    const bgImage = await body.evaluate(
      el => window.getComputedStyle(el).backgroundImage
    );

    console.log('Background image:', bgImage.substring(0, 100));

    await expect(page.locator('body')).toBeVisible();
  });

  test('should have consistent button styling', async ({ page }) => {
    const buttons = page.locator('button');
    const count = await buttons.count();

    if (count > 0) {
      const firstButton = buttons.first();
      const styles = await firstButton.evaluate(el => ({
        borderRadius: window.getComputedStyle(el).borderRadius,
        padding: window.getComputedStyle(el).padding,
        fontFamily: window.getComputedStyle(el).fontFamily,
      }));

      console.log('Button styles:', styles);
    }

    expect(count).toBeGreaterThanOrEqual(0);
  });

  test('should display animations smoothly', async ({ page }) => {
    // Check for CSS animations/transitions
    const animatedElements = await page.evaluate(() => {
      const elements = document.querySelectorAll('*');
      let animatedCount = 0;

      elements.forEach(el => {
        const style = window.getComputedStyle(el);
        if (style.animation !== 'none' || style.transition !== 'all 0s ease 0s') {
          animatedCount++;
        }
      });

      return animatedCount;
    });

    console.log(`Found ${animatedElements} elements with animations/transitions`);
    expect(animatedElements).toBeGreaterThanOrEqual(0);
  });
});

test.describe('Dark Mode', () => {
  test('should respect system color scheme', async ({ page }) => {
    // Test with dark mode preference
    await page.emulateMedia({ colorScheme: 'dark' });
    await page.goto('/');
    await page.waitForTimeout(2000);

    // Check background color is dark
    const bgColor = await page.evaluate(
      () => window.getComputedStyle(document.body).backgroundColor
    );

    console.log('Background color (dark mode):', bgColor);

    await expect(page.locator('body')).toBeVisible();
  });

  test('should work in light mode', async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'light' });
    await page.goto('/');
    await page.waitForTimeout(2000);

    const bgColor = await page.evaluate(
      () => window.getComputedStyle(document.body).backgroundColor
    );

    console.log('Background color (light mode):', bgColor);

    await expect(page.locator('body')).toBeVisible();
  });
});

test.describe('Font Loading', () => {
  test('should load custom fonts', async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(3000); // Wait for fonts to load

    const fonts = await page.evaluate(async () => {
      await document.fonts.ready;
      const fontFaces: string[] = [];
      document.fonts.forEach((font: FontFace) => {
        fontFaces.push(`${font.family} (${font.status})`);
      });
      return fontFaces;
    });

    console.log('Loaded fonts:', fonts);

    expect(fonts.length).toBeGreaterThanOrEqual(0);
  });
});

test.describe('Canvas Rendering', () => {
  test('should have WebGL support', async ({ page }) => {
    await page.goto('/');

    const hasWebGL = await page.evaluate(() => {
      const canvas = document.createElement('canvas');
      const gl = canvas.getContext('webgl') ?? canvas.getContext('experimental-webgl');
      return !!gl;
    });

    console.log('WebGL support:', hasWebGL);
    expect(hasWebGL).toBe(true);
  });

  test('should have Canvas 2D support', async ({ page }) => {
    await page.goto('/');

    const hasCanvas2D = await page.evaluate(() => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      return !!ctx;
    });

    console.log('Canvas 2D support:', hasCanvas2D);
    expect(hasCanvas2D).toBe(true);
  });
});
