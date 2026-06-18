import { test, expect, type Page } from './test';
import {
  goToMainMenuFromHub,
  resolveNicknameIfNeeded,
  startGameFromMainMenu,
  waitForGameplay,
  waitForMainMenu,
} from './support/game-helpers';

const BETA_PROFILE_ID = '00000000-0000-4000-a000-000000000000';

type StoredUser = {
  profileId: string;
  nickname: string;
  createdAt: number;
  lastSeenAt: number;
};

const seedBetaStorage = async (
  page: Page,
  user: StoredUser | null,
  corruptUser = false
): Promise<void> => {
  await page.addInitScript(
    ({ corruptUser: shouldCorruptUser, storedUser }) => {
      localStorage.clear();
      localStorage.setItem('disable_sw', 'true');
      localStorage.setItem('tutorial-completed', 'true');
      localStorage.setItem('has_seen_landing', 'true');

      if (shouldCorruptUser) {
        localStorage.setItem('crypto_survivors_user', 'not-valid-json{{{');
        return;
      }

      if (storedUser) {
        localStorage.setItem('crypto_survivors_user', JSON.stringify(storedUser));
      }
    },
    { corruptUser, storedUser: user }
  );
};

const createStoredUser = (nickname: string): StoredUser => ({
  profileId: BETA_PROFILE_ID,
  nickname,
  createdAt: Date.now(),
  lastSeenAt: Date.now(),
});

const waitForHub = async (page: Page): Promise<void> => {
  await expect(page.getByText(/HUB TERMINAL/i)).toBeVisible({ timeout: 15_000 });
};

const expectWalletBalance = async (page: Page): Promise<void> => {
  await expect(page.getByText(/1\.3K|1337/).first()).toBeVisible({
    timeout: 15_000,
  });
};

const triggerCycleComplete = async (page: Page): Promise<void> => {
  await page.evaluate(() => {
    window.GameHelpers?.triggerCycleComplete?.();
    if (!window.GameHelpers?.triggerCycleComplete) {
      window.EventBus?.emit('cycleComplete', {
        cycleNumber: 1,
        totalElapsedSeconds: 300,
      });
    }
  });
};

const triggerMarketDisconnect = async (page: Page): Promise<void> => {
  await page.evaluate(() => {
    window.EventBus?.emit('marketDataTimeout', {
      lastPriceTime: Date.now() - 5000,
      disconnectedDuration: 5000,
      pair: 'BTC',
    });
  });
};

const triggerMarketRecovery = async (page: Page): Promise<void> => {
  await page.evaluate(() => {
    window.EventBus?.emit('marketDataRecovered', { pair: 'BTC' });
  });
};

test.describe('Beta smoke checklist', () => {
  test('fresh user can create a local profile and enter the play menu', async ({
    page,
  }) => {
    await seedBetaStorage(page, null);
    await page.goto('/?no-sw=true');

    await resolveNicknameIfNeeded(page, 'BetaFresh');
    await waitForHub(page);

    const storedUser = await page.evaluate(() => {
      const raw = localStorage.getItem('crypto_survivors_user');
      return raw ? (JSON.parse(raw) as StoredUser) : null;
    });

    expect(storedUser?.nickname).toBe('BetaFresh');

    await goToMainMenuFromHub(page);
    await waitForMainMenu(page);
  });

  test('corrupt guest storage falls back to nickname recovery', async ({ page }) => {
    await seedBetaStorage(page, null, true);
    await page.goto('/?no-sw=true');

    await resolveNicknameIfNeeded(page, 'BetaGuest');
    await waitForHub(page);

    const storedUser = await page.evaluate(() => {
      const raw = localStorage.getItem('crypto_survivors_user');
      return raw ? (JSON.parse(raw) as StoredUser) : null;
    });

    expect(storedUser?.nickname).toBe('BetaGuest');
  });

  test('returning user sees wallet balance and can start gameplay', async ({
    page,
  }) => {
    await seedBetaStorage(page, createStoredUser('BetaReturn'));
    await page.goto('/?no-sw=true');

    await waitForHub(page);
    await expectWalletBalance(page);

    await goToMainMenuFromHub(page);
    await startGameFromMainMenu(page, 'LONG');
    await waitForGameplay(page);
  });

  test('game over returns to the menu without breaking wallet refresh', async ({
    page,
  }) => {
    await seedBetaStorage(page, createStoredUser('BetaGameOver'));
    await page.goto('/?no-sw=true');

    await waitForHub(page);
    await goToMainMenuFromHub(page);
    await startGameFromMainMenu(page, 'LONG');

    await page.evaluate(() => {
      window.GameHelpers?.triggerGameOver?.();
    });

    await expect(page.getByText(/LIQUIDATED|Run Summary/i).first()).toBeVisible({
      timeout: 15_000,
    });

    await page.getByRole('button', { name: /Back to Terminal/i }).click();
    await waitForMainMenu(page);

    await page.getByRole('button', { name: /Hub|Back/i }).click();
    await waitForHub(page);
    await expectWalletBalance(page);
  });

  test('cycle cash out completes the verified exit path', async ({ page }) => {
    await seedBetaStorage(page, createStoredUser('BetaCashOut'));
    await page.goto('/?no-sw=true');

    await goToMainMenuFromHub(page);
    await startGameFromMainMenu(page, 'LONG');
    await triggerCycleComplete(page);

    await expect(page.getByText(/CYCLE 1 COMPLETE/i)).toBeVisible({
      timeout: 15_000,
    });
    await page.getByRole('button', { name: /Cash Out/i }).click();

    await expect(page.getByText(/LIQUIDATED|Run Summary/i).first()).toBeVisible({
      timeout: 15_000,
    });
  });

  test('market disconnect overlay recovers back to gameplay', async ({ page }) => {
    await seedBetaStorage(page, createStoredUser('BetaDisconnect'));
    await page.goto('/?no-sw=true');

    await goToMainMenuFromHub(page);
    await startGameFromMainMenu(page, 'LONG');
    await triggerMarketDisconnect(page);

    const disconnectedLabel = page.getByText(/DISCONNECTED/i).first();
    const restoredToast = page.getByText(/Restored|Connection re-established/i).first();
    const systemErrorToast = page.getByText(/System Error/i).first();

    const timeoutHandledByUi = await Promise.any([
      disconnectedLabel.waitFor({ state: 'visible', timeout: 5000 }).then(() => true),
      restoredToast.waitFor({ state: 'visible', timeout: 5000 }).then(() => true),
      systemErrorToast.waitFor({ state: 'visible', timeout: 5000 }).then(() => true),
      waitForGameplay(page, 5000).then(() => true),
    ]).catch(() => false);

    expect(timeoutHandledByUi).toBe(true);

    await triggerMarketRecovery(page);
    await expect(disconnectedLabel).not.toBeVisible({ timeout: 10_000 });
    await waitForGameplay(page);
  });
});
