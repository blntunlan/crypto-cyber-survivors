import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { GameAppShell } from '../../components/GameAppShell';
import { TUTORIAL_STEPS } from '../../config/TutorialConfig';
import { EventBus } from '../../services/core/EventBus';
import { GameStatus, MarketPosition } from '../../types';

const mocks = vi.hoisted(() => ({
  walletGetBalance: vi.fn(),
  initializeNewGame: vi.fn(),
  challengeStartTracking: vi.fn(),
  validateChallengeConstraints: vi.fn(),
  applyBonuses: vi.fn((player: unknown) => player),
  forceState: vi.fn(),
  resetAll: vi.fn(),
  resetPlayer: vi.fn(),
  handleGameOver: vi.fn(),
  handleRejectCashOut: vi.fn(),
  useDebugBridge: vi.fn(),
  useMarketTimeout: vi.fn(),
}));

vi.mock('../../contexts/useUser', () => ({
  useUser: () => ({
    isLoading: false,
    nickname: 'WalletTester',
    logout: vi.fn(),
  }),
}));

vi.mock('../../stores/gameStore', () => ({
  useGameStore: (selector: (state: unknown) => unknown) =>
    selector({
      audio: { muted: false, volume: 0.5 },
      toggleMute: vi.fn(),
    }),
}));

vi.mock('../../stores/metaProgressionStore', () => ({
  useMetaProgressionStore: (selector: (state: unknown) => unknown) =>
    selector({ upgrades: { GRACE_EXTENSION: 0 } }),
}));

vi.mock('../../hooks/useRunStats', () => ({
  useRunStats: () => ({
    runStats: { totalKills: 0 },
    resetRunStats: vi.fn(),
  }),
}));

vi.mock('../../hooks/usePauseBudget', () => ({
  usePauseBudget: () => ({ remainingMs: 60_000, maxMs: 60_000 }),
}));

vi.mock('../../hooks/usePlayerState', () => ({
  usePlayerState: () => ({
    playerRef: {
      current: {
        level: 1,
        exp: 0,
        nextLevelExp: 100,
        hp: 100,
        maxHp: 100,
        baseDamage: 10,
        fireRate: 1,
        speed: 1,
        luck: 1,
        critChance: 0,
      },
    },
    uiStats: { level: 1, hp: 100 },
    setUiStats: vi.fn(),
    resetPlayer: mocks.resetPlayer,
    healFull: vi.fn(),
    setPositionColor: vi.fn(),
  }),
}));

vi.mock('../../hooks/useMarketData', () => ({
  useMarketData: () => ({
    marketData: {
      price: 50_000,
      volume: 1,
      pnl: 0,
      effectivePnl: 0,
      leverage: 10,
      rsi: 50,
      difficulty: 1,
      momentum: 0,
      atrPercent: 0,
      spawnRateMultiplier: 1,
      enemyDamage: 1,
      enemySpeed: 1,
      gemValueMultiplier: 1,
    },
  }),
}));

vi.mock('../../hooks/useGameFlowController', () => ({
  useGameFlowController: () => ({
    upgradeChoices: [],
    cashOutOffer: {
      cycle: {
        cycleNumber: 1,
        survivalTimeSeconds: 300,
        totalKills: 10,
        level: 3,
        pnl: 0.1,
        effectivePnl: 0.1,
      },
      quote: {
        quoteId: 'quote-shell',
        sessionId: 'session-shell',
        canonicalSequence: 42,
        rewardPoints: 120,
        issuedAtSeconds: 1_000,
        expiresAtSeconds: 1_015,
      },
      signature: 'a'.repeat(64),
      safeExitOnly: false,
      greedLevel: 1,
    },
    pauseMenuStats: { totalKills: 0, maxStreak: 0, totalBonusXp: 0 },
    frozenPnlRef: { current: 0 },
    handleLevelUp: vi.fn(),
    selectUpgrade: vi.fn(),
    handleGameOver: mocks.handleGameOver,
    handleCashOut: vi.fn(),
    handleRejectCashOut: mocks.handleRejectCashOut,
    markRunStarted: vi.fn(),
    resetFlowState: vi.fn(),
  }),
}));

vi.mock('../../hooks/useCheatManager', () => ({ useCheatManager: vi.fn() }));
vi.mock('../../hooks/useDebugBridge', () => ({
  useDebugBridge: mocks.useDebugBridge,
}));
vi.mock('../../hooks/useBeforeUnload', () => ({ useBeforeUnload: vi.fn() }));
vi.mock('../../hooks/useMarketTimeout', () => ({
  useMarketTimeout: mocks.useMarketTimeout,
}));

vi.mock('../../services/gameplay/WalletService', () => ({
  WalletService: {
    getInstance: () => ({
      getBalance: mocks.walletGetBalance,
    }),
  },
}));

vi.mock('../../services/gameplay/CoinService', () => ({
  CoinService: {
    setProvider: vi.fn(),
    resetSession: vi.fn(),
  },
}));

