import { describe, expect, it } from 'vitest';

import {
  ENEMY_CONTACT_COOLDOWN_TICKS,
  MVP0_ENEMY_SPAWN_INTERVAL_TICKS,
  PLAYER_MAX_HEALTH,
  PROJECTILE_DAMAGE,
  SIMULATION_STEP_MS,
} from '@/game-v2/config/Mvp0Config';
import { createRunIdentity } from '@/game-v2/contracts/RunIdentity';
import { type RunRecording } from '@/game-v2/contracts/RunRecording';
import { type RuntimeCheckpoint } from '@/game-v2/contracts/RuntimeCheckpoint';
import { hashRuntimeCheckpoint } from '@/game-v2/replay/StateHasher';
import { createMvp0Runtime } from '@/game-v2/runtime/createMvp0Runtime';
import { type GameV2Runtime, type IntentSource } from '@/game-v2/runtime/GameV2Runtime';

import {
  SCENARIO_SEED,
  createFakeRenderer,
  createManualIntentSource,
  driveScriptedRun,
  type FakeRenderer,
} from '../support/scriptedRun';

/** Replays a recording, with presentation attached, up to its first pause. */
const replayToLevelUp = (
  recording: RunRecording
): { runtime: GameV2Runtime; renderer: FakeRenderer } => {
  const renderer = createFakeRenderer();
  let nextFrameIndex = 0;
  const source: IntentSource = {
    sample: (_tick, out) => {
      const frame = recording.frames[nextFrameIndex];

      if (frame === undefined) {
        return false;
      }

      out.moveX = frame.moveX;
      out.moveY = frame.moveY;
      out.dashPressed = frame.dashPressed;
      nextFrameIndex += 1;
      return true;
    },
  };

  const runtime = createMvp0Runtime({
    runIdentity: recording.runIdentity,
    intentSource: source,
    renderTarget: {
      canvas: document.createElement('canvas'),
      createRenderer: () => renderer.port,
    },
  });

  runtime.start();

  while (runtime.phase === 'playing' && runtime.tick < recording.frames.length) {
    runtime.advanceFrame(SIMULATION_STEP_MS);
  }

  return { runtime, renderer };
};

/**
 * Feeds a recorded input stream back through a fresh runtime, optionally
 * clearing every dash press, and stops once the requested tick has run.
 */
const replayFramesUntilTick = (
  recording: RunRecording,
  lastTick: number,
  clearDash: boolean
): { runtime: GameV2Runtime; playerHealth: number } => {
  let nextFrameIndex = 0;
  const source: IntentSource = {
    sample: (_tick, out) => {
      const frame = recording.frames[nextFrameIndex];

      if (frame === undefined) {
        return false;
      }

      out.moveX = frame.moveX;
      out.moveY = frame.moveY;
      out.dashPressed = clearDash ? false : frame.dashPressed;
      nextFrameIndex += 1;
      return true;
    },
  };

  const runtime = createMvp0Runtime({
    runIdentity: recording.runIdentity,
    intentSource: source,
  });

  runtime.start();

  while (runtime.tick < lastTick && runtime.phase !== 'game-over') {
    if (runtime.phase === 'level-up') {
      runtime.chooseUpgrade('starter-damage-2');
      continue;
    }

    runtime.advanceFrame(SIMULATION_STEP_MS);
  }

  return { runtime, playerHealth: runtime.readout().playerHealth };
};

/** Replays a recording through the same runtime instance after `reset()`. */
const replayAfterReset = (
  recording: RunRecording
): { runtime: GameV2Runtime; checkpoint: RuntimeCheckpoint } => {
  let nextFrameIndex = 0;
  const source: IntentSource = {
    sample: (_tick, out) => {
      const frame = recording.frames[nextFrameIndex];

      if (frame === undefined) {
        return false;
      }

      out.moveX = frame.moveX;
      out.moveY = frame.moveY;
      out.dashPressed = frame.dashPressed;
      nextFrameIndex += 1;
      return true;
    },
  };

  const runtime = createMvp0Runtime({
    runIdentity: recording.runIdentity,
    intentSource: source,
  });

  const replay = (): void => {
    while (runtime.tick < recording.frames.length && runtime.phase !== 'game-over') {
      if (runtime.phase === 'level-up') {
        runtime.chooseUpgrade('starter-damage-2');
        continue;
      }

      runtime.advanceFrame(SIMULATION_STEP_MS);
    }
  };

  // The first pass is what makes the reset meaningful: it burns RNG draws,
  // entity slots, and recorder entries that the second pass must not inherit.
  runtime.start();
  replay();
  runtime.reset();
  nextFrameIndex = 0;
  runtime.start();
  replay();

  return { runtime, checkpoint: runtime.checkpoint() };
};

