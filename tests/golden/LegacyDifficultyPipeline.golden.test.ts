/**
 * Golden test — Katman B: legacy market→difficulty pipeline'ının uçtan uca
 * davranışını kilitler.
 *
 * 120 tick'lik sabit SSE dizisi → MarketSignalPipeline.processTick (GERÇEK
 * ClientIndicatorService + DifficultyManager + difficultyContext +
 * UnifiedDirector; sahte saat 1 Hz ilerler) → tick başına tam
 * MarketPipelineResult. Legacy smoothing (~1 Hz LERP) dahil tüm davranış
 * bu fixture'da kayıt altındadır.
 *
 * Fixture üretimi (bir kez): UPDATE_GOLDEN=1 npx vitest run tests/golden
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { MarketPosition } from '../../types';
import {
  createMarketSignalPipeline,
  type MarketSignalPipeline,
  type MarketPipelineResult,
} from '../../services/market/pipeline/MarketSignalPipeline';
import { DifficultyManager } from '../../services/gameplay/DifficultyManager';
import {
  collectGoldenMismatches,
  isGoldenUpdateMode,
  readGoldenFixture,
  writeGoldenFixture,
} from './helpers/goldenIo';
import {
  generateSseTicks,
  SSE_TICK_COUNT,
  type GoldenSseTick,
} from './helpers/scenarios';

const OUTPUT_FIXTURE = 'legacy-pipeline.golden.json';
const INPUT_FIXTURE = 'sse-btc-120tick.json';
const TOLERANCE = 1e-8;
const LEVERAGE = 10;

const { clock } = vi.hoisted(() => ({ clock: { nowMs: 0 } }));

vi.mock('../../services/core/TimeService', () => ({
  TimeService: {
    getGameTime: () => clock.nowMs,
    getGameTimeSeconds: () => clock.nowMs / 1000,
    update: vi.fn(),
    start: vi.fn(),
    pause: vi.fn(),
    resume: vi.fn(),
    reset: vi.fn(),
    setTimeout: vi.fn(),
    clearTimeout: vi.fn(),
  },
}));

vi.mock('../../services/combat/PoolManager', () => ({
  PoolManager: {
    getInstance: vi.fn(() => ({ activeGems: [] })),
  },
}));

function runPipeline(
  pipeline: MarketSignalPipeline,
  ticks: GoldenSseTick[]
): MarketPipelineResult[] {
  const entryPrice = ticks[0]!.price;
  const results: MarketPipelineResult[] = [];

  for (let i = 0; i < ticks.length; i++) {
    const tick = ticks[i]!;
    clock.nowMs = i * 1000; // oyun zamanı: tick başına 1 sn

    results.push(
      pipeline.processTick({
        pair: 'BTC',
        position: MarketPosition.LONG,
        price: tick.price,
        volume: tick.volume,
        timestamp: tick.timestamp,
        rawPnl: (tick.price - entryPrice) / entryPrice,
        level: tick.level,
        hpPercent: tick.hpPercent,
        high: tick.high,
        low: tick.low,
      })
    );
  }

  return results;
}

function freshRun(ticks: GoldenSseTick[]): MarketPipelineResult[] {
  clock.nowMs = 0;
  DifficultyManager.reset(); // difficultyContext + UnifiedDirector dahil
  const pipeline = createMarketSignalPipeline();
  pipeline.reset(); // ClientIndicatorService singleton state
  DifficultyManager.startGame(LEVERAGE);
  return runPipeline(pipeline, ticks);
}

describe('Golden — legacy market→difficulty pipeline (end-to-end)', () => {
  beforeEach(() => {
    clock.nowMs = 0;
  });

  it('input tick series matches the locked input fixture', () => {
    const ticks = generateSseTicks();
    expect(ticks).toHaveLength(SSE_TICK_COUNT);

    if (isGoldenUpdateMode()) {
      writeGoldenFixture(INPUT_FIXTURE, ticks);
      return;
    }

    // Üreteç kayması korumasi: girdi dizisi de kilitli
    const expected = readGoldenFixture<GoldenSseTick[]>(INPUT_FIXTURE);
    expect(collectGoldenMismatches(ticks, expected, 0)).toEqual([]);
  });

  it('matches the locked golden fixture tick-by-tick', () => {
    const ticks = generateSseTicks();
    const actual = freshRun(ticks);

    expect(actual).toHaveLength(SSE_TICK_COUNT);

    if (isGoldenUpdateMode()) {
      writeGoldenFixture(OUTPUT_FIXTURE, actual);
      return;
    }

    const expected = readGoldenFixture<MarketPipelineResult[]>(OUTPUT_FIXTURE);
    const mismatches = collectGoldenMismatches(actual, expected, TOLERANCE);
    expect(mismatches).toEqual([]);
  });

  it('is deterministic across repeated runs in the same process', () => {
    const ticks = generateSseTicks();
    const first = freshRun(ticks);
    const second = freshRun(ticks);
    expect(collectGoldenMismatches(second, first, 0)).toEqual([]);
  });
});
