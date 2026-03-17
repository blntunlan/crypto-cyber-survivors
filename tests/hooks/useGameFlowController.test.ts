import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useGameFlowController } from '../../hooks/useGameFlowController';
import {
  GameMode,
  GameStatus,
  MarketPosition,
  type MarketData,
  type Player,
  type LeverageOption,
} from '../../types';
import { type Card } from '../../services/cards/types';
import { EventBus } from '../../services/core/EventBus';
import { GameEndReason } from '../../types/metrics';
import { CardSystem } from '../../services/cards/CardSystem';
import { audio } from '../../services/audio';
import { GameStateMachine } from '../../services/core/GameStateMachine';
import { applyCardEffect } from '../../services/cards/CardApplicator';
import { ExperienceService } from '../../services/gameplay/ExperienceService';
import { MetricsService } from '../../services/core/MetricsService';
import { CoinService } from '../../services/gameplay/CoinService';
import { ComboSystem } from '../../services/combat/ComboSystem';

vi.mock('../../services/cards/CardApplicator', () => ({
  applyCardEffect: vi.fn(),
}));

vi.mock('../../services/cards/CardSystem', () => ({
  CardSystem: {
    generateChoices: vi.fn(),
  },
}));

vi.mock('../../services/audio', () => ({
  audio: {
    playLevelUp: vi.fn(),
  },
}));

vi.mock('../../services/core/GameStateMachine', () => ({
  GameStateMachine: {
    transition: vi.fn(),
  },
}));

vi.mock('../../services/gameplay/ExperienceService', () => ({
  ExperienceService: {
    getRequiredExp: vi.fn(),
  },
}));

vi.mock('../../services/core/MetricsService', () => ({
  MetricsService: {
    trackLevelUp: vi.fn(),
    endSession: vi.fn(),
  },
}));

vi.mock('../../services/gameplay/CoinService', () => ({
  CoinService: {
    calculateCycleReward: vi.fn(),
    creditCoins: vi.fn(),
  },
}));

vi.mock('../../services/auth/GameSessionService', () => ({
  GameSessionService: {
    submitSession: vi.fn(async () => ({ success: false })),
  },
}));

vi.mock('../../services/gameplay/DifficultyManager', () => ({
  DifficultyManager: {
    getTotalElapsedSeconds: vi.fn(() => 123),
  },
}));

vi.mock('../../services/analytics/PerformanceTracker', () => ({
  PerformanceTracker: {
    getInstance: vi.fn(() => ({
      stop: vi.fn(),
      getStats: vi.fn(() => ({
        avgFps: 60,
        minFps: 45,
        maxFps: 75,
        onePercentLow: 42,
        avgFrameTime: 16.6,
        maxFrameTime: 40,
        sampleCount: 100,
      })),
    })),
  },
}));

vi.mock('../../services/analytics/DeviceProfiler', () => ({
  DeviceProfiler: {
    getFingerprint: vi.fn(() => 'fp-1'),
    getProfile: vi.fn(() => ({ userAgent: 'vitest-agent' })),
  },
}));

