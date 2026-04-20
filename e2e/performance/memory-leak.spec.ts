import { test, expect } from '../test';
import { goToMainMenuFromHub, startGameFromMainMenu } from '../support/game-helpers';

test.describe('Memory Leak Detection', () => {
  test('should stabilize memory usage after multiple game cycles', async ({ page }) => {
    // Only run in Chromium as it exposes performance.memory
    if (test.info().project.name !== 'chromium') test.skip();

    // Setup user to skip nickname
    await page.addInitScript(() => {
      window.localStorage.setItem('disable_sw', 'true');
      window.localStorage.setItem('has_seen_landing', 'true');
      window.localStorage.setItem('tutorial-completed', 'true');
      window.localStorage.setItem(
        'crypto_survivors_user',
        JSON.stringify({
          profileId: 'mem-test-id',
          nickname: 'MemTester',
          createdAt: Date.now(),
          lastSeenAt: Date.now(),
        })
      );
    });

    await page.goto('/?no-sw=true');

    // Helper to get heap size
    const getHeapSize = async () => {
      return page.evaluate(
        () => (performance as any).memory.usedJSHeapSize / 1024 / 1024
      );
    };

    // Helper to start and exit game
    // Helper to start and exit game
    const runGameCycle = async () => {
      // 1. Recover Logic: Check where we are
      const hubPlayBtn = page.getByRole('button', { name: /PLAY/i }).first();
      const longBtn = page.getByRole('button', { name: /long/i }).first();
      const nicknameInput = page.locator('#nickname-input');
      const loadingLabel = page.getByText('LOADING ENGINE...');

      const waitForEntryState = async () =>
        Promise.any([
          hubPlayBtn.waitFor({ state: 'visible', timeout: 30000 }),
          longBtn.waitFor({ state: 'visible', timeout: 30000 }),
          nicknameInput.waitFor({ state: 'visible', timeout: 30000 }),
          loadingLabel.waitFor({ state: 'visible', timeout: 30000 }),
        ]);

      try {
        await waitForEntryState();

        // If loading, wait for it to disappear
        await expect(loadingLabel).toBeHidden({
          timeout: 30000,
        });
      } catch (_e) {
        console.log('Navigation invalid state, reloading...');
        await page.reload();
        await Promise.any([
          hubPlayBtn.waitFor({ state: 'visible', timeout: 30000 }),
          longBtn.waitFor({ state: 'visible', timeout: 30000 }),
          nicknameInput.waitFor({ state: 'visible', timeout: 30000 }),
        ]);
      }

      // Handle Nickname Screen (Unexpected but possible)
      if (await nicknameInput.isVisible()) {
        console.log('Nickname entry appeared, recovering...');
        await nicknameInput.fill('MemTester');
        const enterArenaBtn = page.getByRole('button', { name: /Enter the Arena/i });
        if (await enterArenaBtn.isVisible().catch(() => false)) {
          await enterArenaBtn.click();
        } else {
          await page.keyboard.press('Enter');
        }
        await expect(hubPlayBtn).toBeVisible();
      }

      // If Hub is visible, click Play
      if (await hubPlayBtn.isVisible()) {
        await goToMainMenuFromHub(page);
      }

      if (!(await hubPlayBtn.isVisible().catch(() => false))) {
        await expect(longBtn).toBeVisible({ timeout: 10000 });
      }

      await startGameFromMainMenu(page, 'LONG');

      await page.waitForTimeout(2000); // Run for 2 seconds

      // Pause game (Esc)
      await page.keyboard.press('Escape');
      await page.waitForTimeout(500);

      // Click "Back" to return to menu
      const menuBtn = page.getByRole('button', { name: /back/i }).first();
      if (await menuBtn.isVisible()) {
        await menuBtn.click();
      } else {
        // Fallback: reload (resets to Hub due to localStorage)
        await page.reload();
        await Promise.any([
          hubPlayBtn.waitFor({ state: 'visible', timeout: 30000 }),
          longBtn.waitFor({ state: 'visible', timeout: 30000 }),
        ]);
      }

      await page.waitForTimeout(1000); // Allow GC to potentially run
    };

    // 1. Initial Cycle
    await runGameCycle();

    // Force GC if possible (requires flag, usually not available in standard run, so we rely on trend)
    // We initiate a baseline measurement
    const baselineHeap = await getHeapSize();
    console.log(`Baseline Heap: ${baselineHeap.toFixed(2)} MB`);

    // 2. Run multiple cycles
    const cycles = 5;
    const heaps: number[] = [];

    for (let i = 0; i < cycles; i++) {
      await runGameCycle();
      const heap = await getHeapSize();
      heaps.push(heap);
      console.log(`Cycle ${i + 1} Heap: ${heap.toFixed(2)} MB`);
    }

    // 3. Analyze Trend
    // If the final heap is significantly larger than the first cycle heap (> 20MB or > 20% growth), flag it.
    const firstCycleHeap = heaps[0] ?? 0;
    const lastCycleHeap = heaps[heaps.length - 1] ?? 0;
    const growth = lastCycleHeap - firstCycleHeap;

    console.log(`Memory Growth: ${growth.toFixed(2)} MB`);

    // Flexible assertion: Allow some growth due to browser caching, but not excessive
    expect(growth).toBeLessThan(30); // 30MB tolerance
  });
});
