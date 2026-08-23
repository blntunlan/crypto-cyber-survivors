import { STARTER_WEAPON_DAMAGE_TIER_2 } from '@/game-v2/config/Mvp0Config';

import { expect, test, type Page } from './test';

/** Mirrors `GameV2DebugSnapshot`; the spec runs outside the app's type graph. */
type DebugSnapshot = {
  tick: number;
  phase: 'idle' | 'playing' | 'level-up' | 'game-over' | 'disposed';
  playerX: number;
  playerY: number;
  playerLevel: number;
  weaponDamage: number;
  invulnerabilityTicks: number;
  enemyCount: number;
  xpPickupCount: number;
  nearestXpPickupX: number | null;
  nearestXpPickupY: number | null;
  stateHash: string;
};

type MovementSample = { tick: number; x: number; y: number; invulnerable: number };

const SEEDED_RUN_URL = '/game-v2?no-sw=true&seed=12345';
const DIRECTION_KEYS = ['KeyW', 'KeyS', 'KeyA', 'KeyD'] as const;
const STEER_DEADZONE = 0.15;
const LEVEL_UP_BUDGET_MS = 45_000;

/** Walk speed is 6 units/s and dash speed 16, i.e. 0.1 vs 0.267 units per tick. */
const DASH_TICK_DISPLACEMENT = 0.2;

const readSnapshot = async (page: Page): Promise<DebugSnapshot> =>
  page.evaluate(() => {
    const debug = (
      window as unknown as { gameV2Debug?: { getSnapshot: () => unknown } }
    ).gameV2Debug;

    if (debug === undefined) {
      throw new Error('game V2 debug surface is not published');
    }

    return debug.getSnapshot();
  }) as Promise<DebugSnapshot>;

const openSeededRun = async (page: Page): Promise<DebugSnapshot> => {
  await page.goto(SEEDED_RUN_URL);
  await expect(page.getByTestId('game-v2-canvas')).toBeVisible();

  await expect
    .poll(async () => (await readSnapshot(page)).tick, { timeout: 15_000 })
    .toBeGreaterThan(0);

  return readSnapshot(page);
};

const applyDirection = async (
  page: Page,
  desired: ReadonlySet<string>,
  held: Set<string>
): Promise<void> => {
  for (const key of DIRECTION_KEYS) {
    if (desired.has(key) && !held.has(key)) {
      await page.keyboard.down(key);
      held.add(key);
    } else if (!desired.has(key) && held.has(key)) {
      await page.keyboard.up(key);
      held.delete(key);
    }
  }
};

const directionTowardPickup = (snapshot: DebugSnapshot): Set<string> => {
  const desired = new Set<string>();

  if (snapshot.nearestXpPickupX === null || snapshot.nearestXpPickupY === null) {
    return desired;
  }

  const deltaX = snapshot.nearestXpPickupX - snapshot.playerX;
  const deltaY = snapshot.nearestXpPickupY - snapshot.playerY;

  if (deltaX > STEER_DEADZONE) {
    desired.add('KeyD');
  } else if (deltaX < -STEER_DEADZONE) {
    desired.add('KeyA');
  }

  if (deltaY > STEER_DEADZONE) {
    desired.add('KeyW');
  } else if (deltaY < -STEER_DEADZONE) {
    desired.add('KeyS');
  }

  return desired;
};

/** Walks onto dropped XP until the run pauses for its first level-up. */
const playUntilLevelUp = async (page: Page): Promise<DebugSnapshot> => {
  const held = new Set<string>();
  const deadline = Date.now() + LEVEL_UP_BUDGET_MS;

  try {
    while (Date.now() < deadline) {
      const snapshot = await readSnapshot(page);

      if (snapshot.phase === 'level-up') {
        return snapshot;
      }

      expect(snapshot.phase, 'the run ended before the first level-up').toBe('playing');

      await applyDirection(page, directionTowardPickup(snapshot), held);
      await page.waitForTimeout(50);
    }
  } finally {
    await applyDirection(page, new Set(), held);
  }

  throw new Error('the run never reached its first level-up');
};

