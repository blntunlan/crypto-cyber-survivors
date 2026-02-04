import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test.describe('Accessibility (A11y) Checks', () => {
  test('should not have accessibility violations on Nickname Entry screen', async ({
    context,
    page,
  }) => {
    await context.clearCookies();
    await page.addInitScript(() => {
      localStorage.clear();
      localStorage.setItem('disable_sw', 'true');
      localStorage.setItem('tutorial-completed', 'true');
      localStorage.setItem('has_seen_landing', 'true');
    });
    await page.goto('/?no-sw=true');

    // Scan Nickname Screen
    // The nickname screen is the first thing shown
    await expect(page.locator('input').first()).toBeVisible();

    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .include('#root') // Focus on the React app root
      .disableRules(['meta-viewport', 'color-contrast'])
      .analyze();

    if (accessibilityScanResults.violations.length > 0) {
      console.log(
        'Violations:',
        accessibilityScanResults.violations.map(v => ({
          id: v.id,
          description: v.description,
          nodes: v.nodes.length,
        }))
      );
    }

    expect(accessibilityScanResults.violations).toEqual([]);
  });

  test('should not have accessibility violations on Main Menu', async ({
    context,
    page,
  }) => {
    // Navigate to Main Menu
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
          nickname: 'A11yTester',
          createdAt: Date.now(),
          lastSeenAt: Date.now(),
        })
      );
    });
    await page.goto('/?no-sw=true');

    // 2. Handle Hub Menu (Click PLAY)
    const playHubBtn = page.getByRole('button', { name: 'PLAY' });
    await expect(playHubBtn).toBeVisible({ timeout: 10000 });
    await playHubBtn.click();

    // 3. Wait for Main Menu
    await expect(page.locator('button', { hasText: 'Long' }).first()).toBeVisible({
      timeout: 10000,
    });

    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .disableRules(['meta-viewport', 'color-contrast']) // Games require fixed viewport + custom themes
      .analyze();

    if (accessibilityScanResults.violations.length > 0) {
      console.log(
        'Violations:',
        accessibilityScanResults.violations.map(v => ({
          id: v.id,
          description: v.description,
          nodes: v.nodes.length,
        }))
      );
    }

    expect(accessibilityScanResults.violations).toEqual([]);
  });
});
