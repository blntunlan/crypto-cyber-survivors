import { describe, expect, it } from 'vitest';

import { resolveLethalityProfile } from '@/game-v2/config/LethalityRegistry';
import { createPositionContext } from '@/game-v2/contracts/PositionContext';
import { createRunIdentity } from '@/game-v2/contracts/RunIdentity';
import { ReplayRunner } from '@/game-v2/replay/ReplayRunner';
import { createMvp0Runtime } from '@/game-v2/runtime/createMvp0Runtime';

import { createManualIntentSource } from '../support/scriptedRun';

/**
 * `V2-202` acceptance evidence: proves two different leverage modes produce
 * different `playerMaxHealth` through the real production runtime (not only
 * through the registry/composer's own isolated unit tests), and that each
 * replays correctly — closing the `V2-ADR-089` deferral now that leverage
 * has a real gameplay effect.
 */
describe('lethality profiles through the real production runtime (V2-202)', () => {
  it('locks a different playerMaxHealth for different leverage modes', () => {
    const { source: source1 } = createManualIntentSource();
    const runtime1x = createMvp0Runtime({
      runIdentity: createRunIdentity('lethality-1x', 1),
      positionContext: createPositionContext({
        asset: 'BTC',
        side: 'LONG',
        leverage: 1,
        entryPrice: 65_000,
        lockedAtTick: 0,
      }),
      intentSource: source1,
    });
    runtime1x.start();

    const { source: source25 } = createManualIntentSource();
    const runtime25x = createMvp0Runtime({
      runIdentity: createRunIdentity('lethality-25x', 1),
      positionContext: createPositionContext({
        asset: 'BTC',
        side: 'SHORT',
        leverage: 25,
        entryPrice: 65_000,
        lockedAtTick: 0,
      }),
      intentSource: source25,
    });
    runtime25x.start();

    expect(runtime1x.readout().playerMaxHealth).toBe(
      resolveLethalityProfile(1).playerMaxHealth
    );
    expect(runtime25x.readout().playerMaxHealth).toBe(
      resolveLethalityProfile(25).playerMaxHealth
    );
    expect(runtime1x.readout().playerMaxHealth).toBeGreaterThan(
      runtime25x.readout().playerMaxHealth
    );

    runtime1x.dispose();
    runtime25x.dispose();
  });

  it('replays a non-default-leverage recording to the identical final hash', () => {
    const { source, intent } = createManualIntentSource();
    const runtime = createMvp0Runtime({
      runIdentity: createRunIdentity('lethality-replay-10x', 7),
      positionContext: createPositionContext({
        asset: 'BTC',
        side: 'LONG',
        leverage: 10,
        entryPrice: 65_000,
        lockedAtTick: 0,
      }),
      intentSource: source,
    });

    runtime.start();

    for (let tick = 0; tick < 30; tick += 1) {
      intent.moveX = 0.5;
      intent.moveY = 0;
      runtime.advanceFrame(1000 / 60);
    }

    const recording = runtime.exportRecording();
    const liveHash = runtime.snapshotHash();
    expect(recording.positionContext.leverage).toBe(10);
    runtime.dispose();

    const replayRunner = new ReplayRunner();
    const replayed = replayRunner.run(recording, 60);

    expect(replayed.finalHash).toBe(liveHash);
  });

  it('rejects a recording whose positionContext has been tampered with', () => {
    const { source, intent } = createManualIntentSource();
    const runtime = createMvp0Runtime({
      runIdentity: createRunIdentity('lethality-tamper', 3),
      positionContext: createPositionContext({
        asset: 'BTC',
        side: 'LONG',
        leverage: 5,
        entryPrice: 65_000,
        lockedAtTick: 0,
      }),
      intentSource: source,
    });

    runtime.start();
    intent.moveX = 0.5;
    runtime.advanceFrame(1000 / 60);

    const recording = runtime.exportRecording();
    runtime.dispose();

    const replayRunner = new ReplayRunner();

    expect(() =>
      replayRunner.run(
        {
          ...recording,
          positionContext: { ...recording.positionContext, leverage: 999 as never },
        },
        60
      )
    ).toThrow();
  });
});