vi.mock('../../services/core/ErrorRecoveryService', () => ({
  ErrorRecoveryService: {},
}));

vi.mock('../../services/market/MarketEventManager', () => ({
  MarketEventManager: {},
}));

vi.mock('../../services/gameplay/RailwayCoinProvider', () => ({
  RailwayCoinProvider: class RailwayCoinProvider {},
}));

vi.mock('../../services/core/GameStateMachine', () => ({
  GameStateMachine: {
    transition: vi.fn(() => true),
    forceState: mocks.forceState,
  },
}));

vi.mock('../../services/core/GameStateManager', () => ({
  GameStateManager: {
    resetAll: mocks.resetAll,
    initializeNewGame: mocks.initializeNewGame,
  },
}));

vi.mock('../../services/progression/MetaProgressionService', () => ({
  MetaProgressionService: {
    getStartingLiquidationGraceMs: vi.fn((value: number) => value),
    applyBonuses: mocks.applyBonuses,
  },
}));

vi.mock('../../services/gameplay/ComboSystem', () => ({
  ComboSystem: {
    startGame: vi.fn(),
  },
}));

vi.mock('../../services/combat/CombatSystem', () => ({
  CombatSystem: {
    resetDebugCounter: vi.fn(),
  },
}));

vi.mock('../../services/gameplay/LeverageEngine', () => ({
  LeverageEngine: {
    getMultipliers: () => ({ maxHpScale: 1 }),
  },
}));

vi.mock('../../services/gameplay/ExperienceService', () => ({
  ExperienceService: {
    getRequiredExp: () => 100,
  },
}));

vi.mock('../../services/core/TimeService', () => ({
  TimeService: {
    setMaxDeltaTime: vi.fn(),
  },
}));

vi.mock('../../services/gameplay/MilestoneService', () => ({
  MilestoneService: {
    startSession: vi.fn(),
  },
}));

vi.mock('../../services/challenges/ChallengeService', () => ({
  ChallengeService: {
    startTracking: mocks.challengeStartTracking,
    validateConstraints: mocks.validateChallengeConstraints,
  },
}));

vi.mock('../../services/replay/ReplayRecorderService', () => ({
  ReplayRecorderService: {
    startRecording: vi.fn(),
  },
}));

vi.mock('../../services/auth/GameSessionService', () => ({
  GameSessionService: {
    getCurrentSessionId: vi.fn(() => 'session-wallet-refresh'),
  },
}));

vi.mock('../../services/analytics/PerformanceTracker', () => ({
  PerformanceTracker: {
    getInstance: () => ({
      start: vi.fn(),
    }),
  },
}));

vi.mock('../../services/audio', () => ({
  audio: {
    playLevelUp: vi.fn(),
  },
}));

