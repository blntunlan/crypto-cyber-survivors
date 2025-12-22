/**
 * MetricsCompiler - Compiles raw metrics data into structured reports
 *
 * Separates the compilation logic from the main MetricsService
 * for better maintainability.
 */

import { type MarketPosition } from '../../types';
import {
  type MetricsState,
  type SessionMetrics,
  type BitcoinMetrics,
  type DifficultyMetrics,
  type PlayerMetrics,
  type ComboMetrics,
  type CardMetrics,
  type EnemyMetrics,
} from '../../types/metrics';

export interface PlayerFinalData {
  level: number;
  hp: number;
  totalKills: number;
  playerStats: {
    damage: number;
    fireRate: number;
    speed: number;
    luck: number;
    critChance: number;
    critDamage: number;
  };
}

export interface BitcoinFinalData {
  price: number;
  pnl: number;
  position: MarketPosition;
  entryPrice: number;
  leverage: number;
}

export class MetricsCompiler {
  /**
   * Compile Bitcoin/Market metrics
   */
  static compileBitcoinMetrics(
    state: MetricsState | null,
    finalData: BitcoinFinalData
  ): BitcoinMetrics {
    const pnlValues = state?.pnlHistory.map(h => h.value) ?? [];
    const atrValues = state?.atrHistory.map(h => h.value) ?? [];

    const avgPnL =
      pnlValues.length > 0 ? pnlValues.reduce((a, b) => a + b, 0) / pnlValues.length : 0;

    const avgAtr =
      atrValues.length > 0 ? atrValues.reduce((a, b) => a + b, 0) / atrValues.length : 0;

    const priceChange =
      finalData.entryPrice > 0
        ? ((finalData.price - finalData.entryPrice) / finalData.entryPrice) * 100
        : 0;

    return {
      priceAtStart: finalData.entryPrice,
      priceAtEnd: finalData.price,
      priceChange,
      maxPnL: state?.maxPnL ?? 0,
      minPnL: state?.minPnL ?? 0,
      averagePnL: avgPnL,
      volatilityScore: avgAtr,
      positionChosen: finalData.position,
      leverage: finalData.leverage,
      pnlAtDeath: finalData.pnl,
      effectivePnLAtDeath: finalData.pnl * finalData.leverage,
      pnlSamples: pnlValues,
      atrSamples: atrValues,
    };
  }

  /**
   * Compile Difficulty metrics
   */
  static compileDifficultyMetrics(
    state: MetricsState | null,
    finalDifficulty: number
  ): DifficultyMetrics {
    const difficultyValues = state?.difficultyHistory.map(h => h.value) ?? [];

    const avgDifficulty =
      difficultyValues.length > 0
        ? difficultyValues.reduce((a, b) => a + b, 0) / difficultyValues.length
        : 0;

    return {
      averageDifficulty: avgDifficulty,
      maxDifficulty: state?.maxDifficulty ?? 0,
      difficultyAtDeath: finalDifficulty,
      timeInEachWavePhase: state?.wavePhaseTime ?? {
        calm: 0,
        building: 0,
        intense: 0,
        peak: 0,
      },
      timeInHighDifficulty: state?.highDifficultyTime ?? 0,
      timeInLowDifficulty: state?.lowDifficultyTime ?? 0,
      nearDeathActivations: state?.nearDeathActivations ?? 0,
      difficultySamples: difficultyValues,
      wavePhaseTransitions: [],
    };
  }

  /**
   * Compile Player metrics
   */
  static compilePlayerMetrics(
    state: MetricsState | null,
    finalData: PlayerFinalData,
    survivalTime: number
  ): PlayerMetrics {
    return {
      totalKills: finalData.totalKills,
      survivalTimeMs: survivalTime,
      maxLevel: finalData.level,
      damageDealt: state?.totalDamageDealt ?? 0,
      damageTaken: state?.totalDamageTaken ?? 0,
      healingReceived: state?.totalHealing ?? 0,
      gemsCollected: state?.totalGems ?? 0,
      expEarned: state?.totalExp ?? 0,
      criticalHits: state?.totalCrits ?? 0,
      superCriticalHits: state?.totalSuperCrits ?? 0,
      bulletsFired: state?.totalBullets ?? 0,
      hpAtDeath: finalData.hp,
      finalStats: finalData.playerStats,
    };
  }

  /**
   * Compile Combo metrics
   */
  static compileComboMetrics(state: MetricsState | null): ComboMetrics {
    const streaks = state?.streakHistory ?? [];
    const avgStreak = streaks.length > 0 ? streaks.reduce((a, b) => a + b, 0) / streaks.length : 0;

    return {
      maxStreak: state?.maxStreak ?? 0,
      averageStreak: avgStreak,
      streakSamples: streaks,
      milestonesReached: state?.mileStonesReached ?? [],
      comboTimeouts: state?.comboTimeouts ?? 0,
      totalBonusXp: state?.totalBonusXp ?? 0,
      longestComboTime: state?.longestComboTime ?? 0,
    };
  }

  /**
   * Compile Card/Upgrade metrics
   */
  static compileCardMetrics(state: MetricsState | null): CardMetrics {
    const levelUpTimes = state?.levelUpTimes ?? [];
    const avgTimeToLevelUp =
      levelUpTimes.length > 0 ? levelUpTimes.reduce((a, b) => a + b, 0) / levelUpTimes.length : 0;

    const cardsByTier: Record<string, number> = {};
    for (const card of state?.cardsChosen ?? []) {
      cardsByTier[card.tier] = (cardsByTier[card.tier] ?? 0) + 1;
    }

    return {
      cardsChosen: state?.cardsChosen ?? [],
      cardsByTier,
      levelUpCount: state?.cardsChosen.length ?? 0,
      averageTimeToLevelUp: avgTimeToLevelUp,
      timesBetweenLevelUps: levelUpTimes,
    };
  }

  /**
   * Compile Enemy metrics
   */
  static compileEnemyMetrics(state: MetricsState | null): EnemyMetrics {
    const lifetimes = state?.enemyLifetimes ?? [];
    const avgLifetime =
      lifetimes.length > 0 ? lifetimes.reduce((a, b) => a + b, 0) / lifetimes.length : 0;

    return {
      killsByType: state?.killsByType ?? {},
      maxEnemiesOnScreen: state?.maxEnemiesOnScreen ?? 0,
      averageEnemyLifetime: avgLifetime,
      spawnsTotal: state?.totalSpawns ?? 0,
      enemyLifetimeSamples: lifetimes,
    };
  }

  /**
   * Compile Performance metrics
   */
  static compilePerformanceMetrics(perfData: {
    avgFps: number;
    minFps: number;
    deviceFingerprint: string;
  }): SessionMetrics['performance'] {
    return {
      avgFps: perfData.avgFps,
      minFps: perfData.minFps,
      deviceFingerprint: perfData.deviceFingerprint,
    };
  }
}
