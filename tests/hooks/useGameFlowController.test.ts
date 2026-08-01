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
import { MetaProgressionService } from '../../services/progression/MetaProgressionService';
import { GameSessionService } from '../../services/auth/GameSessionService';
import { ChallengeService } from '../../services/challenges/ChallengeService';
import { type RewardPayload } from '../../types/reward';
import { TimeService } from '../../services/core/TimeService';

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
    canTransition: vi.fn(() => true),
    transition: vi.fn(() => true),
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
    creditVerifiedCoins: vi.fn(),
  },
}));

vi.mock('../../services/auth/GameSessionService', () => ({
  GameSessionService: {
    getCurrentSessionId: vi.fn(() => 'ending-session'),
    submitSession: vi.fn(async () => ({ success: false })),
    requestCashOutQuote: vi.fn(async () => {
      const issuedAtSeconds = Math.floor(Date.now() / 1_000);
      return {
        quote: {
          quoteId: 'quote-1',
          sessionId: 'session-1',
          canonicalSequence: 42,
          rewardPoints: 120,
          issuedAtSeconds,
          expiresAtSeconds: issuedAtSeconds + 15,
        },
        signature: 'a'.repeat(64),
        shouldForceRecovery: false,
        safeExitOnly: false,
        greedLevel: 0,
      };
    }),
    decideCashOut: vi.fn(async () => ({
      state: 'settled',
      rewardPoints: 120,
      greedDelta: 0,
      greedLevel: 0,
      canonicalSequence: 42,
    })),
    recordCashOutFailure: vi.fn(async () => ({
      state: 'failed',
      primaryRewardPoints: 0,
      shards: 0,
    })),
    clearSession: vi.fn(),
  },
}));

vi.mock('../../services/core/TimeService', () => ({
  TimeService: {
    getGameTimeSeconds: vi.fn(() => 123),
  },
}));

vi.mock('../../services/progression/MetaProgressionService', () => ({
  MetaProgressionService: {
    getCardChoiceCount: vi.fn(() => 3),
    applyVerifiedTransfer: vi.fn(),
  },
}));

