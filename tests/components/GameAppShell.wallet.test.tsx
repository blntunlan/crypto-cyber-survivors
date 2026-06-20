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
    resetPlayer: vi.fn(),
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
    cycleData: null,
    pauseMenuStats: { totalKills: 0, maxStreak: 0, totalBonusXp: 0 },
    frozenPnlRef: { current: 0 },
    handleLevelUp: vi.fn(),
    selectUpgrade: vi.fn(),
    handleGameOver: vi.fn(),
    handleCashOut: vi.fn(),
    handleContinue: vi.fn(),
    markRunStarted: vi.fn(),
    resetFlowState: vi.fn(),
  }),
}));

vi.mock('../../hooks/useCheatManager', () => ({ useCheatManager: vi.fn() }));
vi.mock('../../hooks/useDebugBridge', () => ({ useDebugBridge: vi.fn() }));
vi.mock('../../hooks/useBeforeUnload', () => ({ useBeforeUnload: vi.fn() }));
vi.mock('../../hooks/useMarketTimeout', () => ({ useMarketTimeout: vi.fn() }));

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
    forceState: vi.fn(),
  },
}));

vi.mock('../../services/core/GameStateManager', () => ({
  GameStateManager: {
    resetAll: vi.fn(),
    initializeNewGame: mocks.initializeNewGame,
  },
}));

vi.mock('../../services/gameplay/MetaProgressionService', () => ({
  MetaProgressionService: {
    getStartingLiquidationGraceMs: vi.fn((value: number) => value),
    applyBonuses: vi.fn(player => player),
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
  }: {
    walletBalance: number;
    startGame: (choice: MarketPosition, leverage: 10) => Promise<void>;
  }) => (
    <div>
      <div data-testid="wallet-balance">{walletBalance}</div>
      <button onClick={() => void startGame(MarketPosition.LONG, 10)}>
        Start Shell Game
      </button>
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
});
