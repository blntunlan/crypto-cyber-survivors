import { readFileSync } from 'node:fs';
import { beforeEach, describe, expect, it } from 'vitest';

import { createGameRuntime } from '../../../services/gameplay/GameRuntime';
import { DifficultyPhase } from '../../../services/gameplay/phases/DifficultyPhase';
import { type DifficultyPhaseDecision } from '../../../services/difficulty/runtime/DifficultyRuntime';
import {
  type PhaseInput,
  type TickContext,
} from '../../../services/gameplay/contracts';
import { GameStatus, MarketPosition, type GameState } from '../../../types';
import { createInitialPlayer } from '../../../config/PlayerConfig';
import { EventBus } from '../../../services/core/EventBus';
import { getDirectorRuntimeConfig } from '../../../config/directorRuntime';

const createPhaseInput = (frame = 40, elapsedMs = 4_000): PhaseInput<'difficulty'> => {
  const context: TickContext = {
    clock: { frame, nowMs: elapsedMs, deltaMs: 16, elapsedMs },
    status: GameStatus.PLAYING,
    dimensions: { width: 1280, height: 720 },
    world: {
      player: { current: createInitialPlayer(100, 100, '#fff') },
      gameState: { current: {} as GameState },
      pool: {
        current: {
          activeEnemies: [],
          activeBullets: [],
          activeGems: [],
          activeParticles: [],
        },
      },
    },
    marketData: {
      price: 101,
      volume: 1_000,
      pnl: 0.01,
      effectivePnl: 0.01,
      leverage: 2,
      rsi: 55,
      difficulty: 1,
      momentum: 0,
    },
    telemetry: {},
  };
  return {
    phase: 'difficulty',
    context,
    shared: {
      canonicalMarketFrame: {
        revision: 1,
        sequence: 1,
        sourceSequence: 1,
        sourceTimestamp: 4_000,
        receivedAt: 4_000,
        quality: 'LIVE',
        price: 101,
        pnlPercent: 0.01,
        rsi: 55,
        rsiState: 'NEUTRAL',
        atrPercent: 0.01,
        normalizedVolume: 0.4,
        whaleTier: 0,
        macd: { value: 1, signal: 0.5, histogram: 0.5 },
        priceChangePercent: 0.01,
        trendStrength: 0.6,
        trendDirection: 'UP',
        source: 'runtime',
      },
      difficultyRunId: 'run-1',
      difficultyRunSeed: 17,
      difficultyEntryPrice: 100,
      difficultyLiquidationPrice: 50,
      difficultyPosition: MarketPosition.LONG,
      difficultyMaximumEnemies: 60,
      difficultyKillStreak: 10,
    } as never,
  };
};

describe('DifficultyPhase authority boundary', () => {
  beforeEach(() => {
    EventBus.clear();
  });

  it('runs current authority through the phase decision', () => {
    const runtime = createGameRuntime({ difficultyMode: 'current' });
    const phase = new DifficultyPhase(runtime.difficultyRuntime);

    const result = phase.execute(createPhaseInput());

    expect(result.shared?.difficultyPhaseDecision).toMatchObject({
      authority: 'current',
      activeRevision: expect.any(Number),
    });
    runtime.dispose();
  });

  // Every other test here names its mode explicitly, which is exactly why the
  // shipped default went uncovered: VITE_DIFFICULTY_RUNTIME_MODE is set in no
  // env file, so production resolves to `current` and the modular shell — plus
  // every consumer of `difficultySnapshotCommitted` — never runs. These two
  // pin the default down so a change to it has to be deliberate.
  describe('default path (no mode configured)', () => {
    it('resolves to the current shell', () => {
      expect(getDirectorRuntimeConfig(undefined).mode).toBe('current');

      const runtime = createGameRuntime();
      const phase = new DifficultyPhase(runtime.difficultyRuntime);

      const result = phase.execute(createPhaseInput());

      expect(result.shared?.difficultyPhaseDecision).toMatchObject({
        authority: 'current',
      });
      runtime.dispose();
    });

    it('commits no modular snapshot, so its consumers never receive one', () => {
      const commits: unknown[] = [];
      const unsubscribe = EventBus.on('difficultySnapshotCommitted', payload => {
        commits.push(payload);
      });

      const runtime = createGameRuntime();
      const phase = new DifficultyPhase(runtime.difficultyRuntime);

      for (let frame = 1; frame <= 20; frame++) {
        phase.execute(createPhaseInput(frame * 10, frame * 1_000));
      }

      // Consumers waiting on this event: CollectionSystem XP/gem multipliers,
      // useDifficultyV2 (fovReduction, LiquidationWarningOverlay),
      // useMarketRegime (LiveFeed regime telegraph), LootboxService.
      expect(commits).toHaveLength(0);

      unsubscribe();
      runtime.dispose();
    });
  });

  it('keeps the modular snapshot non-authoritative in shadow mode', () => {
    const runtime = createGameRuntime({ difficultyMode: 'shadow' });
    const phase = new DifficultyPhase(runtime.difficultyRuntime);

    const result = phase.execute(createPhaseInput());
    const decision = result.shared?.difficultyPhaseDecision as
      | DifficultyPhaseDecision
      | undefined;

    expect(decision).toMatchObject({ authority: 'current', snapshot: null });
    expect(decision?.shadowSnapshot).not.toBeNull();
    runtime.dispose();
  });

  it('removes the pre-phase director update from GameEngine', () => {
    const source = readFileSync('components/GameEngine.tsx', 'utf8');

    expect(source).not.toContain('directorSpawnOrchestratorRef.current.update');
    expect(source).not.toContain('directorSpawnInputRef');
  });

  it('applies authoritative Greed to current Director on the next tick', () => {
    const runtime = createGameRuntime({ difficultyMode: 'current' });
    const phase = new DifficultyPhase(runtime.difficultyRuntime);

    const initial = phase.execute(createPhaseInput(40, 4_000));
    const initialDecision = initial.shared?.difficultyPhaseDecision as
      | DifficultyPhaseDecision
      | undefined;
    const initialThreat = initialDecision?.currentSnapshot?.threat.target ?? 0;

    EventBus.emit('cashOutDecisionCommitted', {
      sessionId: 'session-1',
      quoteId: 'quote-1',
      canonicalSequence: 42,
      decision: 'reject',
      greedLevel: 2,
    });

    const sameTick = phase.execute(createPhaseInput(40, 4_000));
    const sameTickDecision = sameTick.shared?.difficultyPhaseDecision as
      | DifficultyPhaseDecision
      | undefined;
    const sameTickThreat = sameTickDecision?.currentSnapshot?.threat.target ?? 0;

    const nextTick = phase.execute(createPhaseInput(41, 4_000));
    const nextTickDecision = nextTick.shared?.difficultyPhaseDecision as
      | DifficultyPhaseDecision
      | undefined;
    const nextTickThreat = nextTickDecision?.currentSnapshot?.threat.target ?? 0;

    expect(sameTickThreat).toBe(initialThreat);
    expect(nextTickThreat).toBeGreaterThan(sameTickThreat);
    runtime.dispose();
  });
});
