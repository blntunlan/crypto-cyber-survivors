import { describe, expect, it } from 'vitest';

import {
  CONVERGENCE_MAX_CYCLE_TICKS,
  CONVERGENCE_MIN_CYCLE_TICKS,
  SIMULATION_STEP_MS,
} from '@/game-v2/config/Mvp0Config';
import { createRunIdentity } from '@/game-v2/contracts/RunIdentity';
import { createMvp0Runtime } from '@/game-v2/runtime/createMvp0Runtime';
import {
  createManualIntentSource,
  driveScriptedRun,
  resolveOfferChoiceIndex,
  steerToward,
  SCENARIO_SEED,
} from '../support/scriptedRun';

/**
 * V2-109 acceptance evidence: proves the Convergence envelope through the
 * real production tick order (`GameV2Runtime`, `createMvp0Runtime`), not just
 * `ConvergenceSystem` in isolation.
 */
describe('Convergence envelope (V2-109)', () => {
  it('accrues Convergence through the real production tick order once combat produces a kill', () => {
    const before = driveScriptedRun(SCENARIO_SEED);
    expect(before.enemyKilled).toBe(true);

    const readout = before.runtime.readout();
    expect(readout.convergenceProgress).toBeGreaterThan(0);

    before.runtime.dispose();
  });

  it('never reaches the signal before the minimum-cycle floor during a short real run', () => {
    const run = driveScriptedRun(SCENARIO_SEED);
    const readout = run.runtime.readout();

    expect(readout.tick).toBeLessThan(CONVERGENCE_MIN_CYCLE_TICKS);
    expect(readout.convergenceReached).toBe(false);

    run.runtime.dispose();
  });

  it('always reaches the signal by the maximum-cycle ceiling in a real production run, with no market input anywhere in the system', () => {
    const { source, intent } = createManualIntentSource();
    const runtime = createMvp0Runtime({
      runIdentity: createRunIdentity('convergence-envelope-ceiling', 7),
      intentSource: source,
    });

    runtime.start();

    let readout = runtime.readout();
    let driftAngle = 0;

    // This policy is not a claim about optimal play, only one that reliably
    // survives long enough to drive the runtime to the maximum-cycle tick,
    // so the ceiling override (V2-ADR-074) can be observed firing through
    // the real tick order rather than only in `ConvergenceSystem`'s own
    // unit tests. A continuous slow-rotating drift (below) keeps the player
    // perpetually moving into unexplored space — PLAYER_MOVE_SPEED exceeds
    // every archetype's speed, so nothing spawned behind ever catches up —
    // which avoids the oscillation a purely reactive "flee the nearest
    // enemy" policy suffers when a second enemy sits on the flee path
    // (verified empirically: that reactive policy dies well before the
    // ceiling tick). A close threat still gets a defensive dash for its
    // i-frames and burst speed.
    //
    // The loop is bounded by simulation tick, not iteration count: a
    // level-up pause consumes an iteration without advancing the clock, so
    // an iteration-count bound could exit short of the target tick. The
    // frame-count safety cap only guards against a genuine stall (an
    // unexpected phase neither advances nor resolves).
    const maxFrames = CONVERGENCE_MAX_CYCLE_TICKS * 2;
    for (
      let frame = 0;
      frame < maxFrames && readout.tick < CONVERGENCE_MAX_CYCLE_TICKS;
      frame += 1
    ) {
      readout = runtime.readout();

      if (readout.phase === 'game-over') {
        break;
      }

      if (readout.phase === 'level-up') {
        const choiceIndex = resolveOfferChoiceIndex(runtime, 'ability');
        runtime.chooseUpgrade(choiceIndex);
        continue;
      }

      const DASH_RADIUS = 1.3;
      let nearestDistance = Number.POSITIVE_INFINITY;
      if (readout.nearestEnemyX !== null && readout.nearestEnemyY !== null) {
        nearestDistance = Math.hypot(
          readout.nearestEnemyX - readout.playerX,
          readout.nearestEnemyY - readout.playerY
        );
      }

      intent.dashPressed = false;
      driftAngle += 0.0025;
      intent.moveX = Math.cos(driftAngle) * 0.999;
      intent.moveY = Math.sin(driftAngle) * 0.999;

      if (nearestDistance <= DASH_RADIUS && readout.dashCooldownTicks === 0) {
        steerToward(
          intent,
          readout.nearestEnemyX!,
          readout.nearestEnemyY!,
          readout.playerX,
          readout.playerY
        );
        intent.dashPressed = true;
      }

      runtime.advanceFrame(SIMULATION_STEP_MS);
    }

    readout = runtime.readout();

    expect(readout.phase).not.toBe('game-over');
    expect(readout.tick).toBeGreaterThanOrEqual(CONVERGENCE_MAX_CYCLE_TICKS);
    expect(readout.convergenceReached).toBe(true);

    runtime.dispose();
  });
});