vi.mock('../../services/system/Logger', () => ({
  Logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

vi.mock('../../components/GameScreenRouter', () => ({
  GameScreenRouter: ({
    walletBalance,
    startGame,
    resetGame,
    cashOutOffer,
    handleRejectCashOut,
  }: {
    walletBalance: number;
    startGame: (choice: MarketPosition, leverage: 10) => Promise<void>;
    resetGame: () => void;
    cashOutOffer: { quote: { quoteId: string } } | null;
    handleRejectCashOut: () => Promise<void>;
  }) => (
    <div>
      <div data-testid="wallet-balance">{walletBalance}</div>
      <button onClick={() => void startGame(MarketPosition.LONG, 10)}>
        Start Shell Game
      </button>
      <button onClick={resetGame}>Reset Shell Game</button>
      <div data-testid="cash-out-offer">
        {cashOutOffer?.quote.quoteId ?? 'no-offer'}
      </div>
      <button onClick={() => void handleRejectCashOut()}>Reject Offer</button>
    </div>
  ),
}));

const renderShell = () =>
  render(
    <GameAppShell
      dimensions={{
        width: 1280,
        height: 720,
        hudInsets: { top: 0, bottom: 0, left: 0, right: 0 },
      }}
      gameStatus={GameStatus.MENU}
      handlePauseToggle={vi.fn()}
      marketRuntimeMode="runtime"
      hubScreen="hub"
      setHubScreen={vi.fn()}
      showSettings={false}
      setShowSettings={vi.fn()}
      handleReturnToLanding={vi.fn()}
      showDocs={false}
      showPrivacy={false}
      showTerms={false}
      tutorial={{
        showTutorial: false,
        currentStep: TUTORIAL_STEPS[0]!,
        currentStepIndex: 0,
        totalSteps: TUTORIAL_STEPS.length,
        progress: 0,
        isFirstStep: true,
        isLastStep: false,
        completeTutorial: vi.fn(),
        skipTutorial: vi.fn(),
        startTutorial: vi.fn(),
        nextStep: vi.fn(),
        prevStep: vi.fn(),
        resetTutorial: vi.fn(),
        hasCompleted: true,
        hasSkipped: false,
      }}
      onOpenUpgrades={vi.fn()}
      onOpenChallenges={vi.fn()}
      onOpenReplays={vi.fn()}
    />
  );

describe('GameAppShell wallet refresh', () => {
  beforeEach(() => {
    mocks.walletGetBalance.mockReset();
    mocks.initializeNewGame.mockReset();
    mocks.initializeNewGame.mockResolvedValue(true);
    mocks.challengeStartTracking.mockReset();
    mocks.challengeStartTracking.mockResolvedValue(undefined);
    mocks.validateChallengeConstraints.mockReset();
    mocks.validateChallengeConstraints.mockReturnValue(null);
    mocks.applyBonuses.mockClear();
    mocks.forceState.mockClear();
    mocks.resetAll.mockClear();
    mocks.resetPlayer.mockClear();
    mocks.handleGameOver.mockClear();
    mocks.handleRejectCashOut.mockClear();
    mocks.useDebugBridge.mockClear();
    mocks.useMarketTimeout.mockClear();
    EventBus.clearEvent('verification:success');
  });

  afterEach(() => {
    EventBus.clearEvent('verification:success');
  });

  it('refreshes wallet balance when a verified reward succeeds', async () => {
    mocks.walletGetBalance.mockResolvedValueOnce(10).mockResolvedValueOnce(175);

    renderShell();

    await screen.findByText('10');

    EventBus.emit('verification:success', {
      sessionId: 'session-wallet-refresh',
      verifiedAmount: 165,
      serverVerified: true,
    });

    await waitFor(() => {
      expect(screen.getByTestId('wallet-balance')).toHaveTextContent('175');
    });
    expect(mocks.walletGetBalance).toHaveBeenCalledTimes(2);
  });

  it('threads the live offer and reject action into the screen router', async () => {
    mocks.walletGetBalance.mockResolvedValue(10);

    renderShell();

    expect(await screen.findByTestId('cash-out-offer')).toHaveTextContent(
      'quote-shell'
    );
    fireEvent.click(screen.getByText('Reject Offer'));
    expect(mocks.handleRejectCashOut).toHaveBeenCalledTimes(1);
  });

  it('keeps market timeout and debug game-over callbacks stable across renders', async () => {
    mocks.walletGetBalance.mockResolvedValueOnce(10).mockResolvedValueOnce(20);

    renderShell();
    await screen.findByText('10');

    const firstTimeoutCallback =
      mocks.useMarketTimeout.mock.calls.at(-1)?.[0].onFatalDisconnect;
    const firstDebugCallback = mocks.useDebugBridge.mock.calls.at(-1)?.[0].onGameOver;

    EventBus.emit('verification:success', {
      sessionId: 'session-callback-stability',
      verifiedAmount: 10,
      serverVerified: true,
    });
    await screen.findByText('20');

    expect(mocks.useMarketTimeout.mock.calls.at(-1)?.[0].onFatalDisconnect).toBe(
      firstTimeoutCallback
    );
    expect(mocks.useDebugBridge.mock.calls.at(-1)?.[0].onGameOver).toBe(
      firstDebugCallback
    );
  });

  it('blocks game start when active challenge constraints fail', async () => {
    mocks.walletGetBalance.mockResolvedValue(10);
    mocks.validateChallengeConstraints.mockReturnValue(
      'This challenge requires SHORT position'
    );
    const emitSpy = vi.spyOn(EventBus, 'emit');

    renderShell();

    fireEvent.click(await screen.findByText('Start Shell Game'));

    await waitFor(() => {
      expect(mocks.validateChallengeConstraints).toHaveBeenCalledWith(
        MarketPosition.LONG,
        10
      );
    });
    expect(mocks.initializeNewGame).not.toHaveBeenCalled();
    expect(mocks.challengeStartTracking).not.toHaveBeenCalled();
    expect(emitSpy).toHaveBeenCalledWith('gameNotification', {
      title: 'Challenge Requirement',
      message: 'This challenge requires SHORT position',
      type: 'warning',
    });
  });

  it('applies meta progression bonuses after the canonical new-game reset', async () => {
    mocks.walletGetBalance.mockResolvedValue(10);

    renderShell();
    fireEvent.click(await screen.findByText('Start Shell Game'));

    await waitFor(() => {
      expect(mocks.initializeNewGame).toHaveBeenCalledTimes(1);
      expect(mocks.applyBonuses).toHaveBeenCalledTimes(1);
    });

    expect(mocks.initializeNewGame.mock.invocationCallOrder[0]).toBeLessThan(
      mocks.applyBonuses.mock.invocationCallOrder[0]!
    );
  });

  it('returns to menu through resetAll without forcing a duplicate state change', async () => {
    mocks.walletGetBalance.mockResolvedValue(10);

    renderShell();
    fireEvent.click(await screen.findByText('Reset Shell Game'));

    expect(mocks.resetAll).toHaveBeenCalledTimes(1);
    expect(mocks.forceState).not.toHaveBeenCalled();
  });
});