const sampleMovementAcrossDash = async (page: Page): Promise<MovementSample[]> => {
  await page.evaluate(() => {
    const scope = window as unknown as {
      __gameV2Probe?: MovementSample[];
      __gameV2Probing?: boolean;
      gameV2Debug?: { getSnapshot: () => DebugSnapshot };
    };
    const samples: MovementSample[] = [];
    scope.__gameV2Probe = samples;
    scope.__gameV2Probing = true;

    const collect = (): void => {
      const debug = scope.gameV2Debug;

      if (debug !== undefined) {
        const snapshot = debug.getSnapshot();
        samples.push({
          tick: snapshot.tick,
          x: snapshot.playerX,
          y: snapshot.playerY,
          invulnerable: snapshot.invulnerabilityTicks,
        });
      }

      if (scope.__gameV2Probing === true) {
        requestAnimationFrame(collect);
      }
    };

    requestAnimationFrame(collect);
  });

  await page.keyboard.press('Space');
  await page.waitForTimeout(500);

  return page.evaluate(() => {
    const scope = window as unknown as {
      __gameV2Probe?: MovementSample[];
      __gameV2Probing?: boolean;
    };
    scope.__gameV2Probing = false;

    return scope.__gameV2Probe ?? [];
  });
};

test.describe('Game V2 walking skeleton', () => {
  test('plays a seeded run from movement through the first level-up', async ({
    page,
  }) => {
    const opening = await openSeededRun(page);

    expect(opening.phase).toBe('playing');
    expect(opening.playerLevel).toBe(1);

    // The renderer sized the real canvas backing store, so WebGL came up.
    const canvasWidth = await page
      .getByTestId('game-v2-canvas')
      .evaluate(element => (element as HTMLCanvasElement).width);
    expect(canvasWidth).toBeGreaterThan(300);

    // Only the occupied starter slot displays, labelled AUTO (design §5.1).
    await expect(page.getByTestId('game-v2-hud-ability-0')).toBeVisible();
    await expect(page.getByTestId('game-v2-hud-ability-0')).toHaveText('AUTO Lv1');
    await expect(page.getByTestId('game-v2-hud-ability-1')).toBeHidden();
    await expect(page.getByTestId('game-v2-hud-ability-2')).toBeHidden();
    await expect(page.getByTestId('game-v2-hud-ability-3')).toBeHidden();

    // Movement
    const beforeWalk = await readSnapshot(page);
    await page.keyboard.down('KeyD');
    await page.waitForTimeout(300);
    const afterWalk = await readSnapshot(page);
    expect(afterWalk.playerX).toBeGreaterThan(beforeWalk.playerX);

    // Dash: a burst no walk speed can produce, with invulnerability behind it.
    const samples = await sampleMovementAcrossDash(page);
    await page.keyboard.up('KeyD');

    expect(samples.length).toBeGreaterThan(2);
    expect(samples.some(sample => sample.invulnerable > 0)).toBe(true);

    let peakTickDisplacement = 0;
    for (let index = 1; index < samples.length; index += 1) {
      const previous = samples[index - 1];
      const current = samples[index];

      if (previous === undefined || current === undefined) {
        continue;
      }

      const ticks = current.tick - previous.tick;

      if (ticks <= 0) {
        continue;
      }

      const distance = Math.hypot(current.x - previous.x, current.y - previous.y);
      peakTickDisplacement = Math.max(peakTickDisplacement, distance / ticks);
    }

    expect(peakTickDisplacement).toBeGreaterThan(DASH_TICK_DISPLACEMENT);

    // Level-up
    const paused = await playUntilLevelUp(page);
    const pausedTick = paused.tick;
    await expect(page.getByTestId('level-up-overlay')).toBeVisible();

    // The pause is real: the simulation does not advance while the card is open.
    await page.waitForTimeout(300);
    expect((await readSnapshot(page)).tick).toBe(pausedTick);

    // Both fixed choices are offered; V2-104 replaces this card with the real
    // three-card flow.
    await expect(
      page.getByRole('button', { name: /increase move speed/i })
    ).toBeVisible();

    await page.getByRole('button', { name: /increase damage/i }).click();
    await expect(page.getByTestId('level-up-overlay')).toBeHidden();

    const resumed = await readSnapshot(page);
    expect(resumed.phase).toBe('playing');
    expect(resumed.playerLevel).toBe(2);
    expect(resumed.weaponDamage).toBe(STARTER_WEAPON_DAMAGE_TIER_2);

    await expect
      .poll(async () => (await readSnapshot(page)).tick, { timeout: 10_000 })
      .toBeGreaterThan(pausedTick);
  });

  test('leaves the legacy surface untouched', async ({ page }) => {
    await page.goto('/?no-sw=true');
    await page.evaluate(() => {
      localStorage.setItem('disable_sw', 'true');
      localStorage.removeItem('has_seen_landing');
    });
    await page.reload();

    await expect(page.getByRole('button', { name: /start survival/i })).toBeVisible();
    await expect(page.getByTestId('game-v2-canvas')).toHaveCount(0);

    const debugSurface = await page.evaluate(
      () => (window as unknown as { gameV2Debug?: unknown }).gameV2Debug !== undefined
    );
    expect(debugSurface).toBe(false);
  });
});
