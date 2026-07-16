import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

import { createGameRuntime } from '../../../services/gameplay/GameRuntime';
import { DifficultyPhase } from '../../../services/gameplay/phases/DifficultyPhase';
import { type DifficultyPhaseDecision } from '../../../services/difficulty/runtime/DifficultyRuntime';
import {
  type PhaseInput,
  type TickContext,
} from '../../../services/gameplay/contracts';
import { GameStatus, MarketPosition, type GameState } from '../../../types';
import { createInitialPlayer } from '../../../config/PlayerConfig';

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
});
