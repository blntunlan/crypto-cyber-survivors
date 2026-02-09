/**
 * MetricsAnalyzer - Analyzes metrics data to generate insights
 *
 * Provides:
 * - Bitcoin/Market insights
 * - Difficulty balance insights
 * - Player experience insights
 * - Improvement recommendations
 */

import { MarketPosition } from '../../../types';
import {
  type SessionMetrics,
  type WavePhase,
  type GameInsights,
  type BitcoinInsights,
  type DifficultyInsights,
  type PlayerExperienceInsights,
} from '../../../types/metrics';

export class MetricsAnalyzer {
  private sessions: SessionMetrics[];

  constructor(sessions: SessionMetrics[]) {
    this.sessions = sessions;
  }

  /**
   * Get all insights combined
   */
  getInsights(): GameInsights {
    return {
      bitcoin: this.getBitcoinInsights(),
      difficulty: this.getDifficultyInsights(),
      playerExperience: this.getPlayerExperienceInsights(),
      recommendations: this.generateRecommendations(),
    };
  }

  /**
   * Bitcoin/Market-related insights
   */
  getBitcoinInsights(): BitcoinInsights {
    const sessions = this.sessions;

    // Position success rate
    const positionStats: Record<
      MarketPosition,
      { totalSurvival: number; totalLevel: number; count: number }
    > = {
      [MarketPosition.LONG]: { totalSurvival: 0, totalLevel: 0, count: 0 },
      [MarketPosition.SHORT]: { totalSurvival: 0, totalLevel: 0, count: 0 },
    };

    for (const s of sessions) {
      const pos = s.bitcoin.positionChosen;
      positionStats[pos].totalSurvival += s.player.survivalTimeMs;
      positionStats[pos].totalLevel += s.player.maxLevel;
      positionStats[pos].count++;
    }

    // Survival by PnL ranges
    const pnlRanges = [
      { min: -Infinity, max: -0.1, label: '< -10%' },
      { min: -0.1, max: -0.05, label: '-10% to -5%' },
      { min: -0.05, max: 0, label: '-5% to 0%' },
      { min: 0, max: 0.05, label: '0% to 5%' },
      { min: 0.05, max: 0.1, label: '5% to 10%' },
      { min: 0.1, max: Infinity, label: '> 10%' },
    ];

    const survivalByPnL = pnlRanges.map(range => {
      const matching = sessions.filter(
        s => s.bitcoin.pnlAtDeath >= range.min && s.bitcoin.pnlAtDeath < range.max
      );
      return {
        pnlRange: range.label,
        avgSurvival:
          matching.length > 0
            ? matching.reduce((a, b) => a + b.player.survivalTimeMs, 0) /
              matching.length /
              1000
            : 0,
        avgLevel:
          matching.length > 0
            ? matching.reduce((a, b) => a + b.player.maxLevel, 0) / matching.length
            : 0,
        count: matching.length,
      };
    });

    // Volatility impact
    const lowVol = sessions.filter(s => s.bitcoin.volatilityScore < 0.01);
    const medVol = sessions.filter(
      s => s.bitcoin.volatilityScore >= 0.01 && s.bitcoin.volatilityScore < 0.02
    );
    const highVol = sessions.filter(s => s.bitcoin.volatilityScore >= 0.02);

    const calcAvg = (arr: SessionMetrics[]) => ({
      avgSurvival:
        arr.length > 0
          ? arr.reduce((a, b) => a + b.player.survivalTimeMs, 0) / arr.length / 1000
          : 0,
      avgLevel:
        arr.length > 0
          ? arr.reduce((a, b) => a + b.player.maxLevel, 0) / arr.length
          : 0,
      count: arr.length,
    });

    // PnL-Difficulty correlation
    let pnlDiffCorrelation = 0;
    if (sessions.length > 0) {
      const pnlValues = sessions.map(s => s.bitcoin.averagePnL);
      const diffValues = sessions.map(s => s.difficulty.averageDifficulty);
      pnlDiffCorrelation = this.calculateCorrelation(pnlValues, diffValues);
    }

    return {
      positionSuccessRate: {
        [MarketPosition.LONG]: {
          avgSurvival:
            positionStats[MarketPosition.LONG].count > 0
              ? positionStats[MarketPosition.LONG].totalSurvival /
                positionStats[MarketPosition.LONG].count /
                1000
              : 0,
          avgLevel:
            positionStats[MarketPosition.LONG].count > 0
              ? positionStats[MarketPosition.LONG].totalLevel /
                positionStats[MarketPosition.LONG].count
              : 0,
          gamesPlayed: positionStats[MarketPosition.LONG].count,
        },
        [MarketPosition.SHORT]: {
          avgSurvival:
            positionStats[MarketPosition.SHORT].count > 0
              ? positionStats[MarketPosition.SHORT].totalSurvival /
                positionStats[MarketPosition.SHORT].count /
                1000
              : 0,
          avgLevel:
            positionStats[MarketPosition.SHORT].count > 0
              ? positionStats[MarketPosition.SHORT].totalLevel /
                positionStats[MarketPosition.SHORT].count
              : 0,
          gamesPlayed: positionStats[MarketPosition.SHORT].count,
        },
      },
      survivalByPnL,
      volatilityImpact: {
        lowVolatility: calcAvg(lowVol),
        mediumVolatility: calcAvg(medVol),
        highVolatility: calcAvg(highVol),
      },
      pnlDifficultyCorrelation: pnlDiffCorrelation,
    };
  }

