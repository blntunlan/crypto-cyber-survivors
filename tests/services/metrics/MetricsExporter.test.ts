import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MetricsExporter } from '../../../services/metrics/MetricsExporter';
import { MarketPosition } from '../../../types';
import {
  type SessionMetrics,
  GameEndReason,
  createDefaultWavePhaseRecord,
} from '../../../types/metrics';

function createMockSession(): SessionMetrics {
  return {
    sessionId: 'test-123',
    sessionTimestamp: 1704110400000,
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
      pnlSamples: [],
      atrSamples: [],
    },
    difficulty: {
      averageDifficulty: 3,
      maxDifficulty: 5,
      difficultyAtDeath: 4,
      timeInEachWavePhase: createDefaultWavePhaseRecord(),
      timeInHighDifficulty: 0,
      timeInLowDifficulty: 0,
      nearDeathActivations: 0,
      difficultySamples: [],
      wavePhaseTransitions: [],
    },
    player: {
      totalKills: 100,
      survivalTimeMs: 60000,
      maxLevel: 10,
      damageDealt: 0,
      damageTaken: 0,
      healingReceived: 0,
      gemsCollected: 0,
      expEarned: 0,
      criticalHits: 0,
      superCriticalHits: 0,
      bulletsFired: 0,
      hpAtDeath: 0,
      finalStats: {
        damage: 0,
        fireRate: 0,
        speed: 0,
        luck: 0,
        critChance: 0,
        critDamage: 0,
      },
    },
    combo: {
      maxStreak: 0,
      averageStreak: 0,
      streakSamples: [],
      milestonesReached: [],
      comboTimeouts: 0,
      totalBonusXp: 0,
      longestComboTime: 0,
    },
    card: {
      cardsChosen: [],
      cardsByTier: {},
      levelUpCount: 0,
      averageTimeToLevelUp: 0,
      timesBetweenLevelUps: [],
    },
    enemy: {
      killsByType: {},
      maxEnemiesOnScreen: 0,
      averageEnemyLifetime: 0,
      spawnsTotal: 0,
      enemyLifetimeSamples: [],
    },
  };
}

describe('MetricsExporter', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should export to JSON', () => {
    const sessions = [createMockSession()];
    const json = MetricsExporter.toJSON(sessions);
    const parsed = JSON.parse(json);

    expect(parsed.version).toBe('1.0.0');
    expect(parsed.totalSessions).toBe(1);
    expect(parsed.sessions[0].sessionId).toBe('test-123');
  });

  it('should export to CSV', () => {
    const sessions = [createMockSession()];
    const csv = MetricsExporter.toCSV(sessions);

    expect(csv).toContain('Session ID,Date,Position');
    expect(csv).toContain('test-123');
    expect(csv).toContain('LONG');
    expect(csv).toContain('60'); // survival time 60000ms -> 60s
  });

  it('should trigger JSON download in browser', () => {
    const createObjectURLSpy = vi.fn().mockReturnValue('blob:url');
    global.URL.createObjectURL = createObjectURLSpy;
    global.URL.revokeObjectURL = vi.fn();

    const clickSpy = vi.fn();
    const createElementSpy = vi.spyOn(document, 'createElement').mockReturnValue({
      click: clickSpy,
      setAttribute: vi.fn(),
      style: {},
    } as any);

    const appendSpy = vi.spyOn(document.body, 'appendChild').mockReturnThis();
    const removeSpy = vi.spyOn(document.body, 'removeChild').mockReturnThis();

    MetricsExporter.downloadJSON([createMockSession()]);

    expect(createElementSpy).toHaveBeenCalledWith('a');
    expect(createObjectURLSpy).toHaveBeenCalled();
    expect(clickSpy).toHaveBeenCalled();
    expect(appendSpy).toHaveBeenCalled();
    expect(removeSpy).toHaveBeenCalled();
  });

  it('should trigger CSV download in browser', () => {
    const createObjectURLSpy = vi.fn().mockReturnValue('blob:url');
    global.URL.createObjectURL = createObjectURLSpy;

    const clickSpy = vi.fn();
    vi.spyOn(document, 'createElement').mockReturnValue({
      click: clickSpy,
      setAttribute: vi.fn(),
      style: {},
    } as any);

    MetricsExporter.downloadCSV([createMockSession()]);

    expect(createObjectURLSpy).toHaveBeenCalled();
    expect(clickSpy).toHaveBeenCalled();
  });
});
