import { expect, test, type Page } from './test';
import {
  goToMainMenuFromHub,
  startGameFromMainMenu,
  waitForGameplay,
} from './support/game-helpers';

type VisualTheme = 'cyberpunk' | 'retro-16bit';

type VisualViewport = {
  height: number;
  name: 'desktop' | 'mobile';
  width: number;
};

const FROZEN_NOW = 1_784_304_000_000;
const VISUAL_VIEWPORTS: readonly VisualViewport[] = [
  { name: 'desktop', width: 1440, height: 900 },
  { name: 'mobile', width: 390, height: 844 },
];
const VISUAL_THEMES: readonly VisualTheme[] = ['cyberpunk', 'retro-16bit'];
const VISUAL_FREEZE_CSS = `
  *, *::before, *::after {
    animation: none !important;
    transition: none !important;
  }
`;

async function seedVisualSession(page: Page, theme: VisualTheme): Promise<void> {
  await page.addInitScript(selectedTheme => {
    Math.random = () => 0.5;

    if (sessionStorage.getItem('ui-contract-visual-seeded') === 'true') {
      return;
    }

    sessionStorage.setItem('ui-contract-visual-seeded', 'true');
    localStorage.clear();
    localStorage.setItem('disable_sw', 'true');
    localStorage.setItem('game_lang', 'en');
    localStorage.setItem('tutorial-completed', 'true');
    localStorage.setItem('crypto-survivor-theme', selectedTheme);
  }, theme);
}

async function enterKnownHub(page: Page): Promise<void> {
  await page.evaluate(fixedNow => {
    localStorage.setItem('has_seen_landing', 'true');
    localStorage.setItem(
      'crypto_survivors_user',
      JSON.stringify({
        profileId: '00000000-0000-4000-a000-000000000000',
        nickname: 'VisualTester',
        createdAt: fixedNow,
        lastSeenAt: fixedNow,
      })
    );
  }, FROZEN_NOW);
  await page.reload();
  await expect(page.getByText(/HUB TERMINAL/i)).toBeVisible({ timeout: 20_000 });
}

async function captureUi(page: Page, name: string): Promise<void> {
  await page.addStyleTag({ content: VISUAL_FREEZE_CSS });

  await expect(page).toHaveScreenshot(name, {
    animations: 'disabled',
    caret: 'hide',
    maxDiffPixels: 50,
    mask: [
      page.locator('canvas'),
      page.locator('.landing-price-feed'),
      page.getByTestId('main-menu-market-price'),
      page.getByText(/sync complete/i),
    ],
  });
}

for (const viewport of VISUAL_VIEWPORTS) {
  for (const theme of VISUAL_THEMES) {
    test.describe(`${viewport.name} ${theme}`, () => {
      test.use({ viewport: { width: viewport.width, height: viewport.height } });

      test('keeps critical player UI composition stable', async ({ page }) => {
        await seedVisualSession(page, theme);
        await page.emulateMedia({ reducedMotion: 'reduce' });
        await page.goto('/?no-sw=true');

        await expect(page.getByText('CRYPTO SURVIVORS', { exact: true })).toBeVisible({
          timeout: 20_000,
        });
        await captureUi(page, `${viewport.name}-${theme}-landing.png`);

        await enterKnownHub(page);
        await captureUi(page, `${viewport.name}-${theme}-hub.png`);

        await goToMainMenuFromHub(page);
        await captureUi(page, `${viewport.name}-${theme}-main-menu.png`);

        await page.getByRole('button', { name: /settings/i }).click();
        await expect(page.getByText(/settings/i).first()).toBeVisible({
          timeout: 15_000,
        });
        await captureUi(page, `${viewport.name}-${theme}-settings.png`);

        await page.getByRole('button', { name: /close/i }).click();
        await startGameFromMainMenu(page, 'LONG');
        await waitForGameplay(page);
        await captureUi(page, `${viewport.name}-${theme}-hud.png`);

        await expect
          .poll(() => page.evaluate(() => Boolean(window.GameHelpers?.triggerLevelUp)))
          .toBe(true);
        await page.evaluate(() => window.GameHelpers?.triggerLevelUp());
        await expect(page.getByTestId('level-up-payline-cabinet')).toBeVisible({
          timeout: 20_000,
        });
        await expect(page.getByTestId('level-up-reel').first()).toBeEnabled({
          timeout: 20_000,
        });
        await captureUi(page, `${viewport.name}-${theme}-level-up.png`);

        await page.getByTestId('level-up-reel').first().click();
        await waitForGameplay(page);
        await page.evaluate(() => window.GameHelpers?.triggerGameOver());
        await expect(page.getByText(/LIQUIDATED|Run Summary/i).first()).toBeVisible({
          timeout: 20_000,
        });
        await captureUi(page, `${viewport.name}-${theme}-game-over.png`);
      });
    });
  }
}
