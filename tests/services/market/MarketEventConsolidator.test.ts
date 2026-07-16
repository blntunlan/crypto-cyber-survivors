import { beforeEach, describe, expect, it } from 'vitest';
import { EventBus } from '../../../services/core/EventBus';
import { MarketEventConsolidator } from '../../../services/market/MarketEventConsolidator';
import { type MarketData } from '../../../types';
import { type MarketRuntimeSnapshot } from '../../../types/marketRuntime';

const createMarketData = (price: number): MarketData =>
  ({
    price,
    pnl: 0.01,
    rsi: 50,
    rsiState: 'NEUTRAL',
    atrPercent: 0.01,
    normalizedVolume: 0.5,
    whaleTier: 0,
  }) as MarketData;

describe('MarketEventConsolidator canonical frames', () => {
  beforeEach(() => {
    MarketEventConsolidator.reset();
  });

  it('turns accepted market updates into ordered canonical frames', () => {
    EventBus.emit('gameMarketUpdate', createMarketData(50_000));
    const first = MarketEventConsolidator.getLatestFrame();
    expect(first).toMatchObject({ sequence: 1, revision: 1, price: 50_000 });

    EventBus.emit('gameMarketUpdate', createMarketData(50_100));
    const second = MarketEventConsolidator.getLatestFrame();

    expect(second).toMatchObject({ sequence: 2, revision: 2, price: 50_100 });
  });

  it('preserves upstream runtime sequence separately from local arrival order', () => {
    EventBus.emit('marketRuntimeSnapshot', {
      runId: 'run-source-sequence',
      seq: 42,
      pair: 'BTC',
      createdAt: 1_000,
      price: 50_000,
      volume: 1,
      rawPnl: 0,
      effectivePnl: 0,
      rawPnlBp: 0,
      effectivePnlBp: 0,
      leverage: 5,
      position: 'LONG',
      entryPrice: 50_000,
      liquidationPrice: 40_000,
      isLiquidated: false,
      rsi: 50,
      rsiState: 'NEUTRAL',
      normalizedVolume: 0,
      whaleTier: 0,
      atrPercent: 0,
      atrBp: 0,
      macd: 0,
      difficulty: 1,
      spawnRateMultiplier: 1,
      enemyDamage: 1,
      enemySpeed: 1,
      gemValueMultiplier: 1,
      momentum: 0,
      tickHash: 'tick-42',
      checksum: 'snapshot-42',
      algoVersion: 'market-runtime-v1',
      configVersion: 'market-runtime-config-v1',
    } satisfies MarketRuntimeSnapshot);

    expect(MarketEventConsolidator.getLatestFrame()).toMatchObject({
      sequence: 1,
      sourceSequence: 42,
    });
  });
});
