import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { MarketPosition, GameStatus, type LeverageOption } from '../types';
import { type CryptoPair } from '../types/crypto';
import { GameMode } from '../types/gameMode';
import { CoinService } from '../services/gameplay/CoinService';
import { GameStateManager } from '../services/core/GameStateManager';
import { GameSessionService } from '../services/auth/GameSessionService';
import { MilestoneService } from '../services/gameplay/MilestoneService';
import { GameStateMachine } from '../services/core/GameStateMachine';
import { Logger } from '../services/system/Logger';
import { ExperienceService } from '../services/gameplay/ExperienceService';
import { TimeService } from '../services/core/TimeService';
import { WalletService } from '../services/gameplay/WalletService';
import { ComboSystem } from '../services/combat/ComboSystem';
import { CombatSystem } from '../services/combat/CombatSystem';
import { LeverageEngine } from '../services/gameplay/LeverageEngine';
import { RailwayCoinProvider } from '../services/gameplay/RailwayCoinProvider';
import { ErrorRecoveryService } from '../services/core/ErrorRecoveryService';
import { MarketEventManager } from '../services/market/MarketEventManager';
import { MetaProgressionService } from '../services/progression/MetaProgressionService';
import { ChallengeService } from '../services/challenges/ChallengeService';
import { ReplayRecorderService } from '../services/replay/ReplayRecorderService';
import { PerformanceTracker } from '../services/analytics/PerformanceTracker';
import { audio } from '../services/audio';
import { useMarketData } from '../hooks/useMarketData';
import { usePlayerState } from '../hooks/usePlayerState';
import { useRunStats } from '../hooks/useRunStats';
import { useCheatManager } from '../hooks/useCheatManager';
import { useDebugBridge } from '../hooks/useDebugBridge';
import { useBeforeUnload } from '../hooks/useBeforeUnload';
import { useMarketTimeout } from '../hooks/useMarketTimeout';
import { usePauseBudget } from '../hooks/usePauseBudget';
import { useGameFlowController } from '../hooks/useGameFlowController';
import { useGameStore } from '../stores/gameStore';
import { useMetaProgressionStore } from '../stores/metaProgressionStore';
import { type WindowDimensions } from '../hooks/useWindowDimensions';
import { type MarketRuntimeMode } from '../config/marketRuntime';
import { type HubScreen } from './hub';
import { GameScreenRouter } from './GameScreenRouter';
import { type useTutorial } from '../hooks/useTutorial';
import { useUser } from '../contexts/useUser';
import { EventBus } from '../services/core/EventBus';
import { GameEndReason } from '../types/metrics';

const START_OF_RUN_LIQUIDATION_GRACE_MS = 3_000;

type TutorialState = ReturnType<typeof useTutorial>;

interface GameAppShellProps {
  dimensions: WindowDimensions;
  gameStatus: GameStatus;
  handlePauseToggle: () => void;
  marketRuntimeMode: MarketRuntimeMode;
  hubScreen: HubScreen;
  setHubScreen: (screen: HubScreen) => void;
  showSettings: boolean;
  setShowSettings: (showSettings: boolean) => void;
  handleReturnToLanding: () => void;
  showDocs: boolean;
  showPrivacy: boolean;
  showTerms: boolean;
  tutorial: TutorialState;
  onOpenUpgrades: () => void;
  onOpenChallenges: () => void;
  onOpenReplays: () => void;
}

