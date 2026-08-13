import { test, expect } from './test';
import {
  goToMainMenuFromHub,
  resolveNicknameIfNeeded,
  startGameFromMainMenu,
} from './support/game-helpers';

test.use({ viewport: { width: 1440, height: 900 } });

test('captures desktop price HUD dimensions', async ({ page }) => {
  await page.goto('/?no-sw=true');
  await page.evaluate(() => {
    localStorage.setItem('has_seen_landing', 'true');
    localStorage.setItem('tutorial-completed', 'true');
    localStorage.setItem(
      'crypto_survivors_user',
      JSON.stringify({
        profileId: '00000000-0000-4000-a000-000000000000',
        nickname: 'PriceHudDiagnostic',
        createdAt: Date.now(),
        lastSeenAt: Date.now(),
      })
    );
  });
  await page.reload();
  await resolveNicknameIfNeeded(page, 'PriceHudDiagnostic');
  await goToMainMenuFromHub(page);
  await startGameFromMainMenu(page, 'LONG');

  const overlay = page.locator('#game-ui-overlay');
  const market = overlay.getByTestId('war-room-market-intel');

  await expect(market).toBeVisible();
  await page.waitForTimeout(1500);

  const metrics = await page.evaluate(() => {
    const rect = (selector: string) => {
      const element = document.querySelector(selector);
      if (!(element instanceof HTMLElement)) return null;
      const bounds = element.getBoundingClientRect();
      return {
        left: Math.round(bounds.left),
        right: Math.round(bounds.right),
        width: Math.round(bounds.width),
      };
    };

    return {
      viewportWidth: window.innerWidth,
      deck: rect('[data-testid="war-room-command-deck"]'),
      market: rect('[data-testid="war-room-market-intel"]'),
      leftPanel: rect('.hud-element-left'),
      rightPanel: rect('.hud-element-right'),
    };
  });

  console.log(`PRICE_HUD_METRICS ${JSON.stringify(metrics)}`);
  await page.screenshot({ path: 'test-results/price-hud-before.png', fullPage: true });
  await market.screenshot({ path: 'test-results/price-hud-panel-before.png' });

  expect(metrics.market).not.toBeNull();
});
