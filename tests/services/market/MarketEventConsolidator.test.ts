import { beforeEach, describe, expect, it } from 'vitest';
import { EventBus } from '../../../services/core/EventBus';
import { MarketEventConsolidator } from '../../../services/market/MarketEventConsolidator';
import { type MarketData } from '../../../types';

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
});