vi.mock('../../services/challenges/ChallengeService', () => ({
  ChallengeService: {
    onRunEnd: vi.fn(),
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
    resetCombo: vi.fn(),
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

vi.mock('../../services/difficulty/DifficultyContext', () => ({
  difficultyContext: {
    reset: vi.fn(),
    resetForCycleContinue: vi.fn(),
    updateInputs: vi.fn(),
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
    vi.mocked(TimeService.getGameTimeSeconds).mockReturnValue(123);
    vi.mocked(GameStateMachine.canTransition).mockReturnValue(true);
    vi.mocked(GameStateMachine.transition).mockReturnValue(true);
    EventBus.clearEvent('cycleComplete');
    EventBus.clearEvent('levelUpComplete');
    EventBus.clearEvent('levelUp');

    vi.mocked(CardSystem.generateChoices).mockReturnValue([makeCard()]);
    vi.mocked(MetaProgressionService.getCardChoiceCount).mockReturnValue(3);
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
    vi.mocked(CoinService.creditVerifiedCoins).mockResolvedValue(true);
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
    expect(CardSystem.generateChoices).toHaveBeenCalledWith(6, 4, 3);
    expect(audio.playLevelUp).toHaveBeenCalledTimes(1);
    expect(result.current.upgradeChoices).toHaveLength(1);
  });

  it('handleLevelUp does not apply side effects when state transition is rejected', () => {
    const healFull = vi.fn();
    const playerRef = { current: makePlayer({ luck: 6, level: 4 }) };
    vi.mocked(GameStateMachine.transition).mockReturnValueOnce(false);

    const { result } = renderHook(() =>
      useGameFlowController({
        gameMode: GameMode.COMPETITIVE,
        gameStatus: GameStatus.PAUSED,
        leverage: 10,
        marketData: makeMarketData(),
        position: MarketPosition.LONG,
        entryPrice: 45000,
        selectedPair: 'BTC',
        runStatsTotalKills: 12,
        playerRef,
        setUiStats: vi.fn(),
        healFull,
      })
    );

    act(() => {
      result.current.handleLevelUp();
    });

    expect(healFull).not.toHaveBeenCalled();
    expect(CardSystem.generateChoices).not.toHaveBeenCalled();
    expect(audio.playLevelUp).not.toHaveBeenCalled();
    expect(result.current.upgradeChoices).toEqual([]);
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
    expect(emitSpy).toHaveBeenCalledWith('levelUp', { level: 3 });
    expect(GameStateMachine.transition).toHaveBeenCalledWith(GameStatus.PLAYING);
  });

  it('rejects a live offer without resetting run state or healing', async () => {
    const playerRef = { current: makePlayer({ level: 5 }) };
    const healFull = vi.fn();
    vi.mocked(GameSessionService.decideCashOut).mockResolvedValueOnce({
      state: 'active',
      rewardPoints: 0,
      greedDelta: 1,
      greedLevel: 1,
      canonicalSequence: 42,
    });

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
        healFull,
      })
    );

    act(() => {
      EventBus.emit('cycleComplete', { cycleNumber: 2, totalElapsedSeconds: 300 });
    });

    await waitFor(() => {
      expect(result.current.cashOutOffer).not.toBeNull();
    });

    expect(result.current.cashOutOffer?.cycle.cycleNumber).toBe(2);
    expect(result.current.cashOutOffer?.cycle.totalKills).toBe(22);
    expect(result.current.cashOutOffer?.cycle.effectivePnl).toBe(0.4);
    expect(GameStateMachine.transition).not.toHaveBeenCalledWith(
      GameStatus.CYCLE_COMPLETE
    );

    await act(async () => {
      await result.current.handleRejectCashOut();
    });

    expect(result.current.cashOutOffer).toBeNull();
    expect(healFull).not.toHaveBeenCalled();
    const { difficultyContext } =
      await import('../../services/difficulty/DifficultyContext');
    const { ComboSystem } = await import('../../services/combat/ComboSystem');
    expect(difficultyContext.resetForCycleContinue).not.toHaveBeenCalled();
    expect(ComboSystem.resetCombo).not.toHaveBeenCalled();
  });

  it('opens a signed cash-out offer without pausing gameplay', async () => {
    const playerRef = { current: makePlayer({ level: 5 }) };
    const emitSpy = vi.spyOn(EventBus, 'emit');

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
      expect(result.current.cashOutOffer).not.toBeNull();
    });
    expect(GameSessionService.requestCashOutQuote).toHaveBeenCalledWith();
    expect(result.current.cashOutOffer?.quote.rewardPoints).toBe(120);
    expect(emitSpy).toHaveBeenCalledWith('cashOutOfferOpened', { cycleNumber: 2 });
    expect(GameStateMachine.transition).not.toHaveBeenCalledWith(
      GameStatus.CYCLE_COMPLETE
    );
  });

  it('rejects the signed offer without reset, combo clear, or healing', async () => {
    const { difficultyContext } =
      await import('../../services/difficulty/DifficultyContext');
    const { ComboSystem } = await import('../../services/combat/ComboSystem');
    vi.mocked(GameSessionService.decideCashOut).mockResolvedValueOnce({
      state: 'active',
      rewardPoints: 0,
      greedDelta: 1,
      greedLevel: 1,
      canonicalSequence: 42,
    });
    const healFull = vi.fn();
    const playerRef = { current: makePlayer({ level: 5 }) };
    const { result } = renderHook(() =>
      useGameFlowController({
        gameMode: GameMode.COMPETITIVE,
        gameStatus: GameStatus.PLAYING,
        leverage: 10,
        marketData: makeMarketData(),
        position: MarketPosition.LONG,
        entryPrice: 45000,
        selectedPair: 'BTC',
        runStatsTotalKills: 22,
        playerRef,
        setUiStats: vi.fn(),
        healFull,
      })
    );

    act(() => {
      EventBus.emit('cycleComplete', { cycleNumber: 2, totalElapsedSeconds: 300 });
    });
    await waitFor(() => expect(result.current.cashOutOffer).not.toBeNull());
    const emitSpy = vi.spyOn(EventBus, 'emit');
    emitSpy.mockClear();

    await act(async () => {
      await result.current.handleRejectCashOut();
    });

    expect(GameSessionService.decideCashOut).toHaveBeenCalledWith(
      'quote-1',
      'a'.repeat(64),
      'reject',
      'reject:quote-1'
    );
    expect(result.current.cashOutOffer).toBeNull();
    expect(healFull).not.toHaveBeenCalled();
    expect(difficultyContext.resetForCycleContinue).not.toHaveBeenCalled();
    expect(ComboSystem.resetCombo).not.toHaveBeenCalled();
    expect(emitSpy).toHaveBeenCalledWith('cashOutDecisionCommitted', {
      sessionId: 'session-1',
      quoteId: 'quote-1',
      canonicalSequence: 42,
      decision: 'reject',
      greedLevel: 1,
    });
  });

  it('records timeout at the signed fifteen-second wall-clock expiry', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-01T00:00:00.000Z'));
    const issuedAtSeconds = Math.floor(Date.now() / 1_000);
    vi.mocked(GameSessionService.requestCashOutQuote).mockResolvedValueOnce({
      quote: {
        quoteId: 'quote-timeout',
        sessionId: 'session-1',
        canonicalSequence: 43,
        rewardPoints: 140,
        issuedAtSeconds,
        expiresAtSeconds: issuedAtSeconds + 15,
      },
      signature: 'b'.repeat(64),
      shouldForceRecovery: false,
      safeExitOnly: false,
      greedLevel: 0,
    });
    vi.mocked(GameSessionService.decideCashOut).mockResolvedValueOnce({
      state: 'active',
      rewardPoints: 0,
      greedDelta: 1,
      greedLevel: 1,
      canonicalSequence: 43,
    });
    const playerRef = { current: makePlayer({ level: 5 }) };
    const { result } = renderHook(() =>
      useGameFlowController({
        gameMode: GameMode.COMPETITIVE,
        gameStatus: GameStatus.PLAYING,
        leverage: 10,
        marketData: makeMarketData(),
        position: MarketPosition.LONG,
        entryPrice: 45000,
        selectedPair: 'BTC',
        runStatsTotalKills: 22,
        playerRef,
        setUiStats: vi.fn(),
        healFull: vi.fn(),
      })
    );

    await act(async () => {
      EventBus.emit('cycleComplete', { cycleNumber: 2, totalElapsedSeconds: 300 });
      await Promise.resolve();
    });
    expect(result.current.cashOutOffer?.quote.quoteId).toBe('quote-timeout');

    await act(async () => {
      vi.advanceTimersByTime(15_000);
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(GameSessionService.decideCashOut).toHaveBeenCalledWith(
      'quote-timeout',
      'b'.repeat(64),
      'timeout',
      'timeout:quote-timeout'
    );
    expect(result.current.cashOutOffer).toBeNull();
  });

  it('ignores cycleComplete events outside active gameplay', () => {
    const playerRef = { current: makePlayer({ level: 5 }) };

    const { result } = renderHook(() =>
      useGameFlowController({
        gameMode: GameMode.COMPETITIVE,
        gameStatus: GameStatus.MENU,
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
      EventBus.emit('cycleComplete', { cycleNumber: 1, totalElapsedSeconds: 300 });
    });

    expect(result.current.cashOutOffer).toBeNull();
    expect(GameStateMachine.transition).not.toHaveBeenCalledWith(
      GameStatus.CYCLE_COMPLETE
    );
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

    expect(GameStateMachine.transition).not.toHaveBeenCalledWith(GameStatus.GAMEOVER);

    vi.mocked(TimeService.getGameTimeSeconds).mockReturnValue(127);
    act(() => {
      rerender({
        marketData: makeMarketData({ effectivePnl: -1.4, price: 50300 }),
      });
    });

    expect(GameStateMachine.transition).toHaveBeenCalledWith(GameStatus.GAMEOVER);
  });

  it('handleCashOut accepts the server quote without legacy reward submission', async () => {
    const playerRef = { current: makePlayer({ level: 4 }) };
    vi.mocked(MetricsService.endSession).mockReturnValue({
      replayData: { events: [] },
      performance: { avgFps: 60 },
    } as any);

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
      expect(result.current.cashOutOffer).not.toBeNull();
    });

    await act(async () => {
      await result.current.handleCashOut();
    });

    expect(GameSessionService.requestCashOutQuote).toHaveBeenCalledWith();
    expect(GameSessionService.decideCashOut).toHaveBeenCalledWith(
      'quote-1',
      'a'.repeat(64),
      'accept',
      'accept:quote-1'
    );
    expect(GameSessionService.clearSession).toHaveBeenCalled();
    expect(CoinService.creditCoins).not.toHaveBeenCalled();
    expect(GameStateMachine.transition).toHaveBeenCalledWith(GameStatus.GAMEOVER);
    expect(GameSessionService.submitSession).not.toHaveBeenCalled();
    expect(result.current.gameOverReason).toBe(GameEndReason.CYCLE_COMPLETE);
    expect(result.current.rewardSettlement).toMatchObject({
      status: 'verified',
      amount: 120,
    });
    expect(result.current.rewardSettlement.message).toMatch(/credited/i);
  });

  it('settles a stale-market quote through the Safe Exit decision', async () => {
    const issuedAtSeconds = Math.floor(Date.now() / 1_000);
    vi.mocked(GameSessionService.requestCashOutQuote).mockResolvedValueOnce({
      quote: {
        quoteId: 'safe-exit-quote',
        sessionId: 'session-1',
        canonicalSequence: 42,
        rewardPoints: 120,
        issuedAtSeconds,
        expiresAtSeconds: issuedAtSeconds + 15,
      },
      signature: 'b'.repeat(64),
      shouldForceRecovery: false,
      safeExitOnly: true,
      greedLevel: 0,
    });
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
    await waitFor(() => expect(result.current.cashOutOffer).not.toBeNull());

    await act(async () => {
      await result.current.handleCashOut();
    });

    expect(GameSessionService.decideCashOut).toHaveBeenCalledWith(
      'safe-exit-quote',
      'b'.repeat(64),
      'safe_exit',
      'safe_exit:safe-exit-quote'
    );
  });

  it('keeps the run active and allows the same cycle to retry after quote failure', async () => {
    vi.mocked(GameSessionService.requestCashOutQuote).mockRejectedValueOnce(
      new Error('CASH_OUT_NOT_ELIGIBLE')
    );
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
    await waitFor(() =>
      expect(GameSessionService.requestCashOutQuote).toHaveBeenCalledTimes(1)
    );

    expect(result.current.cashOutOffer).toBeNull();
    expect(GameSessionService.clearSession).not.toHaveBeenCalled();
    expect(GameStateMachine.transition).not.toHaveBeenCalledWith(GameStatus.PLAYING);
    expect(GameStateMachine.transition).not.toHaveBeenCalledWith(GameStatus.GAMEOVER);

    act(() => {
      EventBus.emit('cycleComplete', { cycleNumber: 1, totalElapsedSeconds: 180 });
    });
    await waitFor(() => expect(result.current.cashOutOffer).not.toBeNull());
    expect(GameSessionService.requestCashOutQuote).toHaveBeenCalledTimes(2);
    expect(EventBus.emit).toHaveBeenCalledWith('cashOutOfferQuoteFailed', {
      cycleNumber: 1,
    });
  });

  it('ignores duplicate cycleComplete events with same cycleNumber', async () => {
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
      expect(result.current.cashOutOffer).not.toBeNull();
    });

    expect(result.current.cashOutOffer?.cycle.cycleNumber).toBe(2);
    expect(GameSessionService.requestCashOutQuote).toHaveBeenCalledTimes(1);

    // Emit duplicate cycleComplete with same cycleNumber
    act(() => {
      EventBus.emit('cycleComplete', { cycleNumber: 2, totalElapsedSeconds: 300 });
    });

    expect(GameSessionService.requestCashOutQuote).toHaveBeenCalledTimes(1);
  });

  it('handleGameOver resets the runtime difficulty context', async () => {
    const { difficultyContext } =
      await import('../../services/difficulty/DifficultyContext');
    const playerRef = { current: makePlayer() };

    const { result } = renderHook(() =>
      useGameFlowController({
        gameMode: GameMode.COMPETITIVE,
        gameStatus: GameStatus.PLAYING,
        leverage: 10,
        marketData: makeMarketData(),
        position: MarketPosition.LONG,
        entryPrice: 45000,
        selectedPair: 'BTC',
        runStatsTotalKills: 5,
        playerRef,
        setUiStats: vi.fn(),
        healFull: vi.fn(),
      })
    );

    const emitSpy = vi.spyOn(EventBus, 'emit');
    emitSpy.mockClear();
    await act(async () => {
      await result.current.handleGameOver(GameEndReason.DEATH);
    });

    expect(difficultyContext.reset).toHaveBeenCalled();
    expect(emitSpy).toHaveBeenCalledWith('gameOver', {
      finalLevel: 3,
      finalPnl: 0.2,
    });
  });

  it('handleGameOver does not submit session side effects when state transition is rejected', async () => {
    const { difficultyContext } =
      await import('../../services/difficulty/DifficultyContext');
    const playerRef = { current: makePlayer() };
    vi.mocked(GameStateMachine.transition)
      .mockReturnValueOnce(false)
      .mockReturnValueOnce(true);

    const { result } = renderHook(() =>
      useGameFlowController({
        gameMode: GameMode.COMPETITIVE,
        gameStatus: GameStatus.PAUSED,
        leverage: 10,
        marketData: makeMarketData(),
        position: MarketPosition.LONG,
        entryPrice: 45000,
        selectedPair: 'BTC',
        runStatsTotalKills: 5,
        playerRef,
        setUiStats: vi.fn(),
        healFull: vi.fn(),
      })
    );

    await act(async () => {
      await result.current.handleGameOver(GameEndReason.DEATH);
    });

    expect(difficultyContext.reset).not.toHaveBeenCalled();
    expect(MetricsService.endSession).not.toHaveBeenCalled();
    expect(GameSessionService.submitSession).not.toHaveBeenCalled();

    await act(async () => {
      await result.current.handleGameOver(GameEndReason.DEATH);
    });

    expect(difficultyContext.reset).toHaveBeenCalled();
    expect(MetricsService.endSession).not.toHaveBeenCalled();
    expect(GameSessionService.recordCashOutFailure).toHaveBeenCalledWith(
      'death',
      'failure:death:123'
    );
  });

  it('handleGameOver records each failure without requiring end-session metrics', async () => {
    const playerRef = { current: makePlayer() };
    vi.mocked(MetricsService.endSession).mockReturnValue(null);

    const { result } = renderHook(() =>
      useGameFlowController({
        gameMode: GameMode.COMPETITIVE,
        gameStatus: GameStatus.PLAYING,
        leverage: 10,
        marketData: makeMarketData(),
        position: MarketPosition.LONG,
        entryPrice: 45000,
        selectedPair: 'BTC',
        runStatsTotalKills: 5,
        playerRef,
        setUiStats: vi.fn(),
        healFull: vi.fn(),
      })
    );

    await act(async () => {
      await result.current.handleGameOver(GameEndReason.DEATH);
    });

    await act(async () => {
      await result.current.handleGameOver(GameEndReason.DEATH);
    });

    expect(MetricsService.endSession).not.toHaveBeenCalled();
    expect(GameSessionService.submitSession).not.toHaveBeenCalled();
    expect(ChallengeService.onRunEnd).toHaveBeenCalledTimes(2);
    expect(GameSessionService.recordCashOutFailure).toHaveBeenCalledTimes(2);
  });

  it('handleGameOver records death through the authoritative failure endpoint', async () => {
    const playerRef = { current: makePlayer({ level: 5 }) };
    vi.mocked(MetricsService.endSession).mockReturnValue({
      replayData: { events: [] },
      performance: { avgFps: 60 },
    } as any);

    const { result } = renderHook(() =>
      useGameFlowController({
        gameMode: GameMode.COMPETITIVE,
        gameStatus: GameStatus.PLAYING,
        leverage: 10,
        marketData: makeMarketData({ pnl: -0.2, price: 44000 }),
        position: MarketPosition.LONG,
        entryPrice: 45000,
        selectedPair: 'BTC',
        runStatsTotalKills: 9,
        playerRef,
        setUiStats: vi.fn(),
        healFull: vi.fn(),
      })
    );

    await act(async () => {
      await result.current.handleGameOver(GameEndReason.DEATH);
    });

    expect(GameSessionService.recordCashOutFailure).toHaveBeenCalledWith(
      'death',
      'failure:death:123'
    );
    expect(GameSessionService.submitSession).not.toHaveBeenCalled();
    expect(result.current.gameOverReason).toBe(GameEndReason.DEATH);
    expect(result.current.rewardSettlement).toMatchObject({
      status: 'rejected',
      amount: 0,
    });
    expect(result.current.rewardSettlement.message).toMatch(/HP elimination/i);
  });

  it('handleGameOver submits portal reward payload for server reconciliation', async () => {
    const playerRef = { current: makePlayer({ level: 6 }) };
    const rewardPayload: RewardPayload = {
      kills: 33,
      level: 6,
      survivalSeconds: 180,
      pnlPercent: 0.12,
      maxStreak: 18,
      exitType: 'portal',
      portalType: 'TAKE_PROFIT',
      rawCoins: 33,
      enemyDropCoins: 5,
      totalCoins: 180,
      breakdown: {
        base: 60,
        survival: 60,
        kill: 33,
        level: 0,
        market: 0,
        streak: 25,
        portal: 62,
      },
    };

    vi.mocked(MetricsService.endSession).mockReturnValue({
      replayData: { events: [] },
      performance: { avgFps: 60 },
    } as any);

    const { result } = renderHook(() =>
      useGameFlowController({
        gameMode: GameMode.COMPETITIVE,
        gameStatus: GameStatus.PLAYING,
        leverage: 10,
        marketData: makeMarketData({ pnl: 0.11, effectivePnl: 0.2 }),
        position: MarketPosition.LONG,
        entryPrice: 45000,
        selectedPair: 'BTC',
        runStatsTotalKills: 12,
        playerRef,
        setUiStats: vi.fn(),
        healFull: vi.fn(),
      })
    );

    await act(async () => {
      await result.current.handleGameOver(GameEndReason.PORTAL, rewardPayload);
    });

    expect(GameSessionService.submitSession).toHaveBeenCalledWith(
      expect.objectContaining({
        endReason: GameEndReason.PORTAL,
        exitType: 'portal',
        portalType: 'TAKE_PROFIT',
        kills: 33,
        level: 6,
        maxStreak: 18,
      }),
      rewardPayload
    );
  });

  it('does not credit verified coins when server response is not verified', async () => {
    const playerRef = { current: makePlayer({ level: 6 }) };
    vi.mocked(MetricsService.endSession).mockReturnValue({
      replayData: { events: [] },
      performance: { avgFps: 60 },
    } as any);
    vi.mocked(GameSessionService.submitSession).mockResolvedValueOnce({
      success: true,
      verified: false,
      reward: 999,
      metaShare: 0,
    });

    const { result } = renderHook(() =>
      useGameFlowController({
        gameMode: GameMode.COMPETITIVE,
        gameStatus: GameStatus.PLAYING,
        leverage: 10,
        marketData: makeMarketData({ pnl: 0.11, effectivePnl: 0.2 }),
        position: MarketPosition.LONG,
        entryPrice: 45000,
        selectedPair: 'BTC',
        runStatsTotalKills: 12,
        playerRef,
        setUiStats: vi.fn(),
        healFull: vi.fn(),
      })
    );

    await act(async () => {
      await result.current.handleGameOver(GameEndReason.DEATH);
    });

    expect(GameSessionService.recordCashOutFailure).toHaveBeenCalled();
    expect(GameSessionService.submitSession).not.toHaveBeenCalled();
    expect(CoinService.creditVerifiedCoins).not.toHaveBeenCalled();
  });

  it('handleCashOut resets the runtime difficulty context before ending run', async () => {
    const { difficultyContext } =
      await import('../../services/difficulty/DifficultyContext');
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
      expect(result.current.cashOutOffer).not.toBeNull();
    });

    const emitSpy = vi.spyOn(EventBus, 'emit');
    emitSpy.mockClear();
    await act(async () => {
      await result.current.handleCashOut();
    });

    expect(difficultyContext.reset).toHaveBeenCalled();
    expect(emitSpy).toHaveBeenCalledWith('cycleDecisionMade', {
      decision: 'CASH_OUT',
      cycleNumber: 1,
    });
  });

  it('resetFlowState clears frozen pnl, offer, upgrade choices, and difficulty', async () => {
    const { difficultyContext } =
      await import('../../services/difficulty/DifficultyContext');
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

    await waitFor(() => expect(result.current.cashOutOffer).not.toBeNull());

    await act(async () => {
      await result.current.handleGameOver(GameEndReason.DEATH);
    });

    expect(result.current.upgradeChoices.length).toBeGreaterThan(0);
    expect(result.current.cashOutOffer).not.toBeNull();
    expect(result.current.frozenPnlRef.current).toBe(0.42);

    act(() => {
      result.current.resetFlowState();
    });

    expect(result.current.upgradeChoices).toEqual([]);
    expect(result.current.cashOutOffer).toBeNull();
    expect(result.current.frozenPnlRef.current).toBe(0);
    expect(difficultyContext.reset).toHaveBeenCalled();
  });

  it('handleGameOver calls ChallengeService.onRunEnd synchronously before async submission (race condition guard)', async () => {
    const playerRef = { current: makePlayer({ level: 5 }) };
    vi.mocked(MetricsService.endSession).mockReturnValue({
      replayData: { events: [] },
      performance: { avgFps: 60 },
    } as any);

    // Make failure settlement hang forever so we can verify onRunEnd fires first
    let resolveFailure: (val: any) => void = () => {};
    vi.mocked(GameSessionService.recordCashOutFailure).mockImplementation(
      () =>
        new Promise(resolve => {
          resolveFailure = resolve;
        })
    );

    const { result } = renderHook(() =>
      useGameFlowController({
        gameMode: GameMode.COMPETITIVE,
        gameStatus: GameStatus.PLAYING,
        leverage: 10,
        marketData: makeMarketData(),
        position: MarketPosition.LONG,
        entryPrice: 45000,
        selectedPair: 'BTC',
        runStatsTotalKills: 5,
        playerRef,
        setUiStats: vi.fn(),
        healFull: vi.fn(),
      })
    );

    await act(async () => {
      await result.current.handleGameOver(GameEndReason.DEATH);
    });

    // onRunEnd must have been called even though failure settlement is pending
    expect(ChallengeService.onRunEnd).toHaveBeenCalledTimes(1);
    expect(GameSessionService.recordCashOutFailure).toHaveBeenCalledTimes(1);

    // Resolve the pending failure settlement
    resolveFailure({ state: 'failed', primaryRewardPoints: 0, shards: 50 });
    await waitFor(() => {
      // onRunEnd must NOT be called a second time after submission resolves
      expect(ChallengeService.onRunEnd).toHaveBeenCalledTimes(1);
      expect(GameSessionService.clearSession).toHaveBeenCalledWith('ending-session');
    });
  });
});
