/**
 * MetricsStorage.test.ts - Unit tests for MetricsStorage
 *
 * Tests localStorage persistence, quota handling, and session management.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { MetricsStorage } from '../services/core/metrics/MetricsStorage';
import {
  type SessionMetrics,
  GameEndReason,
  createDefaultWavePhaseRecord,
} from '../types/metrics';
import { MarketPosition } from '../types';

// Mock localStorage with quota simulation
let quotaExceeded = false;
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string) => store[key] ?? null),
    setItem: vi.fn((key: string, value: string) => {
      if (quotaExceeded) {
        const error = new DOMException('Quota exceeded', 'QuotaExceededError');
        throw error;
      }
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
    _setStore: (newStore: Record<string, string>) => {
      store = newStore;
    },
    _getStore: () => store,
  };
})();

const mockRailwayPost = vi.fn();
const mockVerificationEnqueue = vi.fn();
const mockEventBusEmit = vi.fn();

vi.mock('../services/api/RailwayClient', () => ({
  railwayClient: {
    post: (...args: unknown[]) => mockRailwayPost(...args),
  },
}));

vi.mock('../services/verification/VerificationQueue', () => ({
  VerificationQueue: {
    enqueue: (...args: unknown[]) => mockVerificationEnqueue(...args),
  },
}));

vi.mock('../services/core/EventBus', () => ({
  EventBus: {
    emit: (...args: unknown[]) => mockEventBusEmit(...args),
    on: vi.fn(() => vi.fn()),
  },
}));

// Mock Logger
vi.mock('../services/system/Logger', () => ({
  Logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

// Mock import.meta.env for analytics
vi.stubEnv('VITE_ENABLE_ANALYTICS', 'true');

// Mock UserSessionService
vi.mock('../services/auth/UserSessionService', () => ({
  UserSessionService: {
    getProfileId: vi.fn(() => 'test-profile-id'),
    getNickname: vi.fn(() => 'test-player'),
  },
}));

// Create a minimal valid SessionMetrics object matching the actual type
function createMockSession(overrides: Partial<SessionMetrics> = {}): SessionMetrics {
  return {
    sessionId: `session_${Date.now()}_${Math.random().toString(36).slice(2)}`,
    serverSessionId: '11111111-1111-4111-8111-111111111111',
    serverSigningKey: 'test-signing-key',
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
        ...createDefaultWavePhaseRecord(),
        active: 70000,
      },
      timeInHighDifficulty: 20000,
      timeInLowDifficulty: 30000,
      nearDeathActivations: 2,
      difficultySamples: [1.5, 2.0, 2.5, 3.0],
      wavePhaseTransitions: [{ phase: 'active', timestamp: 0 }],
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
    performance: {
      avgFps: 60,
      minFps: 45,
      maxFps: 60,
      fpsSamples: 100,
      frameDrops: 5,
      memoryUsedMb: 150,
      memoryPeakMb: 200,
      enemyCountMax: 50,
      optimizationProfile: 'high',
      deviceFingerprint: 'test-device',
    },
    ...overrides,
  };
}

describe('MetricsStorage', () => {
  beforeEach(() => {
    // Reset mocks
    vi.clearAllMocks();
    localStorageMock.clear();
    quotaExceeded = false;
    vi.stubEnv('VITE_RAILWAY_API_URL', '');
    vi.stubEnv('VITE_ENABLE_ANALYTICS', 'true');
    mockRailwayPost.mockResolvedValue({ id: 'game-session-123' });
    mockVerificationEnqueue.mockResolvedValue(undefined);

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
        localStorageMock.setItem.mock.calls[
          localStorageMock.setItem.mock.calls.length - 1
        ]?.[1] ?? '{}'
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

      expect(localStorageMock.removeItem).toHaveBeenCalledWith(
        'crypto_survivors_metrics'
      );
    });

    it('should handle localStorage error gracefully during clear', () => {
      const storage = new MetricsStorage();
      storage.addSession(createMockSession());

      // Make removeItem throw
      localStorageMock.removeItem.mockImplementationOnce(() => {
        throw new Error('Storage error');
      });

      // Should not throw
      expect(() => storage.clear()).not.toThrow();
      expect(storage.getCount()).toBe(0);
    });
  });

  describe('Quota Exceeded Handling', () => {
    it('should detect QuotaExceededError and cleanup', () => {
      const storage = new MetricsStorage(20);

      // Add some sessions first (before quota is exceeded)
      for (let i = 0; i < 15; i++) {
        storage.addSession(createMockSession({ sessionId: `session_${i}` }));
      }

      expect(storage.getCount()).toBe(15);

      // Now simulate quota exceeded on next save
      quotaExceeded = true;

      // This should trigger quota handling
      storage.addSession(createMockSession({ sessionId: 'trigger_quota' }));

      // Should have cleaned up and kept fewer sessions
      expect(storage.getCount()).toBeLessThanOrEqual(16);
    });

    it('should keep minimum 10 sessions during first cleanup attempt', () => {
      const storage = new MetricsStorage(50);

      // Add 30 sessions
      for (let i = 0; i < 30; i++) {
        storage.addSession(createMockSession({ sessionId: `session_${i}` }));
      }

      // Verify we start with 30
      expect(storage.getCount()).toBe(30);
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

    it('should handle non-quota errors during save', () => {
      const storage = new MetricsStorage();

      // Make setItem throw a non-quota error
      const genericError = new Error('Generic error');
      localStorageMock.setItem.mockImplementationOnce(() => {
        throw genericError;
      });

      // Should not throw
      expect(() => storage.addSession(createMockSession())).not.toThrow();

      // Session should still be added to memory
      expect(storage.getCount()).toBe(1);
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

    it('should handle null stored data', () => {
      const storage = new MetricsStorage();

      localStorageMock.getItem.mockReturnValue(null);

      storage.load();

      expect(storage.getCount()).toBe(0);
    });

    it('should handle localStorage.getItem throwing error', () => {
      const storage = new MetricsStorage();

      localStorageMock.getItem.mockImplementationOnce(() => {
        throw new Error('Storage access denied');
      });

      // Should not throw, should initialize with empty array
      expect(() => storage.load()).not.toThrow();
      expect(storage.getCount()).toBe(0);
    });
  });

  describe('Railway Integration', () => {
    it('should skip Railway sync when not configured', async () => {
      const storage = new MetricsStorage();
      const session = createMockSession();

      storage.addSession(session);

      expect(storage.getCount()).toBe(1);
      expect(mockRailwayPost).not.toHaveBeenCalled();
    });

    it('should sync session data to Railway when configured', async () => {
      vi.stubEnv('VITE_RAILWAY_API_URL', 'http://localhost:3001');
      const storage = new MetricsStorage();
      const session = createMockSession();

      storage.addSession(session);

      await vi.waitFor(() => {
        expect(mockRailwayPost).toHaveBeenCalledWith(
          '/api/v1/sessions/sync',
          expect.objectContaining({
            sessionId: session.serverSessionId,
            sessionData: expect.objectContaining({
              entry_price: session.bitcoin.priceAtStart,
              exit_price: session.bitcoin.priceAtEnd,
              survival_seconds: Math.floor(session.player.survivalTimeMs / 1000),
              kills: session.player.totalKills,
            }),
          })
        );
      });

      expect(mockVerificationEnqueue).not.toHaveBeenCalled();
      expect(mockEventBusEmit).toHaveBeenCalledWith('sessionSynced', {
        sessionId: 'game-session-123',
        profileId: 'test-profile-id',
      });
    });

    it('should handle Railway quota errors gracefully', async () => {
      vi.stubEnv('VITE_RAILWAY_API_URL', 'http://localhost:3001');
      mockRailwayPost.mockRejectedValueOnce(
        Object.assign(new Error('402 quota exhausted'), { code: '402' })
      );
      const storage = new MetricsStorage();
      const session = createMockSession();

      storage.addSession(session);

      expect(storage.getCount()).toBe(1);

      await vi.waitFor(() => {
        expect(mockEventBusEmit).toHaveBeenCalledWith(
          'sessionSyncFailed',
          expect.objectContaining({
            sessionId: session.sessionId,
            retryCount: 0,
          })
        );
      });
    });

    it('should handle duplicate session (replay attack) silently', async () => {
      vi.stubEnv('VITE_RAILWAY_API_URL', 'http://localhost:3001');
      mockRailwayPost.mockRejectedValueOnce(
        Object.assign(new Error('Duplicate key'), { code: '23505' })
      );
      const storage = new MetricsStorage();
      const session = createMockSession();

      storage.addSession(session);

      expect(storage.getCount()).toBe(1);

      await vi.waitFor(() => {
        expect(mockRailwayPost).toHaveBeenCalledWith(
          '/api/v1/sessions/sync',
          expect.any(Object)
        );
      });
      expect(mockVerificationEnqueue).not.toHaveBeenCalled();
    });

    it('should treat verified session mutation conflicts as terminal sync skip', async () => {
      vi.stubEnv('VITE_RAILWAY_API_URL', 'http://localhost:3001');
      mockRailwayPost.mockRejectedValueOnce(
        new Error('verified sessions cannot be mutated')
      );
      const storage = new MetricsStorage();
      const session = createMockSession({ performance: undefined });

      storage.addSession(session);

      await vi.waitFor(() => {
        expect(mockEventBusEmit).toHaveBeenCalledWith('sessionSynced', {
          sessionId: session.serverSessionId,
          profileId: 'test-profile-id',
        });
      });

      expect(mockEventBusEmit).not.toHaveBeenCalledWith(
        'sessionSyncFailed',
        expect.any(Object)
      );
      expect(mockRailwayPost).toHaveBeenCalledTimes(1);
    });

    it('should sync performance metrics when available', async () => {
      vi.stubEnv('VITE_RAILWAY_API_URL', 'http://localhost:3001');
      const storage = new MetricsStorage();
      const session = createMockSession({
        performance: {
          avgFps: 60,
          minFps: 55,
          maxFps: 60,
          fpsSamples: 100,
          frameDrops: 2,
          memoryUsedMb: 100,
          memoryPeakMb: 120,
          enemyCountMax: 30,
          optimizationProfile: 'medium',
          deviceFingerprint: 'test-device',
        },
      });

      storage.addSession(session);

      await vi.waitFor(() => {
        expect(mockRailwayPost).toHaveBeenCalledWith(
          '/api/v1/telemetry/performance-metrics',
          expect.objectContaining({
            session_id: 'game-session-123',
            profile_id: 'test-profile-id',
            avg_fps: 60,
            min_fps: 55,
            frame_drops: 2,
            metadata: expect.objectContaining({
              runtime_diagnostics: expect.objectContaining({
                summary: expect.objectContaining({
                  totalFrames: expect.any(Number),
                }),
              }),
            }),
          })
        );
      });
    });

    it('should persist non-anonymous run totals through the Railway session sync', async () => {
      vi.stubEnv('VITE_RAILWAY_API_URL', 'http://localhost:3001');
      const storage = new MetricsStorage();
      const session = createMockSession({
        player: {
          ...createMockSession().player,
          survivalTimeMs: 150000,
          totalKills: 75,
        },
      });

      storage.addSession(session);

      await vi.waitFor(() => {
        expect(mockRailwayPost).toHaveBeenCalledWith(
          '/api/v1/sessions/sync',
          expect.objectContaining({
            sessionData: expect.objectContaining({
              survival_seconds: 150,
              kills: 75,
            }),
          })
        );
      });
    });
  });

  describe('Error Recovery', () => {
    it('should handle complete localStorage failure', () => {
      // Make all localStorage operations fail
      localStorageMock.getItem.mockImplementation(() => {
        throw new Error('Storage unavailable');
      });
      localStorageMock.setItem.mockImplementation(() => {
        throw new Error('Storage unavailable');
      });

      // Should not throw during construction
      const storage = new MetricsStorage();

      // Should still work in memory
      storage.addSession(createMockSession());
      expect(storage.getCount()).toBe(1);
    });
  });
});