vi.mock('../../services/combat/ComboSystem', () => ({
  ComboSystem: {
    getMaxStreak: vi.fn(() => 7),
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

const makeCard = (): Card => ({
  id: 'card-1',
  name: 'Sharp Edge',
  description: 'Test card',
  icon: 'x',
  tier: 'common',
});

const makePlayer = (overrides: Partial<Player> = {}): Player =>
  ({
    x: 10,
    y: 20,
    radius: 8,
    color: '#fff',
    level: 3,
    exp: 40,
    nextLevelExp: 100,
    hp: 90,
    maxHp: 100,
    invulnerabilityTimer: 0,
    baseDamage: 12,
    fireRate: 1.2,
    speed: 5,
    luck: 4,
    critChance: 0.2,
    critDamage: 2,
    hpRegen: 0,
    bulletSize: 1,
    bulletSpeed: 1,
    lifeSteal: 0,
    magnetRange: 1,
    armor: 0,
    dodgeChance: 0,
    thorns: 0,
    expMultiplier: 1,
    coinMultiplier: 1,
    dashCooldown: 1,
    dashDistance: 1,
    ...overrides,
  }) as unknown as Player;

const makeMarketData = (
  overrides: Partial<MarketData> = {},
  leverage: LeverageOption = 10
): MarketData => ({
  price: 50000,
  volume: 1000,
  pnl: 0.2,
  effectivePnl: 0.2,
  leverage,
  rsi: 50,
  difficulty: 1,
  momentum: 0.01,
  ...overrides,
});

describe('useGameFlowController', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    EventBus.clearEvent('cycleComplete');
    EventBus.clearEvent('levelUpComplete');

    vi.mocked(CardSystem.generateChoices).mockReturnValue([makeCard()]);
    vi.mocked(ExperienceService.getRequiredExp).mockReturnValue(150);
    vi.mocked(applyCardEffect).mockImplementation(player => ({ ...player }));
    vi.mocked(MetricsService.endSession).mockReturnValue(null);
    vi.mocked(CoinService.calculateCycleReward).mockReturnValue({
      base: 50,
      killBonus: 20,
      levelBonus: 10,
      marketBonus: 15,
      streakBonus: 5,
      portalBonus: 0,
      total: 100,
      breakdown: {},
    });
    vi.mocked(CoinService.creditCoins).mockResolvedValue(true);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('handleLevelUp heals player, transitions state, and sets upgrade choices', () => {
    const healFull = vi.fn();
    const playerRef = { current: makePlayer({ luck: 6, level: 4 }) };
    const setUiStats = vi.fn();

    const { result } = renderHook(() =>
      useGameFlowController({
        gameMode: GameMode.COMPETITIVE,
        gameStatus: GameStatus.PLAYING,
        leverage: 10,
        marketData: makeMarketData(),
        position: MarketPosition.LONG,
        entryPrice: 45000,
        selectedPair: 'BTC',
        runStatsTotalKills: 12,
        playerRef,
        setUiStats,
        healFull,
      })
    );

    act(() => {
      result.current.handleLevelUp();
    });

    expect(healFull).toHaveBeenCalledTimes(1);
    expect(GameStateMachine.transition).toHaveBeenCalledWith(GameStatus.LEVEL_UP);
    expect(CardSystem.generateChoices).toHaveBeenCalledWith(6, 4);
    expect(audio.playLevelUp).toHaveBeenCalledTimes(1);
    expect(result.current.upgradeChoices).toHaveLength(1);
  });

  it('selectUpgrade applies card, tracks level-up, emits event, and returns to PLAYING', () => {
    const emitSpy = vi.spyOn(EventBus, 'emit');
    const playerRef = { current: makePlayer({ level: 2, exp: 30, nextLevelExp: 100 }) };
    const setUiStats = vi.fn();

    vi.mocked(applyCardEffect).mockImplementation(player => ({
      ...player,
      exp: 30,
      nextLevelExp: 100,
    }));

    const { result } = renderHook(() =>
      useGameFlowController({
        gameMode: GameMode.COMPETITIVE,
        gameStatus: GameStatus.PLAYING,
        leverage: 10,
        marketData: makeMarketData(),
        position: MarketPosition.LONG,
        entryPrice: 45000,
        selectedPair: 'BTC',
        runStatsTotalKills: 12,
        playerRef,
        setUiStats,
        healFull: vi.fn(),
      })
    );

    act(() => {
      result.current.selectUpgrade(makeCard());
    });

    expect(MetricsService.trackLevelUp).toHaveBeenCalledWith(3, 'Sharp Edge', 'common');
    expect(setUiStats).toHaveBeenCalled();
    expect(emitSpy).toHaveBeenCalledWith('levelUpComplete', { newLevel: 3 });
    expect(GameStateMachine.transition).toHaveBeenCalledWith(GameStatus.PLAYING);
  });

  it('sets cycleData on cycleComplete in competitive mode and clears on handleContinue', async () => {
    const playerRef = { current: makePlayer({ level: 5 }) };

    const { result } = renderHook(() =>
      useGameFlowController({
        gameMode: GameMode.COMPETITIVE,
        gameStatus: GameStatus.PLAYING,
        leverage: 10,
        marketData: makeMarketData({ pnl: 0.35, effectivePnl: 0.4 }),
        position: MarketPosition.LONG,
        entryPrice: 45000,
        selectedPair: 'BTC',
        runStatsTotalKills: 22,
        playerRef,
        setUiStats: vi.fn(),
        healFull: vi.fn(),
      })
    );

    act(() => {
      EventBus.emit('cycleComplete', { cycleNumber: 2, totalElapsedSeconds: 300 });
    });

    await waitFor(() => {
      expect(result.current.cycleData).not.toBeNull();
    });

    expect(result.current.cycleData?.cycleNumber).toBe(2);
    expect(result.current.cycleData?.totalKills).toBe(22);
    expect(result.current.cycleData?.effectivePnl).toBe(0.4);
    expect(GameStateMachine.transition).toHaveBeenCalledWith(GameStatus.CYCLE_COMPLETE);

    act(() => {
      result.current.handleContinue();
    });

    expect(result.current.cycleData).toBeNull();
    expect(GameStateMachine.transition).toHaveBeenCalledWith(GameStatus.PLAYING);
  });

  it('respects liquidation grace after markRunStarted and triggers game over after grace', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-01T00:00:00.000Z'));

    const playerRef = { current: makePlayer() };
    const initialMarket = makeMarketData({ effectivePnl: -0.5, price: 50000 });

    const { result, rerender } = renderHook(
      ({ marketData }: { marketData: MarketData }) =>
        useGameFlowController({
          gameMode: GameMode.COMPETITIVE,
          gameStatus: GameStatus.PLAYING,
          leverage: 10,
          marketData,
          position: MarketPosition.LONG,
          entryPrice: 45000,
          selectedPair: 'BTC',
          runStatsTotalKills: 12,
          playerRef,
          setUiStats: vi.fn(),
          healFull: vi.fn(),
          startOfRunLiquidationGraceMs: 3000,
        }),
      { initialProps: { marketData: initialMarket } }
    );

    act(() => {
      result.current.markRunStarted();
    });

    act(() => {
      rerender({
        marketData: makeMarketData({ effectivePnl: -1.2, price: 50100 }),
      });
    });

    expect(GameStateMachine.transition).not.toHaveBeenCalledWith(GameStatus.GAMEOVER);

    act(() => {
      vi.advanceTimersByTime(4000);
      rerender({
        marketData: makeMarketData({ effectivePnl: -1.3, price: 50200 }),
      });
    });

    expect(GameStateMachine.transition).toHaveBeenCalledWith(GameStatus.GAMEOVER);
  });

  it('handleCashOut pays cycle rewards and then ends run', async () => {
    const playerRef = { current: makePlayer({ level: 4 }) };

    const { result } = renderHook(() =>
      useGameFlowController({
        gameMode: GameMode.COMPETITIVE,
        gameStatus: GameStatus.PLAYING,
        leverage: 10,
        marketData: makeMarketData({ pnl: 0.15, effectivePnl: 0.2 }),
        position: MarketPosition.LONG,
        entryPrice: 45000,
        selectedPair: 'BTC',
        runStatsTotalKills: 19,
        playerRef,
        setUiStats: vi.fn(),
        healFull: vi.fn(),
      })
    );

    act(() => {
      EventBus.emit('cycleComplete', { cycleNumber: 1, totalElapsedSeconds: 180 });
    });

    await waitFor(() => {
      expect(result.current.cycleData).not.toBeNull();
    });

    await act(async () => {
      await result.current.handleCashOut();
    });

    expect(CoinService.calculateCycleReward).toHaveBeenCalled();
    expect(ComboSystem.getMaxStreak).toHaveBeenCalled();
    expect(CoinService.creditCoins).toHaveBeenCalledWith(100, 'cycle_complete');
    expect(GameStateMachine.transition).toHaveBeenCalledWith(GameStatus.GAMEOVER);
  });

  it('resetFlowState clears frozen pnl, cycle data, and upgrade choices', async () => {
    const playerRef = { current: makePlayer({ level: 4 }) };

    const { result } = renderHook(() =>
      useGameFlowController({
        gameMode: GameMode.COMPETITIVE,
        gameStatus: GameStatus.PLAYING,
        leverage: 10,
        marketData: makeMarketData({ pnl: 0.42, effectivePnl: 0.5 }),
        position: MarketPosition.LONG,
        entryPrice: 45000,
        selectedPair: 'BTC',
        runStatsTotalKills: 10,
        playerRef,
        setUiStats: vi.fn(),
        healFull: vi.fn(),
      })
    );

    act(() => {
      result.current.handleLevelUp();
      EventBus.emit('cycleComplete', { cycleNumber: 1, totalElapsedSeconds: 100 });
    });

    await act(async () => {
      await result.current.handleGameOver(GameEndReason.DEATH);
    });

    expect(result.current.upgradeChoices.length).toBeGreaterThan(0);
    expect(result.current.cycleData).not.toBeNull();
    expect(result.current.frozenPnlRef.current).toBe(0.42);

    act(() => {
      result.current.resetFlowState();
    });

    expect(result.current.upgradeChoices).toEqual([]);
    expect(result.current.cycleData).toBeNull();
    expect(result.current.frozenPnlRef.current).toBe(0);
  });
});
