import { describe, expect, it } from 'vitest';
import { GameStatus } from '../../../../types';
import type {
  GameLoopPhase,
  GameLoopPhaseError,
} from '../../../../services/gameplay/loop';
import { PhaseProfiler } from '../../../../services/gameplay/loop';
import type { TickContext } from '../../../../services/gameplay/contracts';

const createContext = (frame: number = 1): TickContext =>
  ({
    clock: {
      frame,
      nowMs: frame * 16,
      deltaMs: 16,
      elapsedMs: frame * 16,
    },
    status: GameStatus.PLAYING,
    dimensions: {
      width: 1280,
      height: 720,
    },
    world: {
      player: { current: null },
      gameState: { current: {} as never },
      pool: {
        current: {
          activeEnemies: [],
          activeBullets: [],
          activeGems: [],
          activeParticles: [],
        },
      },
    },
    marketData: {} as never,
    telemetry: { phaseDurationsMs: {}, counters: {}, marks: {} },
  }) as TickContext;

describe('PhaseProfiler', () => {
  it('records phase duration and writes tick telemetry', () => {
    let now = 100;
    const profiler = new PhaseProfiler({
      now: () => now,
      slowPhaseThresholdMs: 2,
    });
    const context = createContext();
    const phase: GameLoopPhase<TickContext> = {
      id: 'input',
      execute: () => undefined,
    };

    profiler.beforePhase(phase, context);
    now = 104.25;
    profiler.afterPhase(phase, context, false);

    const snapshot = profiler.getSnapshot();
    expect(context.telemetry.phaseDurationsMs?.input).toBe(4.25);
    expect(snapshot.frame).toBe(1);
    expect(snapshot.tickDurationMs).toBe(4.25);
    expect(snapshot.slowPhaseCount).toBe(1);
    expect(snapshot.phases).toEqual([
      {
        id: 'input',
        lastDurationMs: 4.25,
        avgDurationMs: 4.25,
        maxDurationMs: 4.25,
        samples: 1,
        slowSamples: 1,
        lastFrame: 1,
        hadError: false,
      },
    ]);
  });

  it('tracks recent phase errors without losing the current tick duration', () => {
    let now = 10;
    const profiler = new PhaseProfiler({ now: () => now });
    const context = createContext(7);
    const phase: GameLoopPhase<TickContext> = {
      id: 'combat',
      execute: () => undefined,
    };

    profiler.beforePhase(phase, context);
    profiler.recordError({
      phaseId: 'combat',
      stage: 'phase',
      error: new Error('impact failed'),
      context,
    } satisfies GameLoopPhaseError<TickContext>);
    now = 12;
    profiler.afterPhase(phase, context, true);

    const snapshot = profiler.getSnapshot();
    expect(snapshot.errorCount).toBe(1);
    expect(snapshot.phases[0]?.hadError).toBe(true);
    expect(snapshot.recentErrors).toEqual([
      {
        phaseId: 'combat',
        stage: 'phase',
        frame: 7,
        message: 'impact failed',
      },
    ]);
  });

  it('resets counters while preserving registered phase slots', () => {
    let now = 1;
    const profiler = new PhaseProfiler({ now: () => now });
    const phase: GameLoopPhase<TickContext> = {
      id: 'physics',
      execute: () => undefined,
    };

    profiler.beforePhase(phase, createContext());
    now = 3;
    profiler.afterPhase(phase, createContext(), false);
    profiler.reset();

    expect(profiler.getSnapshot()).toMatchObject({
      frame: 0,
      tickDurationMs: 0,
      phaseCount: 0,
      errorCount: 0,
      slowPhaseCount: 0,
      phases: [],
      recentErrors: [],
    });
  });
});
