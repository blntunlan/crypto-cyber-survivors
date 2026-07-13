import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MarketPosition } from '../../../types';
import { createMarketSignalPipeline } from '../../../services/market/pipeline/MarketSignalPipeline';

const { clientStateRef, updateMock } = vi.hoisted(() => ({
  clientStateRef: { current: null as any },
  updateMock: vi.fn(),
}));

vi.mock('../../../services/indicators/ClientIndicatorService', () => ({
  ClientIndicatorService: {
    setPair: vi.fn(),
    setPosition: vi.fn(),
    update: (...args: unknown[]) => updateMock(...args),
    getState: () => clientStateRef.current,
    reset: vi.fn(),
  },
}));

describe('MarketSignalPipeline', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    clientStateRef.current = {
      rsi: 50,
      rsiNormalized: 0.5,
      rsiMomentum: 0,
      rsiState: 'NEUTRAL',
      atr: 0,
      atrPercent: 0,
      atrNormalized: 0,
      spawnRateMultiplier: 1,
      normalizedVolume: 0.5,
      volumeSpike: false,
      whaleTier: 0,
      priceChangePercent: 0,
      isFlashCrash: false,
      isMoonShot: false,
      trendStrength: 0,
      trendDirection: 'SIDEWAYS',
      isInitialized: false,
      lastUpdateTime: 0,
      dataPointCount: 0,
    };
  });

  it('returns normalized indicators without a gameplay difficulty output', () => {
    clientStateRef.current = {
      ...clientStateRef.current,
      rsi: 58,
      rsiState: 'NEUTRAL',
      atrPercent: 0.007,
      normalizedVolume: 0.66,
      whaleTier: 1,
      trendStrength: 0.42,
      trendDirection: 'UP',
      priceChangePercent: 0.015,
      spawnRateMultiplier: 1.2,
      isInitialized: true,
    };

    const pipeline = createMarketSignalPipeline();
    const result = pipeline.processTick({
      pair: 'BTC',
      position: MarketPosition.LONG,
      price: 50000,
      volume: 1200,
      timestamp: 1000,
      fallbackAtrPercent: 0.003,
    });

    expect(result.indicators.source).toBe('client');
    expect(result.indicators.spawnRateMultiplier).toBe(1.2);
    expect(result).not.toHaveProperty('gameplay');
  });

  it('falls back to server indicator snapshot when client is not initialized', () => {
    clientStateRef.current = {
      ...clientStateRef.current,
      isInitialized: false,
      rsi: 50,
      rsiState: 'NEUTRAL',
      atrPercent: 0,
      spawnRateMultiplier: 1,
    };

    const pipeline = createMarketSignalPipeline();
    pipeline.syncServerState({
      pair: 'BTC',
      price: 50100,
      volume: 900,
      rsi: 67,
      rsiState: 'OVERBOUGHT',
      atr: 12,
      atrPercent: 0.004,
      spawnRateMultiplier: 1.1,
      normalizedVolume: 0.74,
      volumePercentile: 0.8,
      whaleTier: 2,
      enemyAggroMultiplier: 1,
      updatedAt: new Date(),
    });

    const result = pipeline.processTick({
      pair: 'BTC',
      position: MarketPosition.SHORT,
      price: 50100,
      volume: 900,
      timestamp: 2000,
      fallbackAtrPercent: 0.003,
    });

    expect(result.indicators.source).toBe('server-fallback');
    expect(result.indicators.rsi).toBe(67);
    expect(result.indicators.rsiState).toBe('OVERBOUGHT');
    expect(result.indicators.atrPercent).toBe(0.004);
    expect(result).not.toHaveProperty('gameplay');
  });
});