export const GameAppShell: React.FC<GameAppShellProps> = React.memo(
  ({
    dimensions,
    gameStatus,
    handlePauseToggle,
    marketRuntimeMode,
    hubScreen,
    setHubScreen,
    showSettings,
    setShowSettings,
    handleReturnToLanding,
    showDocs,
    showPrivacy,
    showTerms,
    tutorial,
    onOpenUpgrades,
    onOpenChallenges,
    onOpenReplays,
  }) => {
    const { runStats, resetRunStats } = useRunStats();
    const { isLoading: isIdentityLoading, nickname, logout } = useUser();
    const hasNickname = Boolean(nickname);
    const audioState = useGameStore(state => state.audio);
    const toggleMute = useGameStore(state => state.toggleMute);
    const graceExtensionLevel = useMetaProgressionStore(
      state => state.upgrades.GRACE_EXTENSION
    );

    const [gameMode, setGameMode] = useState<GameMode>(GameMode.COMPETITIVE);
    const [position, setPosition] = useState<MarketPosition>(MarketPosition.LONG);
    const [entryPrice, setEntryPrice] = useState<number>(0);
    const [leverage, setLeverage] = useState<LeverageOption>(10);
    const [selectedPair, setSelectedPair] = useState<CryptoPair>('BTC');
    const [walletBalance, setWalletBalance] = useState<number>(0);

    const handleAutoResume = useCallback(() => {
      setShowSettings(false);
      GameStateMachine.transition(GameStatus.PLAYING);
    }, [setShowSettings]);
    const pauseBudget = usePauseBudget(gameMode, gameStatus, handleAutoResume);

    const tabHiddenSinceRef = useRef<number | null>(null);

    useEffect(() => {
      const isCompetitive = gameMode === GameMode.COMPETITIVE;

      const autoPauseIfPlaying = (reason: string) => {
        if (gameStatus !== GameStatus.PLAYING) return;
        if (isCompetitive) {
          tabHiddenSinceRef.current = Date.now();
          Logger.info(
            `[App] Competitive mode: ${reason}, auto-pausing to use pause budget`
          );
        }
        GameStateMachine.transition(GameStatus.PAUSED);
      };

      const handleVisibilityChange = () => {
        if (document.hidden) {
          if (gameStatus === GameStatus.PLAYING) {
            autoPauseIfPlaying('Tab hidden');
          } else if (gameStatus === GameStatus.LEVEL_UP && isCompetitive) {
            Logger.info('[App] Competitive mode: Tab hidden during level-up');
          }
        } else {
          tabHiddenSinceRef.current = null;
        }
      };

      // iOS Safari restores frozen tabs from the Back/Forward cache via
      // `pagehide`(persisted), which may NOT be accompanied by
      // `visibilitychange`. Auto-pause here too so backgrounding still
      // engages the pause budget (anti-abuse) on iOS app-switch.
      const handlePageHide = (event: PageTransitionEvent) => {
        if (event.persisted) autoPauseIfPlaying('Tab hidden (BF-cache)');
      };
      const handleFreeze = () => autoPauseIfPlaying('Tab hidden (frozen)');

      document.addEventListener('visibilitychange', handleVisibilityChange);
      window.addEventListener('pagehide', handlePageHide);
      document.addEventListener('freeze', handleFreeze);
      return () => {
        document.removeEventListener('visibilitychange', handleVisibilityChange);
        window.removeEventListener('pagehide', handlePageHide);
        document.removeEventListener('freeze', handleFreeze);
      };
    }, [gameStatus, gameMode]);

    useEffect(() => {
      CoinService.setProvider(new RailwayCoinProvider());
      void ErrorRecoveryService;
      void MarketEventManager;
    }, []);

    const refreshWalletBalance = useCallback(() => {
      void WalletService.getInstance()
        .getBalance()
        .then(balance => setWalletBalance(balance));
    }, []);

    useEffect(() => {
      if (gameStatus === GameStatus.MENU && hasNickname) {
        refreshWalletBalance();
      } else if (!hasNickname) {
        setWalletBalance(0);
      }
    }, [gameStatus, hasNickname, refreshWalletBalance]);

    useEffect(() => {
      if (!hasNickname) return;

      const unsubscribe = EventBus.on('verification:success', () => {
        refreshWalletBalance();
      });

      return () => unsubscribe();
    }, [hasNickname, refreshWalletBalance]);

    const { playerRef, uiStats, setUiStats, resetPlayer, healFull, setPositionColor } =
      usePlayerState(dimensions.width, dimensions.height);

    const { marketData } = useMarketData(
      gameStatus,
      position,
      entryPrice,
      leverage,
      playerRef,
      selectedPair,
      marketRuntimeMode
    );

    const startOfRunLiquidationGraceMs =
      graceExtensionLevel > 0
        ? MetaProgressionService.getStartingLiquidationGraceMs(
            START_OF_RUN_LIQUIDATION_GRACE_MS
          )
        : START_OF_RUN_LIQUIDATION_GRACE_MS;

    const {
      upgradeChoices,
      cashOutOffer,
      pauseMenuStats,
      frozenPnlRef,
      handleLevelUp,
      selectUpgrade,
      handleGameOver,
      handleCashOut,
      handleRejectCashOut,
      markRunStarted,
      resetFlowState,
    } = useGameFlowController({
      gameMode,
      gameStatus,
      leverage,
      marketData,
      position,
      entryPrice,
      selectedPair,
      runStatsTotalKills: runStats.totalKills,
      playerRef,
      setUiStats,
      healFull,
      startOfRunLiquidationGraceMs,
    });

    const handleFatalDisconnect = useCallback(() => {
      void handleGameOver(GameEndReason.DISCONNECT);
    }, [handleGameOver]);

    const handleDebugGameOver = useCallback(() => {
      void handleGameOver();
    }, [handleGameOver]);

    useMarketTimeout({
      playerRef,
      onFatalDisconnect: handleFatalDisconnect,
    });

    const resetGame = useCallback(() => {
      GameStateManager.resetAll();
      setEntryPrice(0);
      resetRunStats();
      resetPlayer();
      resetFlowState();
      refreshWalletBalance();
    }, [resetPlayer, resetRunStats, resetFlowState, refreshWalletBalance]);

    const startGame = useCallback(
      async (choice: MarketPosition, selectedLeverage: LeverageOption) => {
        if (gameStatus !== GameStatus.MENU) {
          Logger.error('[App] startGame aborted: game is not in MENU state.');
          return;
        }

        if (!hasNickname) {
          EventBus.emit('gameNotification', {
            title: 'Nickname Required',
            message: 'Please set your nickname before starting a run.',
            type: 'info',
          });
          setHubScreen('hub');
          return;
        }

        if (marketData.price === 0) {
          EventBus.emit('gameNotification', {
            title: 'Market Loading',
            message: 'Live market price is still connecting. Please wait a moment.',
            type: 'info',
          });
          return;
        }

        const challengeConstraintError = ChallengeService.validateConstraints(
          choice,
          selectedLeverage
        );
        if (challengeConstraintError) {
          EventBus.emit('gameNotification', {
            title: 'Challenge Requirement',
            message: challengeConstraintError,
            type: 'warning',
          });
          return;
        }

        setLeverage(selectedLeverage);
        CoinService.resetSession();
        ComboSystem.startGame();
        CombatSystem.resetDebugCounter();

        let success: boolean;
        try {
          success = await GameStateManager.initializeNewGame(
            choice,
            marketData.price,
            selectedLeverage,
            selectedPair
          );
        } catch (error) {
          if (
            error instanceof Error &&
            (error.message === 'PROFILE_NOT_FOUND' ||
              error.message === 'NICKNAME_REQUIRED')
          ) {
            EventBus.emit('gameNotification', {
              title: 'Identity Required',
              message: 'Please set your nickname to continue.',
              type: 'info',
            });
            logout();
            setHubScreen('hub');
            return;
          }
          success = false;
        }

        if (!success) {
          EventBus.emit('gameNotification', {
            title: 'Connection Error',
            message: 'Failed to start game session.',
            type: 'info',
          });
          return;
        }

        const boosted = MetaProgressionService.applyBonuses(playerRef.current);
        Object.assign(playerRef.current, boosted);

        setPosition(choice);
        setEntryPrice(marketData.price);
        setPositionColor(choice);
        markRunStarted();

        const leverageMultipliers = LeverageEngine.getMultipliers();
        const scaledMaxHp = Math.max(
          10,
          Math.floor(playerRef.current.maxHp * leverageMultipliers.maxHpScale)
        );
        playerRef.current.maxHp = scaledMaxHp;
        playerRef.current.hp = scaledMaxHp;

        playerRef.current.nextLevelExp = ExperienceService.getRequiredExp(
          playerRef.current.level,
          selectedLeverage
        );
        setUiStats({ ...playerRef.current });

        TimeService.setMaxDeltaTime(gameMode === GameMode.COMPETITIVE ? 10000 : 50);

        if (!GameStateMachine.transition(GameStatus.PLAYING)) {
          Logger.warn('[GameAppShell] Game start transition rejected');
          return;
        }

        MilestoneService.startSession();
        audio.playLevelUp();
        void ChallengeService.startTracking();
        ReplayRecorderService.startRecording(
          GameSessionService.getCurrentSessionId() ?? `replay-${Date.now()}`,
          selectedLeverage,
          choice,
          selectedPair
        );

        PerformanceTracker.getInstance().start();
      },
      [
        marketData.price,
        gameStatus,
        hasNickname,
        logout,
        setHubScreen,
        selectedPair,
        playerRef,
        gameMode,
        setPositionColor,
        markRunStarted,
        setUiStats,
      ]
    );

    const cheatHandlers = useMemo(
      () => ({
        onLevelUp: handleLevelUp,
        onHeal: healFull,
        onSetLuck: (luck: number) => {
          playerRef.current.luck = luck;
          setUiStats({ ...playerRef.current });
        },
        onAddExp: (amount: number) => {
          playerRef.current.exp += amount;
          setUiStats({ ...playerRef.current });
          if (playerRef.current.exp >= playerRef.current.nextLevelExp) {
            handleLevelUp();
          }
        },
        onRestart: resetGame,
      }),
      [handleLevelUp, healFull, playerRef, resetGame, setUiStats]
    );

    useCheatManager(gameStatus, cheatHandlers, import.meta.env.DEV);

    useDebugBridge({
      onLevelUp: handleLevelUp,
      onGameOver: handleDebugGameOver,
    });

    useBeforeUnload(gameStatus);

    const handleNicknameComplete = useCallback(() => undefined, []);

    const shouldShowNicknameEntry =
      !isIdentityLoading &&
      !hasNickname &&
      !showDocs &&
      !showPrivacy &&
      !showTerms &&
      gameStatus === GameStatus.MENU;

    return (
      <GameScreenRouter
        gameStatus={gameStatus}
        gameMode={gameMode}
        position={position}
        entryPrice={entryPrice}
        selectedPair={selectedPair}
        marketData={marketData}
        playerRef={playerRef}
        uiStats={uiStats}
        setUiStats={setUiStats}
        dimensions={dimensions}
        handleGameOver={(reason, rewardPayload) =>
          void handleGameOver(reason, rewardPayload)
        }
        handleLevelUp={handleLevelUp}
        handlePauseToggle={handlePauseToggle}
        handleCashOut={handleCashOut}
        handleRejectCashOut={handleRejectCashOut}
        selectUpgrade={selectUpgrade}
        resetGame={resetGame}
        startGame={startGame}
        upgradeChoices={upgradeChoices}
        cashOutOffer={cashOutOffer}
        pauseMenuStats={pauseMenuStats}
        frozenPnlRef={frozenPnlRef}
        pauseBudget={pauseBudget}
        audioState={audioState}
        toggleMute={toggleMute}
        walletBalance={walletBalance}
        hubScreen={hubScreen}
        setHubScreen={setHubScreen}
        showSettings={showSettings}
        setShowSettings={setShowSettings}
        handleReturnToLanding={handleReturnToLanding}
        setSelectedPair={setSelectedPair}
        setGameMode={setGameMode}
        shouldShowNicknameEntry={shouldShowNicknameEntry}
        onNicknameComplete={handleNicknameComplete}
        tutorial={tutorial}
        onOpenUpgrades={onOpenUpgrades}
        onOpenChallenges={onOpenChallenges}
        onOpenReplays={onOpenReplays}
      />
    );
  }
);

GameAppShell.displayName = 'GameAppShell';
