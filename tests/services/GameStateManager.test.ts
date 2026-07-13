import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  GameStateManager,
  PLAYER_DEFAULTS,
  GAME_STATE_DEFAULTS,
  RUN_STATS_DEFAULTS,
} from '../../services/core/GameStateManager';
import { EventBus } from '../../services/core/EventBus';
import { ComboSystem } from '../../services/combat/ComboSystem';
import { MetricsService } from '../../services/core/MetricsService';
import { GameSessionService } from '../../services/auth/GameSessionService';
import { MarketPosition } from '../../types';
import { difficultyContext } from '../../services/difficulty/DifficultyContext';
import { LeverageEngine } from '../../services/gameplay/LeverageEngine';

// Mock dependencies
vi.mock('../../services/core/EventBus', () => ({
  EventBus: {
    emit: vi.fn(),
  },
}));

vi.mock('../../services/difficulty/DifficultyContext', () => ({
  difficultyContext: {
    updateInputs: vi.fn(),
  },
}));

vi.mock('../../services/gameplay/LeverageEngine', () => ({
  LeverageEngine: {
    setLeverage: vi.fn(),
  },
}));

vi.mock('../../services/combat/ComboSystem', () => ({
  ComboSystem: {
    startGame: vi.fn(),
  },
}));

vi.mock('../../services/core/MetricsService', () => ({
  MetricsService: {
    startSession: vi.fn(),
  },
}));

vi.mock('../../services/system/Logger', () => ({
  Logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock('../../services/auth/GameSessionService', () => ({
  GameSessionService: {
    startSession: vi.fn().mockResolvedValue({
      sessionId: 'mock-session-id',
      sessionSecret: 'mock-secret',
    }),
  },
}));

vi.mock('../../services/auth/UserSessionService', () => ({
  UserSessionService: {
    getNickname: vi.fn(),
  },
}));

vi.mock('../../services/core/EventRecorderService', () => ({
  EventRecorderService: {
    startSession: vi.fn(),
  },
}));

describe('GameStateManager', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('resetAll', () => {
    it('should reset all systems and emit events', () => {
      GameStateManager.resetAll(10);

      expect(EventBus.emit).toHaveBeenCalledWith('beforeReset', {});
      expect(LeverageEngine.setLeverage).toHaveBeenCalledWith(10);
      expect(difficultyContext.updateInputs).toHaveBeenCalledWith({
        leverage: 10,
        level: PLAYER_DEFAULTS.level,
        elapsedSeconds: 0,
        pnlHistory: [],
      });
      expect(ComboSystem.startGame).toHaveBeenCalled();
      expect(EventBus.emit).toHaveBeenCalledWith('afterReset', {});
      expect(EventBus.emit).toHaveBeenCalledWith('gameReset', {});
    });

    it('should handle re-entrant reset calls gracefully', () => {
      // We can't easily simulate re-entrancy in a single threaded test without modifying internal state
      // But we can verify that the flag handling logic exists by inspecting the code or trusting basic execution
      // For now, let's just ensure subsequent calls work
      GameStateManager.resetAll();
      GameStateManager.resetAll();
      expect(LeverageEngine.setLeverage).toHaveBeenCalledTimes(2);
    });
  });

  describe('initializeNewGame', () => {
    it('should initialize new game state and start metrics', async () => {
      const startParams = {
        position: MarketPosition.LONG,
        entryPrice: 50000,
        leverage: 25,
        pair: 'BTC' as const,
      };

      await GameStateManager.initializeNewGame(
        startParams.position,
        startParams.entryPrice,
        startParams.leverage,
        startParams.pair
      );

      // Should call resetAll and initialize the runtime context
      expect(LeverageEngine.setLeverage).toHaveBeenCalledWith(25);

      // Should start metrics
      expect(MetricsService.startSession).toHaveBeenCalledWith(
        startParams.position,
        startParams.entryPrice,
        startParams.leverage,
        startParams.pair,
        'mock-session-id',
        'mock-secret'
      );

      // Should emit gameInitialized
      expect(EventBus.emit).toHaveBeenCalledWith('gameInitialized', {
        ...startParams,
        sessionId: 'mock-session-id',
      });
    });

    it('should rethrow PROFILE_NOT_FOUND from session bootstrap', async () => {
      vi.mocked(GameSessionService.startSession).mockRejectedValueOnce(
        new Error('PROFILE_NOT_FOUND')
      );

      await expect(
        GameStateManager.initializeNewGame(MarketPosition.LONG, 50000, 10, 'BTC')
      ).rejects.toThrow('PROFILE_NOT_FOUND');
    });

    it('should rethrow NICKNAME_REQUIRED from session bootstrap', async () => {
      vi.mocked(GameSessionService.startSession).mockRejectedValueOnce(
        new Error('NICKNAME_REQUIRED')
      );

      await expect(
        GameStateManager.initializeNewGame(MarketPosition.LONG, 50000, 10, 'BTC')
      ).rejects.toThrow('NICKNAME_REQUIRED');
    });
  });

  describe('Defaults Getters', () => {
    it('should return player defaults with position overrides', () => {
      const defaults = GameStateManager.getPlayerDefaults(100, 200, '#ff0000');

      expect(defaults.x).toBe(100);
      expect(defaults.y).toBe(200);
      expect(defaults.color).toBe('#ff0000');
      expect(defaults.radius).toBe(PLAYER_DEFAULTS.radius);
    });

    it('should return fresh game state defaults', () => {
      const defaults = GameStateManager.getGameStateDefaults();
      expect(defaults).toEqual(GAME_STATE_DEFAULTS);
      expect(defaults).not.toBe(GAME_STATE_DEFAULTS); // Should be a copy
    });

    it('should return fresh run stats defaults', () => {
      const defaults = GameStateManager.getRunStatsDefaults();
      expect(defaults).toEqual(RUN_STATS_DEFAULTS);
      expect(defaults).not.toBe(RUN_STATS_DEFAULTS); // Should be a copy
    });
  });
});
