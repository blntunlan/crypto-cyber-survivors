import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MetricsService } from '../../services/core/MetricsService';
import { Logger } from '../../services/system/Logger';
import { MarketPosition } from '../../types';
import { GameEndReason } from '../../types/metrics';

// Mock dependencies
vi.mock('../../services/core/EventBus', () => ({
  EventBus: {
    on: vi.fn(() => vi.fn()),
    emit: vi.fn(),
  },
}));

vi.mock('../../services/system/Logger', () => ({
  Logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock('../../config/MetricsConfig', () => ({
  getMetricsConfig: vi.fn(() => ({
    enabled: true,
    storage: { maxLocalSessions: 10 },
    sampling: { intervalMs: 1000 },
  })),
}));

// Mock MetricsStorage etc if needed, but they are instantiated inside private constructor.
// Since MetricsService is a singleton, we need to be careful.
// The code has `resetStateForTesting` which re-initializes listeners.

describe('MetricsService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset internal state
    MetricsService.resetStateForTesting();
  });

  it('should be enabled by default', () => {
    expect(MetricsService.isEnabled()).toBe(true);
  });

  it('should start a session', () => {
    const sessionId = MetricsService.startSession(
      MarketPosition.LONG,
      50000,
      10,
      'BTC' as const
    );

    expect(sessionId).toContain('session_');
    expect(MetricsService.isSessionActive()).toBe(true);
    expect(Logger.info).toHaveBeenCalledWith(
      expect.stringContaining('Session started'),
      expect.any(Object)
    );

    const state = MetricsService.getCurrentState();
    expect(state).toBeTruthy();
    expect(state?.pair).toBe('BTC');
  });

  it('should update metrics during game loop', () => {
    MetricsService.startSession(MarketPosition.SHORT, 40000, 5, 'ETH' as const);

    MetricsService.update(
      16, // deltaMs
      100, // pnl
      2, // difficulty
      80, // hpPercent
      10, // enemyCount
      0, // bulletCount
      0, // particleCount
      'climax' as any, // wavePhase
      0.5 // atr
    );

    const state = MetricsService.getCurrentState();
    expect(state?.maxEnemiesOnScreen).toBe(10);
    expect(state?.maxPnL).toBe(100);
    expect(state?.currentWavePhase).toBe('climax');
  });

  it('should track damage dealt via events', () => {
    MetricsService.startSession(MarketPosition.LONG, 50000, 10, 'BTC' as const);

    // Simulate event
    // Since we mocked EventBus.on, the service called it during setup.
    // We need to capture the callback passed to 'critHit' or call trackDamageDealt directly?
    // The service has `trackDamageDealt` public (or public-like).

    MetricsService.trackDamageDealt(50, true, false);
    const state = MetricsService.getCurrentState();
    expect(state?.totalDamageDealt).toBe(50);
    expect(state?.totalCrits).toBe(1);
  });

  it('should end session and return metrics', () => {
    MetricsService.startSession(MarketPosition.LONG, 50000, 10, 'BTC' as const);

    const finalData = {
      price: 55000,
      pnl: 10,
      level: 5,
      hp: 0,
      difficulty: 3,
      playerStats: {
        damage: 10,
        fireRate: 1,
        speed: 1,
        luck: 1,
        critChance: 0.1,
        critDamage: 1.5,
      },
      position: MarketPosition.LONG,
      entryPrice: 50000,
      leverage: 10,
      totalKills: 20,
    };

    const session = MetricsService.endSession(GameEndReason.DEATH, finalData);

    expect(session).toBeTruthy();
    expect(session?.gameEndReason).toBe(GameEndReason.DEATH);
    expect(MetricsService.isSessionActive()).toBe(false);
    expect(Logger.info).toHaveBeenCalledWith(
      expect.stringContaining('Session ended'),
      expect.any(Object)
    );
  });
});
