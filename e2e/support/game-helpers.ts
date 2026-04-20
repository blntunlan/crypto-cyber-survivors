import { expect, type Locator, type Page } from '@playwright/test';

async function waitForAnyVisible(
  locators: Locator[],
  timeout: number
): Promise<boolean> {
  return Promise.any(
    locators.map(locator =>
      locator.waitFor({ state: 'visible', timeout }).then(() => true)
    )
  ).catch(() => false);
}

export async function waitForMainMenu(page: Page, timeout = 15_000): Promise<void> {
  const mainMenuReady = await waitForAnyVisible(
    [
      page.getByRole('button', { name: /LONG/i }).first(),
      page.getByRole('button', { name: /SHORT/i }).first(),
      page.getByRole('button', { name: /^BTC$/i }).first(),
      page.getByText(/Game Mode/i).first(),
    ],
    timeout
  );

  expect(mainMenuReady).toBe(true);
}

async function getStoredNickname(page: Page): Promise<string | null> {
  return page.evaluate(() => {
    try {
      const raw = localStorage.getItem('crypto_survivors_user');
      if (!raw) return null;
      const parsed = JSON.parse(raw) as { nickname?: unknown };
      return typeof parsed.nickname === 'string' ? parsed.nickname : null;
    } catch {
      return null;
    }
  });
}

export async function resolveNicknameIfNeeded(
  page: Page,
  nickname?: string,
  timeout = 5_000
): Promise<void> {
  const nicknameInput = page.locator('#nickname-input');
  const needsNickname = await nicknameInput
    .waitFor({ state: 'visible', timeout })
    .then(() => true)
    .catch(() => false);

  if (!needsNickname) {
    return;
  }

  const value = nickname ?? (await getStoredNickname(page)) ?? 'E2ETester';
  await nicknameInput.fill(value);

  const enterArenaButton = page.getByRole('button', { name: /Enter the Arena/i });
  if (await enterArenaButton.isVisible().catch(() => false)) {
    await expect(enterArenaButton).toBeEnabled({ timeout: 5_000 });
    await enterArenaButton.click();
  } else {
    await page.keyboard.press('Enter');
  }

  await expect(nicknameInput).toBeHidden({ timeout: 10_000 });
}

export async function goToMainMenuFromHub(page: Page, timeout = 15_000): Promise<void> {
  await resolveNicknameIfNeeded(page, undefined, Math.min(timeout, 5_000));
  const playHubButton = page.getByRole('button', { name: /PLAY|hub\.play/i }).first();
  await expect(playHubButton).toBeVisible({ timeout });
  await playHubButton.click();
  await waitForMainMenu(page, timeout);
}

export async function waitForGameplay(page: Page, timeout = 15_000): Promise<void> {
  const gameplayReady = await waitForAnyVisible(
    [
      page.locator('#game-ui-overlay'),
      page.locator('[data-testid="wave-timer-text"]'),
      page.locator('canvas').first(),
      page.getByText(/Live Feed|LEVEL|P&L/i).first(),
    ],
    timeout
  );

  expect(gameplayReady).toBe(true);
}

export async function startGameFromMainMenu(
  page: Page,
  side: 'LONG' | 'SHORT' = 'LONG',
  timeout = 30_000
): Promise<void> {
  const startButton = page.getByRole('button', { name: new RegExp(side, 'i') }).first();
  await expect(startButton).toBeVisible({ timeout });
  await expect(startButton).toBeEnabled({ timeout });
  await startButton.click();
  await waitForGameplay(page, timeout);
}
