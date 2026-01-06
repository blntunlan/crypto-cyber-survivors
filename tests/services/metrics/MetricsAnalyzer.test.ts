import { describe, it, expect } from 'vitest';
import { MetricsAnalyzer } from '../../../services/metrics/MetricsAnalyzer';
import { MarketPosition } from '../../../types';
import {
  type SessionMetrics,
  GameEndReason,
  createDefaultWavePhaseRecord,
} from '../../../types/metrics';

function createMockSession(overrides: Partial<SessionMetrics> = {}): SessionMetrics {
  const base: SessionMetrics = {
    sessionId: 'test',
    sessionTimestamp: Date.now(),
    gameEndReason: GameEndReason.DEATH,
    pair: 'BTC',
    bitcoin: {
      priceAtStart: 50000,
      priceAtEnd: 51000,
      priceChange: 2,
      maxPnL: 0.1,
      minPnL: -0.05,
      averagePnL: 0.02,
      volatilityScore: 0.015,
      positionChosen: MarketPosition.LONG,
      leverage: 10,
      pnlAtDeath: 0.02,
      effectivePnLAtDeath: 0.2,
      pnlSamples: [0, 0.01, 0.02],
      atrSamples: [0.01, 0.015, 0.02],
    },
    difficulty: {
      averageDifficulty: 3,
      maxDifficulty: 5,
      difficultyAtDeath: 4,
      timeInEachWavePhase: { ...createDefaultWavePhaseRecord(), warmup: 10000, buildup: 20000 },
      timeInHighDifficulty: 0,
      timeInLowDifficulty: 10000,
      nearDeathActivations: 1,
      difficultySamples: [1, 2, 3, 4, 5],
      wavePhaseTransitions: [],
    },
    player: {
      totalKills: 100,
      survivalTimeMs: 60000,
      maxLevel: 10,
      damageDealt: 5000,
      damageTaken: 200,
      healingReceived: 50,
      gemsCollected: 80,
      expEarned: 1000,
      criticalHits: 20,
      superCriticalHits: 2,
      bulletsFired: 400,
      hpAtDeath: 0,
      finalStats: { damage: 10, fireRate: 1, speed: 5, luck: 0, critChance: 0.1, critDamage: 2 },
    },
    combo: {
      maxStreak: 20,
      averageStreak: 10,
      streakSamples: [5, 10, 15, 20],
      milestonesReached: ['Combo'],
      comboTimeouts: 1,
      totalBonusXp: 200,
      longestComboTime: 10000,
    },
    card: {
      cardsChosen: [{ card: 'Test', tier: 'common', level: 1 }],
      cardsByTier: { common: 1 },
      levelUpCount: 1,
      averageTimeToLevelUp: 30000,
      timesBetweenLevelUps: [30000],
    },
    enemy: {
      killsByType: { bear: 50, bull: 50 },
      maxEnemiesOnScreen: 15,
      averageEnemyLifetime: 2000,
      spawnsTotal: 120,
      enemyLifetimeSamples: [1000, 3000],
    },
  };

  // Deep merge overrides
  return {
    ...base,
    ...overrides,
    bitcoin: { ...base.bitcoin, ...overrides.bitcoin },
    difficulty: { ...base.difficulty, ...overrides.difficulty },
    player: { ...base.player, ...overrides.player },
  } as SessionMetrics;
}

describe('MetricsAnalyzer', () => {
  it('should calculate bitcoin insights', () => {
    const s1 = createMockSession({
      bitcoin: { positionChosen: MarketPosition.LONG, averagePnL: 0.05 },
    });
    const s2 = createMockSession({
      bitcoin: { positionChosen: MarketPosition.SHORT, averagePnL: -0.05 },
    });

    const analyzer = new MetricsAnalyzer([s1, s2]);
    const insights = analyzer.getBitcoinInsights();

    expect(insights.positionSuccessRate[MarketPosition.LONG].gamesPlayed).toBe(1);
    expect(insights.positionSuccessRate[MarketPosition.SHORT].gamesPlayed).toBe(1);
  });

  it('should calculate difficulty insights', () => {
    const s1 = createMockSession({ difficulty: { difficultyAtDeath: 1.5 } });
    const s2 = createMockSession({ difficulty: { difficultyAtDeath: 7.5 } });

    const analyzer = new MetricsAnalyzer([s1, s2]);
    const insights = analyzer.getDifficultyInsights();

    expect(insights.deathsByDifficultyRange['0-2 (Easy)']).toBe(1);
    expect(insights.deathsByDifficultyRange['6-8 (Extreme)']).toBe(1);
  });

  it('should calculate player experience insights', () => {
    const s1 = createMockSession({ player: { survivalTimeMs: 60000, maxLevel: 5 } });
    const s2 = createMockSession({ player: { survivalTimeMs: 120000, maxLevel: 15 } });

    const analyzer = new MetricsAnalyzer([s1, s2]);
    const insights = analyzer.getPlayerExperienceInsights();

    expect(insights.averageGameDuration).toBe(90); // (60+120)/2
    expect(insights.progressionSpeed.avgLevelsPerMinute).toBe(6.666666666666667); // (20 levels) / (1.5 min avg)
    // Wait: avgLevelsPerMinute calculation in code:
    // avgLevelsPerMinute = sessions.reduce(sumLevels) / sessions.length / (avgDuration / 60)
    // sumLevels = 20. length = 2. avgDuration = 90.
    // 20 / 2 / (90/60) = 10 / 1.5 = 6.666
  });

  it('should generate recommendations', () => {
    // Need at least 5 sessions
    const sessions = Array(6)
      .fill(null)
      .map(() => createMockSession());
    const analyzer = new MetricsAnalyzer(sessions);
    const recs = analyzer.generateRecommendations();

    expect(recs).toBeInstanceOf(Array);
  });

  it('should detect when LONG is much better than SHORT', () => {
    const longSession = createMockSession({
      bitcoin: { positionChosen: MarketPosition.LONG },
      player: { survivalTimeMs: 200000 },
    });
    const shortSession = createMockSession({
      bitcoin: { positionChosen: MarketPosition.SHORT },
      player: { survivalTimeMs: 50000 },
    });

    // Need at least 4 of each roughly to trigger the comparison logic in code
    // Actually the code check is just gamesPlayed > 3
    const sessions = [...Array(4).fill(longSession), ...Array(4).fill(shortSession)];

    const analyzer = new MetricsAnalyzer(sessions);
    const recs = analyzer.generateRecommendations();

    expect(recs.some(r => r.includes('LONG pozisyon önemli ölçüde daha kolay'))).toBe(true);
  });
});