describe('MVP-0 runtime composition', () => {
  it('plays one complete run from movement to death', () => {
    const run = driveScriptedRun(SCENARIO_SEED);

    expect(run.playerMoved).toBe(true);
    expect(run.dashPreventedDamage).toBe(true);
    expect(run.enemyKilled).toBe(true);
    expect(run.levelUpReached).toBe(true);
    expect(run.upgradeApplied).toBe(true);
    expect(run.phase).toBe('game-over');
    expect(run.gameOverTransitions).toBe(1);
    expect(run.renderer.renderCalls).toBeGreaterThan(0);

    // The scenario has to be a real run, not a degenerate two-tick one: it
    // survives several spawn cadences and issues exactly one upgrade command.
    expect(run.runtime.tick).toBeGreaterThan(MVP0_ENEMY_SPAWN_INTERVAL_TICKS * 4);
    expect(run.runtime.exportRecording().commands).toHaveLength(1);

    run.runtime.dispose();
  });

  it('freezes the simulation once the run is over', () => {
    const run = driveScriptedRun(SCENARIO_SEED);
    const deathTick = run.runtime.tick;

    run.runtime.advanceFrame(SIMULATION_STEP_MS);
    run.runtime.advanceFrame(SIMULATION_STEP_MS);

    expect(run.runtime.tick).toBe(deathTick);
    expect(run.runtime.phase).toBe('game-over');

    run.runtime.dispose();
  });

  it('produces the same final state hash for the same seed and input', () => {
    const first = driveScriptedRun(SCENARIO_SEED);
    const recording = first.runtime.exportRecording();
    const firstHash = first.runtime.snapshotHash();
    first.runtime.dispose();

    const second = driveScriptedRun(SCENARIO_SEED);

    expect(second.runtime.exportRecording()).toEqual(recording);
    expect(second.runtime.snapshotHash()).toBe(firstHash);

    second.runtime.dispose();
  });

  it('leaves no prior-run state behind after reset', () => {
    const run = driveScriptedRun(SCENARIO_SEED);
    const { runtime } = run;

    runtime.reset();

    const readout = runtime.readout();
    expect(readout.phase).toBe('idle');
    expect(readout.tick).toBe(0);
    expect(readout.enemyCount).toBe(0);
    expect(readout.projectileCount).toBe(0);
    expect(readout.xpPickupCount).toBe(0);
    expect(runtime.exportRecording().frames).toHaveLength(0);
    expect(runtime.exportRecording().commands).toHaveLength(0);

    runtime.dispose();
  });

  it('replays an identical world after reset, distinguished only by session epoch', () => {
    const first = driveScriptedRun(SCENARIO_SEED);
    const recording = first.runtime.exportRecording();
    const reference = first.runtime.checkpoint();
    first.runtime.dispose();

    const replayed = replayAfterReset(recording);

    expect(reference.lifecycle.sessionEpoch).toBe(0);
    expect(replayed.checkpoint.lifecycle.sessionEpoch).toBe(1);
    expect(replayed.checkpoint.tick).toBe(reference.tick);
    expect(
      hashRuntimeCheckpoint({
        ...replayed.checkpoint,
        lifecycle: {
          phase: replayed.checkpoint.lifecycle.phase,
          sessionEpoch: reference.lifecycle.sessionEpoch,
        },
        world: {
          ...replayed.checkpoint.world,
          generations: reference.world.generations,
        },
      })
    ).toBe(hashRuntimeCheckpoint(reference));

    replayed.runtime.dispose();
  });

  it('proves the dash prevented damage the same input would otherwise take', () => {
    const run = driveScriptedRun(SCENARIO_SEED);
    const recording = run.runtime.exportRecording();
    const { dashTick } = run;
    run.runtime.dispose();

    expect(dashTick).toBeGreaterThan(0);

    // One enemy contact cooldown after the dash is long enough for the enemy
    // that was closing in to have landed a hit on a player who never dashed.
    const comparisonTick = dashTick + ENEMY_CONTACT_COOLDOWN_TICKS;
    const withDash = replayFramesUntilTick(recording, comparisonTick, false);
    const withoutDash = replayFramesUntilTick(recording, comparisonTick, true);

    expect(withDash.runtime.tick).toBe(withoutDash.runtime.tick);
    expect(withDash.playerHealth).toBeGreaterThan(withoutDash.playerHealth);

    withDash.runtime.dispose();
    withoutDash.runtime.dispose();
  });

  it('freezes the rendered frame while the level-up card is open', () => {
    const run = driveScriptedRun(SCENARIO_SEED);
    const recording = run.runtime.exportRecording();
    run.runtime.dispose();

    const { runtime, renderer } = replayToLevelUp(recording);

    expect(runtime.phase).toBe('level-up');

    // Control: while the run was playing the camera followed a moving player,
    // so this probe can see movement at all.
    expect(new Set(renderer.cameraX).size).toBeGreaterThan(1);

    // Half-step frames so interpolation alpha would visibly sweep if the clock
    // kept accumulating: a paused clock holds the alpha it stopped on.
    const pausedTick = runtime.tick;
    renderer.cameraX.length = 0;
    runtime.advanceFrame(SIMULATION_STEP_MS / 2);
    runtime.advanceFrame(SIMULATION_STEP_MS / 2);
    runtime.advanceFrame(SIMULATION_STEP_MS / 2);
    runtime.advanceFrame(SIMULATION_STEP_MS / 2);

    expect(runtime.tick).toBe(pausedTick);
    expect(renderer.cameraX).toHaveLength(4);
    expect(new Set(renderer.cameraX).size).toBe(1);

    runtime.dispose();
  });

  it('spawns the first enemy on the first tick and keeps ticking on cadence', () => {
    const { source } = createManualIntentSource();
    const runtime = createMvp0Runtime({
      runIdentity: createRunIdentity('cadence', SCENARIO_SEED),
      intentSource: source,
    });

    runtime.start();
    expect(runtime.readout().enemyCount).toBe(0);

    runtime.advanceFrame(SIMULATION_STEP_MS);
    expect(runtime.readout().enemyCount).toBe(1);

    for (let tick = 1; tick < MVP0_ENEMY_SPAWN_INTERVAL_TICKS; tick += 1) {
      runtime.advanceFrame(SIMULATION_STEP_MS);
    }

    expect(runtime.readout().tick).toBe(MVP0_ENEMY_SPAWN_INTERVAL_TICKS);

    runtime.advanceFrame(SIMULATION_STEP_MS);
    expect(runtime.readout().tick).toBe(MVP0_ENEMY_SPAWN_INTERVAL_TICKS + 1);

    runtime.dispose();
  });

  it('presents the frame the ticks it just ran produced', () => {
    const renderer = createFakeRenderer();
    const source: IntentSource = {
      sample: (_tick, out) => {
        out.moveX = 1;
        out.moveY = 0;
        out.dashPressed = false;
        return true;
      },
    };
    const runtime = createMvp0Runtime({
      runIdentity: createRunIdentity('present-order', SCENARIO_SEED),
      intentSource: source,
      renderTarget: {
        canvas: document.createElement('canvas'),
        createRenderer: () => renderer.port,
      },
    });

    runtime.start();

    // One and a half steps: one tick runs, and the leftover half becomes the
    // interpolation alpha applied to the tick that just ran. A frame presented
    // before its own ticks would still be showing the untouched start position.
    runtime.advanceFrame(SIMULATION_STEP_MS * 1.5);

    expect(runtime.tick).toBe(1);
    expect(renderer.cameraX).toHaveLength(1);
    expect(renderer.cameraX[0]).toBeGreaterThan(0);

    runtime.dispose();
  });

  it('stops advancing once the input source is exhausted', () => {
    const suppliedFrames = 30;
    let framesServed = 0;
    const source: IntentSource = {
      sample: (_tick, out) => {
        if (framesServed >= suppliedFrames) {
          return false;
        }

        out.moveX = 0;
        out.moveY = 0;
        out.dashPressed = false;
        framesServed += 1;
        return true;
      },
    };

    const runtime = createMvp0Runtime({
      runIdentity: createRunIdentity('exhausted', SCENARIO_SEED),
      intentSource: source,
    });

    runtime.start();

    for (let frame = 0; frame < suppliedFrames * 2; frame += 1) {
      runtime.advanceFrame(SIMULATION_STEP_MS);
    }

    expect(framesServed).toBe(suppliedFrames);
    expect(runtime.tick).toBe(suppliedFrames);
    expect(runtime.phase).toBe('playing');
    expect(runtime.exportRecording().frames).toHaveLength(suppliedFrames);

    runtime.dispose();
  });

  it('starts the player at full health, tier-one damage, and level one', () => {
    const { source } = createManualIntentSource();
    const runtime = createMvp0Runtime({
      runIdentity: createRunIdentity('fresh', 1),
      intentSource: source,
    });

    runtime.start();
    const readout = runtime.readout();

    expect(readout.phase).toBe('playing');
    expect(readout.playerHealth).toBe(PLAYER_MAX_HEALTH);
    expect(readout.playerMaxHealth).toBe(PLAYER_MAX_HEALTH);
    expect(readout.weaponDamage).toBe(PROJECTILE_DAMAGE);
    expect(readout.playerLevel).toBe(1);
    expect(readout.playerX).toBe(0);
    expect(readout.playerY).toBe(0);

    runtime.dispose();
  });

  it('rejects advancing or restarting a disposed runtime', () => {
    const { source } = createManualIntentSource();
    const runtime = createMvp0Runtime({
      runIdentity: createRunIdentity('disposed', 7),
      intentSource: source,
    });

    runtime.start();
    runtime.dispose();

    expect(() => {
      runtime.advanceFrame(SIMULATION_STEP_MS);
    }).toThrow(RangeError);
    expect(() => {
      runtime.start();
    }).toThrow();
    expect(() => {
      runtime.dispose();
    }).not.toThrow();
  });
});
