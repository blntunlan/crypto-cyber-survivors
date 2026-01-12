import { describe, it, expect } from 'vitest';
import { MetricsCompiler } from '../../../services/metrics/MetricsCompiler';
import { MarketPosition } from '../../../types';
import {
  type MetricsState,
  createDefaultWavePhaseRecord,
} from '../../../types/metrics';

describe('MetricsCompiler', () => {
  const mockState: Partial<MetricsState> = {
    pnlHistory: [
      { time: 100, value: 0.01 },
      { time: 200, value: 0.03 },
    ],
    atrHistory: [
      { time: 100, value: 0.005 },
      { time: 200, value: 0.007 },
    ],
    maxPnL: 0.05,
    minPnL: -0.02,
    difficultyHistory: [
      { time: 100, value: 1.0 },
      { time: 200, value: 2.0 },
    ],
    maxDifficulty: 3.0,
    wavePhaseTime: {
      ...createDefaultWavePhaseRecord(),
      warmup: 1000,
      buildup: 2000,
      climax: 3000,
      firstPeak: 500,
    },
    highDifficultyTime: 1000,
    lowDifficultyTime: 5000,
    totalDamageDealt: 10000,
    totalDamageTaken: 500,
    totalCrits: 100,
    totalSuperCrits: 10,
    totalGems: 150,
    totalExp: 2000,
    totalBullets: 1000,
    streakHistory: [5, 10, 15],
    maxStreak: 15,
    mileStonesReached: ['First Blood'],
    comboTimeouts: 2,
    totalBonusXp: 400,
    longestComboTime: 5000,
    cardsChosen: [
      { card: 'Up', tier: 'common', level: 1 },
      { card: 'Down', tier: 'rare', level: 2 },
    ],
    levelUpTimes: [10000, 15000],
    enemyLifetimes: [2000, 4000],
    killsByType: { bear: 10, bull: 5 },
    totalSpawns: 30,
    maxEnemiesOnScreen: 20,
  };

  const mockBitcoinFinal = {
    price: 51000,
    pnl: 0.04,
    position: MarketPosition.LONG,
    entryPrice: 50000,
    leverage: 10,
  };

  const mockPlayerFinal = {
    level: 5,
    hp: 0,
    totalKills: 15,
    playerStats: {
      damage: 10,
      fireRate: 1,
      speed: 5,
      luck: 0,
      critChance: 0.1,
      critDamage: 2,
    },
  };

  it('should compile bitcoin metrics', () => {
    const result = MetricsCompiler.compileBitcoinMetrics(
      mockState as MetricsState,
      mockBitcoinFinal
    );
    expect(result.averagePnL).toBe(0.02);
    expect(result.volatilityScore).toBe(0.006);
    expect(result.priceChange).toBe(2);
    expect(result.pnlAtDeath).toBe(4);
    expect(result.effectivePnLAtDeath).toBe(40);
    expect(result.maxPnL).toBe(5);
    expect(result.minPnL).toBe(-2);
  });

  it('should compile difficulty metrics', () => {
    const result = MetricsCompiler.compileDifficultyMetrics(
      mockState as MetricsState,
      3.5
    );
    expect(result.averageDifficulty).toBe(1.5);
    expect(result.difficultyAtDeath).toBe(3.5);
    expect(result.timeInEachWavePhase.climax).toBe(3000);
  });

  it('should compile player metrics', () => {
    const result = MetricsCompiler.compilePlayerMetrics(
      mockState as MetricsState,
      mockPlayerFinal,
      60000
    );
    expect(result.totalKills).toBe(15);
    expect(result.survivalTimeMs).toBe(60000);
    expect(result.damageDealt).toBe(10000);
  });

  it('should compile combo metrics', () => {
    const result = MetricsCompiler.compileComboMetrics(mockState as MetricsState);
    expect(result.maxStreak).toBe(15);
    expect(result.averageStreak).toBe(10);
    expect(result.totalBonusXp).toBe(400);
  });

  it('should compile card metrics', () => {
    const result = MetricsCompiler.compileCardMetrics(mockState as MetricsState);
    expect(result.levelUpCount).toBe(2);
    expect(result.cardsByTier.rare).toBe(1);
    expect(result.averageTimeToLevelUp).toBe(12500);
  });

  it('should compile enemy metrics', () => {
    const result = MetricsCompiler.compileEnemyMetrics(mockState as MetricsState);
    expect(result.killsByType.bear).toBe(10);
    expect(result.averageEnemyLifetime).toBe(3000);
  });

  it('should handle null state gracefully', () => {
    const result = MetricsCompiler.compileBitcoinMetrics(null, mockBitcoinFinal);
    expect(result.averagePnL).toBe(0);
    expect(result.priceChange).toBe(2);
  });
});