  /**
   * Difficulty-related insights
   */
  getDifficultyInsights(): DifficultyInsights {
    const sessions = this.sessions;

    const diffRanges = [
      { min: 0, max: 2, label: '0-2 (Easy)' },
      { min: 2, max: 4, label: '2-4 (Medium)' },
      { min: 4, max: 6, label: '4-6 (Hard)' },
      { min: 6, max: 8, label: '6-8 (Extreme)' },
    ];

    const deathsByDifficultyRange: Record<string, number> = {};
    for (const range of diffRanges) {
      deathsByDifficultyRange[range.label] = sessions.filter(
        s =>
          s.difficulty.difficultyAtDeath >= range.min &&
          s.difficulty.difficultyAtDeath < range.max
      ).length;
    }

    const totalActivations = sessions.reduce(
      (a, b) => a + b.difficulty.nearDeathActivations,
      0
    );

    // AI Director V2: Only 'active' phase
    const phases: WavePhase[] = ['active'];
    const wavePhaseStats = {} as Record<
      WavePhase,
      { avgTime: number; deathRate: number }
    >;
    for (const phase of phases) {
      wavePhaseStats[phase] = { avgTime: 0, deathRate: 0 };
    }

    for (const phase of phases) {
      const times = sessions
        .map(s => s.difficulty.timeInEachWavePhase[phase])
        .filter((t): t is number => t !== undefined);
      wavePhaseStats[phase].avgTime =
        times.length > 0 ? times.reduce((a, b) => a + b, 0) / times.length / 1000 : 0;
    }

    let optimalRange = { min: 2, max: 4, avgSurvival: 0 };
    for (const range of diffRanges) {
      const matching = sessions.filter(
        s =>
          s.difficulty.averageDifficulty >= range.min &&
          s.difficulty.averageDifficulty < range.max
      );
      if (matching.length > 0) {
        const avgSurvival =
          matching.reduce((a, b) => a + b.player.survivalTimeMs, 0) /
          matching.length /
          1000;
        if (avgSurvival > optimalRange.avgSurvival) {
          optimalRange = { min: range.min, max: range.max, avgSurvival };
        }
      }
    }

    return {
      deathsByDifficultyRange,
      nearDeathUsage: {
        totalActivations,
        avgPerGame: sessions.length > 0 ? totalActivations / sessions.length : 0,
        survivalRateAfter: 0,
      },
      wavePhaseStats,
      optimalDifficultyRange: optimalRange,
    };
  }

  /**
   * Player experience insights
   */
  getPlayerExperienceInsights(): PlayerExperienceInsights {
    const sessions = this.sessions;

    const durations = sessions.map(s => s.player.survivalTimeMs / 1000);
    const avgDuration =
      durations.length > 0
        ? durations.reduce((a, b) => a + b, 0) / durations.length
        : 0;
    const sortedDurations = [...durations].sort((a, b) => a - b);
    const medianDuration =
      sortedDurations.length > 0
        ? (sortedDurations[Math.floor(sortedDurations.length / 2)] ?? 0)
        : 0;

    const deathsByLevel: Record<number, number> = {};
    for (const s of sessions) {
      deathsByLevel[s.player.maxLevel] = (deathsByLevel[s.player.maxLevel] ?? 0) + 1;
    }

    const cardCounts: Record<string, { count: number; tier: string }> = {};
    for (const s of sessions) {
      for (const card of s.card.cardsChosen) {
        cardCounts[card.card] ??= { count: 0, tier: card.tier };
        cardCounts[card.card]!.count++;
      }
    }
    const totalCardPicks = Object.values(cardCounts).reduce((a, b) => a + b.count, 0);
    const cardPopularity = Object.entries(cardCounts)
      .map(([card, data]) => ({
        card,
        tier: data.tier,
        pickRate: totalCardPicks > 0 ? data.count / totalCardPicks : 0,
        winRateImpact: 0,
      }))
      .sort((a, b) => b.pickRate - a.pickRate);

    const avgMaxStreak =
      sessions.length > 0
        ? sessions.reduce((a, b) => a + b.combo.maxStreak, 0) / sessions.length
        : 0;
    const avgMilestones =
      sessions.length > 0
        ? sessions.reduce((a, b) => a + b.combo.milestonesReached.length, 0) /
          sessions.length
        : 0;
    const avgBonusXp =
      sessions.length > 0
        ? sessions.reduce((a, b) => a + b.combo.totalBonusXp, 0) / sessions.length
        : 0;

    const avgLevelsPerMinute =
      avgDuration > 0
        ? sessions.reduce((a, b) => a + b.player.maxLevel, 0) /
          sessions.length /
          (avgDuration / 60)
        : 0;
    const avgKillsPerLevel =
      sessions.reduce((a, b) => a + b.player.maxLevel, 0) > 0
        ? sessions.reduce((a, b) => a + b.player.totalKills, 0) /
          sessions.reduce((a, b) => a + b.player.maxLevel, 0)
        : 0;

    return {
      averageGameDuration: avgDuration,
      medianGameDuration: medianDuration,
      deathsByLevel,
      cardPopularity,
      comboEngagement: {
        averageMaxStreak: avgMaxStreak,
        milestonesPerGame: avgMilestones,
        bonusXpPerGame: avgBonusXp,
      },
      progressionSpeed: {
        avgLevelsPerMinute,
        avgKillsPerLevel,
      },
    };
  }

