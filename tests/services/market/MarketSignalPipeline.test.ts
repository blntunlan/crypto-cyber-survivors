import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MarketPosition } from '../../../types';
import { createMarketSignalPipeline } from '../../../services/market/pipeline/MarketSignalPipeline';

const { clientStateRef, calculateMock, updateMock } = vi.hoisted(() => ({
  clientStateRef: { current: null as any },
  calculateMock: vi.fn(),
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

vi.mock('../../../services/gameplay/DifficultyManager', () => ({
  DifficultyManager: {
    calculate: (...args: unknown[]) => calculateMock(...args),
  },
}));

const difficultyOutput = {
  total: 2.0,
  wavePhase: 'active',
  liquidationWarning: 'NONE',
  fovReduction: 0,
  shockActive: false,
  spawnRate: 1.5,
  enemySpeed: 1.3,
  enemyHP: 1.2,
  enemyDamage: 1.4,
  enemyVariety: 0.4,
  chaosLevel: 0.3,
  mercyFactor: 0,
  pressureIntensity: 0.7,
  whaleProbability: 0.1,
  xpMultiplier: 1.1,
  gemDropRate: 1.2,
  enemyHealth: 1.2,
  gemValueMultiplier: 1.2,
  factors: {
    baseTime: 1,
    pnlEffect: 1,
    volatility: 1,
    levelFactor: 1,
    waveMultiplier: 1,
    nearDeathMod: 1,
    streakBonus: 1,
    momentumMod: 1,
    cycleFactor: 1,
    leverageDamage: 1,
    leverageSpawn: 1,
    leverageSpeed: 1,
  },
} as const;

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
    calculateMock.mockReturnValue(difficultyOutput);
  });

  it('combines indicator and gameplay spawn multipliers', () => {
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
      rawPnl: 0.04,
      level: 5,
      hpPercent: 80,
      fallbackAtrPercent: 0.003,
    });

    expect(calculateMock).toHaveBeenCalledWith(0.04, 0.007, 5, 80);
    expect(result.indicators.source).toBe('client');
    expect(result.gameplay.indicatorSpawnRateMultiplier).toBe(1.2);
    expect(result.gameplay.spawnRateMultiplier).toBeCloseTo(1.8, 6);
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
      rawPnl: -0.02,
      level: 4,
      hpPercent: 65,
      fallbackAtrPercent: 0.003,
    });

    expect(result.indicators.source).toBe('server-fallback');
    expect(result.indicators.rsi).toBe(67);
    expect(result.indicators.rsiState).toBe('OVERBOUGHT');
    expect(result.indicators.atrPercent).toBe(0.004);
    expect(calculateMock).toHaveBeenCalledWith(-0.02, 0.004, 4, 65);
  });
});
