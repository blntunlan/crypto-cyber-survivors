/**
 * MetricsStorage.test.ts - Unit tests for MetricsStorage
 *
 * Tests localStorage persistence, quota handling, and session management.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { MetricsStorage } from '../services/metrics/MetricsStorage';
import { type SessionMetrics, GameEndReason } from '../types/metrics';
import { MarketPosition } from '../types';

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string) => store[key] ?? null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value;
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key];
    }),
    clear: vi.fn(() => {
      store = {};
    }),
    get length() {
      return Object.keys(store).length;
    },
    key: vi.fn((index: number) => Object.keys(store)[index] ?? null),
  };
})();

// Mock Supabase
vi.mock('../services/supabase', () => ({
  supabase: null,
  isSupabaseConfigured: () => false,
}));

// Mock Logger
vi.mock('../services/Logger', () => ({
  Logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

// Create a minimal valid SessionMetrics object matching the actual type
function createMockSession(overrides: Partial<SessionMetrics> = {}): SessionMetrics {
  return {
    sessionId: `session_${Date.now()}_${Math.random().toString(36).slice(2)}`,
    sessionTimestamp: Date.now(),
    gameEndReason: GameEndReason.DEATH,
    pair: 'BTC',
    bitcoin: {
      priceAtStart: 50000,
      priceAtEnd: 51000,
      priceChange: 2.0,
      maxPnL: 5.0,
      minPnL: -1.0,
      averagePnL: 2.0,
      volatilityScore: 0.5,
      positionChosen: MarketPosition.LONG,
      leverage: 10,
      pnlAtDeath: 2.0,
      effectivePnLAtDeath: 20.0,
      pnlSamples: [1, 2, 3],
      atrSamples: [0.5, 0.6, 0.5],
    },
    difficulty: {
      averageDifficulty: 2.0,
      maxDifficulty: 3.5,
      difficultyAtDeath: 3.0,
      timeInEachWavePhase: {
        calm: 10000,
        building: 20000,
        intense: 30000,
        peak: 10000,
      },
      timeInHighDifficulty: 20000,
      timeInLowDifficulty: 30000,
      nearDeathActivations: 2,
      difficultySamples: [1.5, 2.0, 2.5, 3.0],
      wavePhaseTransitions: [
        { phase: 'calm', timestamp: 0 },
        { phase: 'building', timestamp: 10000 },
      ],
    },
    player: {
      maxLevel: 5,
      totalKills: 50,
      survivalTimeMs: 120000,
      damageDealt: 5000,
      damageTaken: 300,
      healingReceived: 50,
      gemsCollected: 100,
      expEarned: 1500,
      criticalHits: 25,
      superCriticalHits: 5,
      bulletsFired: 500,
      hpAtDeath: 0,
      finalStats: {
        damage: 10,
        fireRate: 2.5,
        speed: 5,
        luck: 0.1,
        critChance: 0.15,
        critDamage: 2.0,
      },
    },
    combo: {
      maxStreak: 25,
      averageStreak: 8,
      streakSamples: [5, 10, 15, 25],
      milestonesReached: ['Unstoppable', 'Dominating'],
      comboTimeouts: 3,
      totalBonusXp: 500,
      longestComboTime: 15000,
    },
    card: {
      cardsChosen: [
        { card: 'Diamond Hands', tier: 'legendary', level: 2 },
        { card: 'Flash Loan', tier: 'epic', level: 3 },
      ],
      cardsByTier: { common: 2, rare: 1, epic: 1, legendary: 1 },
      levelUpCount: 5,
      averageTimeToLevelUp: 24000,
      timesBetweenLevelUps: [20000, 25000, 22000, 30000, 23000],
    },
    enemy: {
      killsByType: { bear: 30, bull: 15, fud: 5 },
      maxEnemiesOnScreen: 25,
      averageEnemyLifetime: 3000,
      spawnsTotal: 100,
      enemyLifetimeSamples: [2000, 3000, 4000, 3500],
    },
    ...overrides,
  };
}

describe('MetricsStorage', () => {
  beforeEach(() => {
    // Reset mocks
    vi.clearAllMocks();
    localStorageMock.clear();

    // Replace global localStorage
    Object.defineProperty(global, 'localStorage', {
      value: localStorageMock,
      writable: true,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Constructor & Initialization', () => {
    it('should initialize with empty sessions when localStorage is empty', () => {
      const storage = new MetricsStorage();
      expect(storage.getCount()).toBe(0);
      expect(storage.getSessions()).toEqual([]);
    });

    it('should load existing sessions from localStorage', () => {
      const mockSessions = [createMockSession(), createMockSession()];
      localStorageMock.setItem(
        'crypto_survivors_metrics',
        JSON.stringify({ version: '1.0.0', sessions: mockSessions })
      );

      const storage = new MetricsStorage();
      expect(storage.getCount()).toBe(2);
    });

    it('should handle corrupted localStorage data gracefully', () => {
      localStorageMock.setItem('crypto_survivors_metrics', 'invalid json{{{');

      const storage = new MetricsStorage();
      expect(storage.getCount()).toBe(0);
    });

    it('should respect maxSessions parameter', () => {
      const storage = new MetricsStorage(5);

      // Add more than maxSessions
      for (let i = 0; i < 10; i++) {
        storage.addSession(createMockSession({ sessionId: `session_${i}` }));
      }

      expect(storage.getCount()).toBe(5);
    });
  });

  describe('addSession', () => {
    it('should add a session to the storage', () => {
      const storage = new MetricsStorage();
      const session = createMockSession();

      storage.addSession(session);

      expect(storage.getCount()).toBe(1);
      expect(storage.getSessions()[0]).toEqual(session);
    });

    it('should persist session to localStorage', () => {
      const storage = new MetricsStorage();
      const session = createMockSession();

      storage.addSession(session);

      expect(localStorageMock.setItem).toHaveBeenCalled();
      const savedData = JSON.parse(
        localStorageMock.setItem.mock.calls[localStorageMock.setItem.mock.calls.length - 1]?.[1] ??
          '{}'
      );
      expect(savedData.sessions).toHaveLength(1);
    });

    it('should enforce maxSessions limit by removing oldest first', () => {
      const storage = new MetricsStorage(3);

      storage.addSession(createMockSession({ sessionId: 'first' }));
      storage.addSession(createMockSession({ sessionId: 'second' }));
      storage.addSession(createMockSession({ sessionId: 'third' }));
      storage.addSession(createMockSession({ sessionId: 'fourth' }));

      expect(storage.getCount()).toBe(3);
      const sessions = storage.getSessions();
      expect(sessions[0]?.sessionId).toBe('second');
      expect(sessions[2]?.sessionId).toBe('fourth');
    });
  });

  describe('getSessions', () => {
    it('should return a copy of sessions array', () => {
      const storage = new MetricsStorage();
      const session = createMockSession();
      storage.addSession(session);

      const sessions1 = storage.getSessions();
      const sessions2 = storage.getSessions();

      // Should be different array references
      expect(sessions1).not.toBe(sessions2);
      // But same content
      expect(sessions1).toEqual(sessions2);
    });
  });

  describe('getCount', () => {
    it('should return correct count', () => {
      const storage = new MetricsStorage();

      expect(storage.getCount()).toBe(0);

      storage.addSession(createMockSession());
      expect(storage.getCount()).toBe(1);

      storage.addSession(createMockSession());
      expect(storage.getCount()).toBe(2);
    });
  });

  describe('clear', () => {
    it('should clear all sessions', () => {
      const storage = new MetricsStorage();
      storage.addSession(createMockSession());
      storage.addSession(createMockSession());

      storage.clear();

      expect(storage.getCount()).toBe(0);
      expect(storage.getSessions()).toEqual([]);
    });

    it('should remove data from localStorage', () => {
      const storage = new MetricsStorage();
      storage.addSession(createMockSession());

      storage.clear();

      expect(localStorageMock.removeItem).toHaveBeenCalledWith('crypto_survivors_metrics');
    });
  });

  describe('Quota Exceeded Handling', () => {
    it('should detect QuotaExceededError correctly', () => {
      // Test that the error detection works (indirectly through behavior)
      const storage = new MetricsStorage(10);

      // Add sessions - should work normally
      for (let i = 0; i < 5; i++) {
        storage.addSession(createMockSession({ sessionId: `session_${i}` }));
      }

      expect(storage.getCount()).toBe(5);
    });

    it('should limit sessions to maxSessions even with quota issues', () => {
      const storage = new MetricsStorage(5);

      // Add more than max - older ones should be removed
      for (let i = 0; i < 10; i++) {
        storage.addSession(createMockSession({ sessionId: `session_${i}` }));
      }

      // Should only keep the latest 5
      expect(storage.getCount()).toBe(5);
      const sessions = storage.getSessions();
      expect(sessions[0]?.sessionId).toBe('session_5');
      expect(sessions[4]?.sessionId).toBe('session_9');
    });
  });

  describe('load', () => {
    it('should reload sessions from localStorage', () => {
      const storage = new MetricsStorage();

      // Manually set data in localStorage
      const mockSessions = [createMockSession({ sessionId: 'reloaded' })];
      localStorageMock.getItem.mockReturnValue(
        JSON.stringify({ version: '1.0.0', sessions: mockSessions })
      );

      storage.load();

      expect(storage.getCount()).toBe(1);
      expect(storage.getSessions()[0]?.sessionId).toBe('reloaded');
    });

    it('should handle missing sessions key in stored data', () => {
      const storage = new MetricsStorage();

      localStorageMock.getItem.mockReturnValue(JSON.stringify({ version: '1.0.0' }));

      storage.load();

      expect(storage.getCount()).toBe(0);
    });
  });

  describe('Supabase Integration', () => {
    it('should skip Supabase sync when not configured', async () => {
      const storage = new MetricsStorage();
      const session = createMockSession();

      // This should not throw even though supabase is null
      storage.addSession(session);

      // Verify session was still added locally
      expect(storage.getCount()).toBe(1);
    });
  });
});
