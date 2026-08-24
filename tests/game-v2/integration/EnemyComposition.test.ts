import { describe, expect, it } from 'vitest';

import {
  BRUTE_ENEMY,
  GRUNT_ENEMY,
  SWARMLING_ENEMY,
} from '@/game-v2/config/EnemyRegistry';
import {
  MVP0_ENEMY_SPAWN_INTERVAL_TICKS,
  MVP0_MAX_LIVE_ENEMIES,
  SIMULATION_STEP_MS,
} from '@/game-v2/config/Mvp0Config';
import { ComponentMask } from '@/game-v2/world/ComponentMask';
import { createRunIdentity } from '@/game-v2/contracts/RunIdentity';
import { createMvp0Runtime } from '@/game-v2/runtime/createMvp0Runtime';
import { type IntentSource } from '@/game-v2/runtime/GameV2Runtime';

const ENEMY_MASK = ComponentMask.Transform | ComponentMask.Enemy;

const stillIntent: IntentSource = {
  sample: (_tick, out) => {
    out.moveX = 0;
    out.moveY = 0;
    out.dashPressed = false;
    return true;
  },
};

const enemyRadiiFromCheckpoint = (world: {
  masks: Uint32Array;
  radius: Float32Array;
}): number[] => {
  const radii: number[] = [];
  for (let slot = 0; slot < world.masks.length; slot += 1) {
    const mask = world.masks[slot] ?? 0;
    if ((mask & ENEMY_MASK) === ENEMY_MASK) {
      radii.push(world.radius[slot] ?? -1);
    }
  }
  return radii;
};

/**
 * V2-108 acceptance evidence: proves live archetype diversity through the
 * real production spawn cadence, not just the composer/registry in
 * isolation. Uses a seed whose composition draws at least one non-grunt
 * archetype within the drive window (verified empirically, same as
 * `SCENARIO_SEED`).
 */
describe('EnemyComposition (V2-108)', () => {
  it('spawns more than one distinct archetype through the real production cadence', () => {
    const runtime = createMvp0Runtime({
      runIdentity: createRunIdentity('enemy-composition', 3),
      intentSource: stillIntent,
    });

    runtime.start();

    const driveTicks = MVP0_ENEMY_SPAWN_INTERVAL_TICKS * 5;
    for (let tick = 0; tick < driveTicks; tick += 1) {
      if (runtime.phase !== 'playing') {
        break;
      }
      runtime.advanceFrame(SIMULATION_STEP_MS);
    }

    const checkpoint = runtime.checkpoint();
    const radii = enemyRadiiFromCheckpoint(checkpoint.world);
    const distinctRadii = new Set(radii.map(radius => radius.toFixed(4)));

    expect(radii.length).toBeGreaterThan(0);
    expect(distinctRadii.size).toBeGreaterThan(1);

    const knownRadii = new Set(
      [GRUNT_ENEMY, SWARMLING_ENEMY, BRUTE_ENEMY].map(definition =>
        definition.radius.toFixed(4)
      )
    );
    for (const radius of distinctRadii) {
      expect(knownRadii.has(radius)).toBe(true);
    }

    expect(checkpoint.world.activeCount).toBeLessThanOrEqual(checkpoint.world.capacity);

    runtime.dispose();
  });

  it('never exceeds MVP0_MAX_LIVE_ENEMIES even with a multi-archetype composition per interval', () => {
    const runtime = createMvp0Runtime({
      runIdentity: createRunIdentity('enemy-composition-cap', 3),
      intentSource: stillIntent,
    });

    runtime.start();

    // Long enough to approach the live-enemy cap if MVP-0 balance did not
    // kill the player first; the loop still exits early on death.
    const driveTicks = MVP0_ENEMY_SPAWN_INTERVAL_TICKS * 40;
    let maxObservedEnemyCount = 0;

    for (let tick = 0; tick < driveTicks; tick += 1) {
      if (runtime.phase !== 'playing') {
        break;
      }
      runtime.advanceFrame(SIMULATION_STEP_MS);
      maxObservedEnemyCount = Math.max(
        maxObservedEnemyCount,
        runtime.readout().enemyCount
      );
    }

    expect(maxObservedEnemyCount).toBeLessThanOrEqual(MVP0_MAX_LIVE_ENEMIES);

    runtime.dispose();
  });
});
