import { test, expect } from '../test';
import { goToMainMenuFromHub } from '../support/game-helpers';
import AxeBuilder from '@axe-core/playwright';
import { Page } from '@playwright/test';

test.describe('Accessibility (A11y) Checks', () => {
  test('should not have accessibility violations on entry surface', async ({
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

    // Depending on bootstrap path, first surface can be Nickname or Hub.
    const nicknameInput = page.locator('input').first();
    const playHubBtn = page.getByRole('button', { name: /PLAY|hub\.play/i }).first();
    const nicknameVisible = await nicknameInput.isVisible().catch(() => false);
    if (!nicknameVisible) {
      await expect(playHubBtn).toBeVisible({ timeout: 10000 });
    }

    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .include('#root') // Focus on the React app root
      .disableRules(['meta-viewport', 'color-contrast'])
      .analyze();

    if (accessibilityScanResults.violations.length > 0) {
      console.log(
        'A11y Violations (Entry Surface):',
        JSON.stringify(accessibilityScanResults.violations, null, 2)
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
        'mock-user-session',
        JSON.stringify({
          profileId: 'e2e-a11y-uuid',
          nickname: 'A11yTester',
          createdAt: Date.now(),
          lastSeenAt: Date.now(),
        })
      );
    });
    await page.goto('/?no-sw=true');

    // 2. Handle Hub Menu (Click PLAY)
    await goToMainMenuFromHub(page as Page);

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
        'A11y Violations (Main Menu):',
        JSON.stringify(accessibilityScanResults.violations, null, 2)
      );
    }

    expect(accessibilityScanResults.violations).toEqual([]);
  });
});