  /**
   * Generate improvement recommendations
   */
  generateRecommendations(): string[] {
    const recommendations: string[] = [];
    const sessions = this.sessions;

    if (sessions.length < 5) {
      recommendations.push('Daha fazla oyun verisi topla (en az 5 oturum önerilir)');
      return recommendations;
    }

    const insights = {
      bitcoin: this.getBitcoinInsights(),
      difficulty: this.getDifficultyInsights(),
      player: this.getPlayerExperienceInsights(),
    };

    // Bitcoin balance
    const longSuccess = insights.bitcoin.positionSuccessRate[MarketPosition.LONG];
    const shortSuccess = insights.bitcoin.positionSuccessRate[MarketPosition.SHORT];
    if (
      longSuccess.gamesPlayed > 3 &&
      shortSuccess.gamesPlayed > 3 &&
      Math.abs(longSuccess.avgSurvival - shortSuccess.avgSurvival) > 30
    ) {
      const better =
        longSuccess.avgSurvival > shortSuccess.avgSurvival ? 'LONG' : 'SHORT';
      recommendations.push(
        `${better} pozisyon önemli ölçüde daha kolay. Dengeyi kontrol et.`
      );
    }

    // Difficulty balance
    const deathsInExtreme =
      insights.difficulty.deathsByDifficultyRange['6-8 (Extreme)'] ?? 0;
    const totalDeaths = Object.values(
      insights.difficulty.deathsByDifficultyRange
    ).reduce((a, b) => a + b, 0);
    if (totalDeaths > 0 && deathsInExtreme / totalDeaths > 0.5) {
      recommendations.push(
        'Çoğu ölüm aşırı zorlukta gerçekleşiyor. Max zorluğu azaltmayı düşün.'
      );
    }

    // Game duration
    if (insights.player.averageGameDuration < 60) {
      recommendations.push(
        'Ortalama oyun süresi çok kısa (< 1 dk). Erken oyun zorluğunu azalt.'
      );
    }
    if (insights.player.averageGameDuration > 600) {
      recommendations.push(
        'Ortalama oyun süresi çok uzun (> 10 dk). Geç oyun zorluğunu artır.'
      );
    }

    // Near-death usage
    if (insights.difficulty.nearDeathUsage.avgPerGame < 0.5) {
      recommendations.push(
        'Near-death mercy sistemi nadiren kullanılıyor. Eşiği yükseltmeyi düşün.'
      );
    }

    // Combo engagement
    if (insights.player.comboEngagement.averageMaxStreak < 5) {
      recommendations.push(
        'Combo sistemi yeterince kullanılmıyor. Ödülleri artırmayı düşün.'
      );
    }

    // PnL-Difficulty correlation
    if (Math.abs(insights.bitcoin.pnlDifficultyCorrelation) < 0.3) {
      recommendations.push(
        'Bitcoin fiyatının zorluk üzerinde etkisi düşük. PnL faktörünü güçlendir.'
      );
    }

    return recommendations;
  }

  /**
   * Calculate Pearson correlation coefficient
   */
  private calculateCorrelation(x: number[], y: number[]): number {
    if (x.length !== y.length || x.length === 0) return 0;

    const n = x.length;
    const sumX = x.reduce((a, b) => a + b, 0);
    const sumY = y.reduce((a, b) => a + b, 0);
    const sumXY = x.reduce((total, xi, i) => total + xi * (y[i] ?? 0), 0);
    const sumX2 = x.reduce((total, xi) => total + xi * xi, 0);
    const sumY2 = y.reduce((total, yi) => total + yi * yi, 0);

    const numerator = n * sumXY - sumX * sumY;
    const denominator = Math.sqrt(
      (n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY)
    );

    return denominator !== 0 ? numerator / denominator : 0;
  }
}
