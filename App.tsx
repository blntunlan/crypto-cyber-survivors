/**
 * App.tsx - Main Application Component
 *
 * Refactored to use custom hooks for better separation of concerns.
 * Hooks used:
 * - useWindowDimensions: Window resize handling
 * - useGameStatus: Game state machine subscription
 * - useRunStats: Run statistics tracking
 * - useSessionTiming: Session timing management
 * - useCheatManager: Cheat system integration
 * - useAppInitialization: App startup logic
 * - useBeforeUnload: Tab close warning
 * - useDevShortcuts: Developer keyboard shortcuts
 * - useMarketTimeout: Market data timeout handling
 */

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { MarketPosition, GameStatus, type LeverageOption } from './types';
import { type CryptoPair } from './types/crypto';
import { type Card } from './services/cards/types';
import { applyCardEffect } from './services/cards/CardApplicator';
import { CardSystem } from './services/cards/CardSystem';
import { audio } from './services/audio';
import { EventBus } from './services/core/EventBus';
import { GameEndReason } from './types/metrics';
import { MetricsService } from './services/core/MetricsService';
import { GameMode, type CycleCompleteData } from './types/gameMode';
import { CoinService } from './services/gameplay/CoinService';
import { GameStateManager } from './services/core/GameStateManager';
import { GameSessionService } from './services/auth/GameSessionService';
import { MilestoneService } from './services/gameplay/MilestoneService';
import { DifficultyManager } from './services/gameplay/DifficultyManager';
import { GameStateMachine } from './services/core/GameStateMachine';
import { ImagePreloader } from './services/system/ImagePreloader';
import { Logger } from './services/system/Logger';
import { UserSessionService } from './services/auth/UserSessionService';
import { ExperienceService } from './services/gameplay/ExperienceService';
import { TimeService } from './services/core/TimeService';
import { PerformanceTracker } from './services/analytics/PerformanceTracker';
import { DeviceProfiler } from './services/analytics/DeviceProfiler';
import { WalletService } from './services/gameplay/WalletService';
import { ComboSystem } from './services/combat/ComboSystem';
import { SupabaseCoinProvider } from './services/gameplay/SupabaseCoinProvider';

// Custom hooks
import { ErrorRecoveryService } from './services/core/ErrorRecoveryService';
import { MarketEventManager } from './services/market/MarketEventManager';
import { useDevice } from './hooks/useDevice';
import { useMarketData } from './hooks/useMarketData';
import { usePlayerState } from './hooks/usePlayerState';
import { useWindowDimensions } from './hooks/useWindowDimensions';
import { useGameStatus } from './hooks/useGameStatus';
import { useRunStats } from './hooks/useRunStats';
import { useCheatManager } from './hooks/useCheatManager';
import { useAppInitialization } from './hooks/useAppInitialization';
import { useBeforeUnload } from './hooks/useBeforeUnload';
import { useDevShortcuts } from './hooks/useDevShortcuts';
import { useMarketTimeout } from './hooks/useMarketTimeout';
import { usePauseBudget } from './hooks/usePauseBudget';
import { useCloudflareSession } from './hooks/useCloudflareSession';
import { useTutorial } from './hooks/useTutorial';
import { ThemeProvider } from './contexts/ThemeContext';
import { UserProvider } from './contexts/UserContext';
import { useLanguage } from './contexts/LanguageContext';
import { useGameStore } from './stores/gameStore';

// Lazy load heavy components for performance optimization
import { NicknameEntryScreen } from './components/screens/NicknameEntryScreen';
import { GameEngine } from './components/GameEngine';
import { GameUI } from './components/GameUI';
import { SettingsPanel } from './components/settings/SettingsPanel';
import { MainMenu } from './components/screens/MainMenu';
import { HubMenu } from './components/hub';
import { LevelUpScreen } from './components/screens/LevelUpScreen';
import { CycleCompleteScreen } from './components/screens/CycleCompleteScreen';
import { MarketDisconnectedScreen } from './components/screens/MarketDisconnectedScreen';
import { ErrorBoundary } from './components/ErrorBoundary';
import { LazyMotionProvider } from './components/LazyMotionProvider';
import { TutorialOverlay } from './components/screens/TutorialOverlay';
import { NotificationSystem } from './components/hud';
import { LandingPage } from './components/screens/LandingPage';
import { PrivacyPolicy, TermsOfService } from './components/screens/LegalModals';

// Lazy load heavy admin/debug components
const LeaderboardPanel = React.lazy(() =>
  import('./components/hud/LeaderboardPanel').then(m => ({
    default: m.LeaderboardPanel,
  }))
);

// Lazy load Evolution Viewer for Project Darwin
const EvolutionViewer = React.lazy(() => import('./components/admin/EvolutionViewer'));
const PauseMenu = React.lazy(() =>
  import('./components/screens/PauseMenu').then(m => ({ default: m.PauseMenu }))
);
const GameOverScreen = React.lazy(() =>
  import('./components/screens/GameOverScreen').then(m => ({
    default: m.GameOverScreen,
  }))
);

// Fallback components
const FallbackLoader = () => {
  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#020617',
        color: '#eab308',
        fontFamily: 'monospace',
        fontSize: '14px',
        letterSpacing: '0.1em',
      }}
    >
      LOADING ENGINE...
    </div>
  );
};

const UIFallback = () => null;

// Preload card images AFTER initial render (non-blocking)
setTimeout(() => {
  void ImagePreloader.preloadAll();
}, 1000);

const App: React.FC = () => {
  // ========================================
  // Custom Hooks
  // ========================================

  // URL Check for Darwin Mode (Moved inside Component logic but return happens later)
  const [isDarwinMode, setIsDarwinMode] = useState(false);
  useEffect(() => {
    // SECURE: Only allow in Dev environment
    if (import.meta.env.DEV && window.location.search.includes('mode=darwin')) {
      setIsDarwinMode(true);
    }
  }, []);

  const { t } = useLanguage();
  const device = useDevice();
  const dimensions = useWindowDimensions();
  const { gameStatus, handlePauseToggle } = useGameStatus();
  const { runStats, resetRunStats } = useRunStats();
  const audioState = useGameStore(state => state.audio);
  const toggleMute = useGameStore(state => state.toggleMute);

  const profileId = UserSessionService.getProfileId() || 'anonymous';
  useCloudflareSession(gameStatus, profileId, 'BTCUSDT');

  const [gameMode, setGameMode] = useState<GameMode>(GameMode.COMPETITIVE);

  const handleAutoResume = useCallback(() => {
    GameStateMachine.transition(GameStatus.PLAYING);
  }, []);
  const pauseBudget = usePauseBudget(gameMode, gameStatus, handleAutoResume);

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden && gameStatus === GameStatus.PLAYING) {
        const isLimited = gameMode === GameMode.COMPETITIVE;
        if (!isLimited) {
          GameStateMachine.transition(GameStatus.PAUSED);
        } else {
          Logger.info(
            '[App] Competitive mode active - skipping auto-pause while hidden'
          );
        }
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () =>
      document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [gameStatus, gameMode, pauseBudget.remainingSeconds]);

  // ========================================
  // Local State
  // ========================================
  const [position, setPosition] = useState<MarketPosition>(MarketPosition.LONG);
  const [entryPrice, setEntryPrice] = useState<number>(0);
  const [upgradeChoices, setUpgradeChoices] = useState<Card[]>([]);
  const [showSettings, setShowSettings] = useState<boolean>(false);
  const [leverage, setLeverage] = useState<LeverageOption>(10);
  const [selectedPair, setSelectedPair] = useState<CryptoPair>('BTC');
  const [cycleData, setCycleData] = useState<CycleCompleteData | null>(null);
  const [hubScreen, setHubScreen] = useState<
    'hub' | 'play' | 'stash' | 'loot' | 'skins' | 'ranks' | 'gear'
  >('hub');
  const [walletBalance, setWalletBalance] = useState<number>(0);
  const isGameOverProcessing = useRef(false);

  // ========================================
  // Initialization & Utility Hooks
  // ========================================
  const { needsNickname, setNeedsNickname, isInitialized } = useAppInitialization();
  const { showAnalytics: _showAnalytics, showAdminDashboard: _showAdminDashboard } =
    useDevShortcuts();
  const tutorial = useTutorial();

  // Landing & Legal State
  const [showLanding, setShowLanding] = useState(() => {
    // If we're in the middle of a game or returning session, don't show landing
    if (localStorage.getItem('has_seen_landing') === 'true') return false;
    return true;
  });
  const [showPrivacy, setShowPrivacy] = useState(false);
  const [showTerms, setShowTerms] = useState(false);

  const handleLaunchGame = useCallback(() => {
    setShowLanding(false);
    localStorage.setItem('has_seen_landing', 'true');
  }, []);

  useEffect(() => {
    if (gameStatus === GameStatus.MENU && isInitialized) {
      void (async () => {
        const balance = await WalletService.getInstance().getBalance();
        setWalletBalance(balance);
      })();
    }
  }, [gameStatus, isInitialized]);

  useEffect(() => {
    CoinService.setProvider(new SupabaseCoinProvider());
    void ErrorRecoveryService;
    void MarketEventManager;
  }, []);

  useEffect(() => {
    return Logger.onError((message, error) => {
      EventBus.emit('gameNotification', {
        title: 'System Error',
        message: message || String(error),
        type: 'error',
      });
    });
  }, []);

  // ========================================
  // Player & Market Hooks
  // ========================================
  const { playerRef, uiStats, setUiStats, resetPlayer, healFull, setPositionColor } =
    usePlayerState(dimensions.width, dimensions.height);

  const { marketData } = useMarketData(
    gameStatus,
    position,
    entryPrice,
    leverage,
    playerRef,
    selectedPair
  );

  useMarketTimeout({ playerRef });

  // ========================================
  // Callbacks
  // ========================================
  const handleNicknameComplete = useCallback(
    (nickname: string) => {
      setNeedsNickname(false);
      Logger.info(`Signed in as ${nickname}`);
      void import('./services/analytics/PlayerTracker').then(
        ({ default: playerTracker }) => {
          void playerTracker.refresh();
        }
      );
      void WalletService.getInstance()
        .getBalance()
        .then(b => setWalletBalance(b));
    },
    [setNeedsNickname]
  );

  const handleLevelUp = useCallback(() => {
    healFull();
    GameStateMachine.transition(GameStatus.LEVEL_UP);
    const choices = CardSystem.generateChoices(
      playerRef.current.luck,
      playerRef.current.level
    );
    setUpgradeChoices(choices);
    audio.playLevelUp();
  }, [healFull, playerRef]);

  const resetGame = useCallback(() => {
    GameStateManager.resetAll();
    GameStateMachine.forceState(GameStatus.MENU);
    setEntryPrice(0);
    resetRunStats();
    resetPlayer();
    isGameOverProcessing.current = false;
    void WalletService.getInstance()
      .getBalance()
      .then(b => setWalletBalance(b));
  }, [resetPlayer, resetRunStats]);

  const startGame = useCallback(
    async (choice: MarketPosition, selectedLeverage: LeverageOption) => {
      if (marketData.price === 0 || gameStatus !== GameStatus.MENU) {
        Logger.error(`[App] startGame aborted: condition check failed.`);
        return;
      }

      resetPlayer();
      setLeverage(selectedLeverage);
      CoinService.resetSession();
      ComboSystem.startGame();

      const success = await GameStateManager.initializeNewGame(
        choice,
        marketData.price,
        selectedLeverage,
        selectedPair
      );

      if (!success) {
        EventBus.emit('gameNotification', {
          title: 'Connection Error',
          message: 'Failed to start game session.',
          type: 'error',
        });
        return;
      }

      setPosition(choice);
      setEntryPrice(marketData.price);
      setPositionColor(choice);

      playerRef.current.nextLevelExp = ExperienceService.getRequiredExp(
        playerRef.current.level,
        selectedLeverage
      );
      setUiStats({ ...playerRef.current });

      TimeService.setMaxDeltaTime(gameMode === GameMode.COMPETITIVE ? 10000 : 50);

      GameStateMachine.transition(GameStatus.PLAYING);
      MilestoneService.startSession();
      audio.playLevelUp();

      void import('./services/analytics/PerformanceTracker').then(
        ({ PerformanceTracker }) => {
          PerformanceTracker.getInstance().start();
        }
      );
    },
    [
      marketData.price,
      gameStatus,
      resetPlayer,
      setPositionColor,
      selectedPair,
      setLeverage,
      setPosition,
      setEntryPrice,
      gameMode,
      playerRef,
      setUiStats,
    ]
  );

  const selectUpgrade = useCallback(
    (card: Card) => {
      const p = playerRef.current;
      const nextP = applyCardEffect(p, card);
      nextP.level += 1;
      nextP.exp -= nextP.nextLevelExp;
      nextP.nextLevelExp = ExperienceService.getRequiredExp(nextP.level, leverage);

      MetricsService.trackLevelUp(nextP.level, card.name, card.tier);
      playerRef.current = nextP;
      setUiStats({ ...nextP });
      EventBus.emit('levelUpComplete', { newLevel: nextP.level });

      if (nextP.exp >= nextP.nextLevelExp) {
        handleLevelUp();
      } else {
        GameStateMachine.transition(GameStatus.PLAYING);
      }
    },
    [playerRef, setUiStats, handleLevelUp, leverage]
  );

  const handleGameOver = useCallback(
    async (reason: GameEndReason = GameEndReason.DEATH) => {
      if (isGameOverProcessing.current) return;
      isGameOverProcessing.current = true;

      GameStateMachine.transition(GameStatus.GAMEOVER);

      const tracker = PerformanceTracker.getInstance();
      tracker.stop();
      const perfStats = tracker.getStats();

      const metrics = MetricsService.endSession(reason, {
        price: marketData.price,
        pnl: marketData.pnl,
        level: playerRef.current.level,
        hp: playerRef.current.hp,
        difficulty: marketData.difficulty,
        playerStats: {
          damage: playerRef.current.baseDamage,
          fireRate: playerRef.current.fireRate,
          speed: playerRef.current.speed,
          luck: playerRef.current.luck,
          critChance: playerRef.current.critChance,
          critDamage: playerRef.current.critChance * 2,
        },
        position,
        entryPrice,
        leverage,
        totalKills: runStats.totalKills,
        avgFps: perfStats.avgFps,
        minFps: perfStats.minFps,
        maxFps: perfStats.maxFps,
        fps_1_percentile: perfStats.onePercentLow,
        avg_frame_time_ms: perfStats.avgFrameTime,
        max_frame_time_ms: perfStats.maxFrameTime,
        fpsSamples: perfStats.sampleCount,
        deviceFingerprint: DeviceProfiler.getFingerprint(),
        browser: DeviceProfiler.getProfile().userAgent.substring(0, 64),
        os: 'Windows',
        pixelRatio: window.devicePixelRatio,
      });

      if (metrics) {
        void (async () => {
          try {
            const submission = await GameSessionService.submitSession({
              level: playerRef.current.level,
              kills: runStats.totalKills,
              survivalTimeMs: DifficultyManager.getTotalElapsedSeconds() * 1000,
              entryPrice: entryPrice,
              exitPrice: marketData.price,
              pnlPercent: marketData.pnl,
              pair: selectedPair,
              position: position,
              leverage: leverage,
              endReason: reason,
              replayData: metrics.replayData,
              performance: metrics.performance,
            });

            if (submission.success && submission.reward && submission.reward > 0) {
              Logger.info(`[App] Session verified! Reward: ${submission.reward}`);
              await CoinService.creditCoins(submission.reward, 'achievement');
            }
          } catch (err) {
            Logger.error('[App] Critical error during session submission:', err);
          }
        })();
      }
    },
    [
      marketData,
      playerRef,
      position,
      entryPrice,
      leverage,
      selectedPair,
      runStats.totalKills,
    ]
  );

  useEffect(() => {
    if (gameStatus === GameStatus.PLAYING && marketData.effectivePnl <= -1) {
      Logger.warn(`[Liquidation] Player liquidated at price ${marketData.price}`);
      void handleGameOver(GameEndReason.LIQUIDATION);
    }
  }, [gameStatus, marketData.effectivePnl, handleGameOver, marketData.price]);

  useEffect(() => {
    const handleCycleComplete = (data: {
      cycleNumber: number;
      totalElapsedSeconds: number;
    }) => {
      Logger.debug(`[App] handleCycleComplete triggered. Mode=${gameMode}`, data);
      if (gameMode === GameMode.COMPETITIVE) {
        setCycleData({
          cycleNumber: data.cycleNumber,
          survivalTimeSeconds: data.totalElapsedSeconds,
          totalKills: runStats.totalKills,
          level: playerRef.current.level,
          pnl: marketData.pnl,
          effectivePnl: marketData.effectivePnl,
          coinsEarned: 0,
          continueMultiplier: 1 + data.cycleNumber * 0.5,
        });
        GameStateMachine.transition(GameStatus.CYCLE_COMPLETE);
      }
    };

    const unsubscribe = EventBus.on('cycleComplete', handleCycleComplete);
    return () => unsubscribe();
  }, [gameMode, runStats.totalKills, playerRef, marketData]);

  const handleCashOut = useCallback(async () => {
    if (cycleData) {
      const calc = CoinService.calculateCycleReward({
        survivalTimeSeconds: cycleData.survivalTimeSeconds,
        kills: cycleData.totalKills,
        level: cycleData.level,
        pnl: cycleData.effectivePnl,
        maxStreak: ComboSystem.getMaxStreak(),
      });
      await CoinService.creditCoins(calc.total, 'cycle_complete');
      void handleGameOver(GameEndReason.DEATH);
    }
  }, [cycleData, handleGameOver]);

  const handleContinue = useCallback(() => {
    setCycleData(null);
    GameStateMachine.transition(GameStatus.PLAYING);
  }, []);

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
    [handleLevelUp, healFull, playerRef, setUiStats, resetGame]
  );

  useCheatManager(gameStatus, cheatHandlers);

  useEffect(() => {
    window.EventBus = EventBus;
    void import('./services/combat/ComboSystem').then(({ ComboSystem }) => {
      window.ComboSystem = ComboSystem;
    });

    // @ts-expect-error - Adding to window for testing
    window.GameHelpers = {
      triggerLevelUp: () => handleLevelUp(),
      triggerCycleComplete: () => {
        EventBus.emit('cycleComplete', {
          cycleNumber: 1,
          totalElapsedSeconds: 300,
        });
      },
      triggerGameOver: () => void handleGameOver(),
    };
  }, [handleLevelUp, handleGameOver]);

  useBeforeUnload(gameStatus);

  // ========================================
  // Render Logic
  // ========================================

  // Darwin Spectator Mode
  if (isDarwinMode) {
    return (
      <React.Suspense
        fallback={
          <div className="text-green-500 bg-black p-4">Loading Project Darwin...</div>
        }
      >
        <EvolutionViewer />
      </React.Suspense>
    );
  }

  // App Loading
  if (!isInitialized) {
    return <FallbackLoader />;
  }

  // Main Game App
  return (
    <UserProvider>
      <ThemeProvider>
        <LazyMotionProvider>
          <div
            className={`relative w-full h-screen ${gameStatus === GameStatus.PLAYING || showLanding ? 'overflow-hidden' : 'overflow-y-auto'} bg-slate-950 font-mono`}
          >
            <ErrorBoundary>
              {showLanding ? (
                <LandingPage
                  onLaunch={handleLaunchGame}
                  onViewPrivacy={() => setShowPrivacy(true)}
                  onViewTerms={() => setShowTerms(true)}
                />
              ) : (
                <>
                  <NotificationSystem />

                  <React.Suspense fallback={<FallbackLoader />}>
                    {needsNickname && (
                      <React.Suspense fallback={<FallbackLoader />}>
                        <NicknameEntryScreen onComplete={handleNicknameComplete} />
                      </React.Suspense>
                    )}

                    {tutorial.showTutorial &&
                      !needsNickname &&
                      gameStatus === GameStatus.MENU && (
                        <TutorialOverlay
                          step={tutorial.currentStep}
                          stepIndex={tutorial.currentStepIndex}
                          totalSteps={tutorial.totalSteps}
                          isFirstStep={tutorial.isFirstStep}
                          isLastStep={tutorial.isLastStep}
                          onNext={tutorial.nextStep}
                          onPrev={tutorial.prevStep}
                          onSkip={tutorial.skipTutorial}
                          onComplete={tutorial.completeTutorial}
                        />
                      )}

                    <React.Suspense fallback={<FallbackLoader />}>
                      <GameEngine
                        status={gameStatus}
                        position={position}
                        pair={selectedPair}
                        marketData={marketData}
                        onGameOver={() => void handleGameOver()}
                        onLevelUp={handleLevelUp}
                        updatePlayerStats={setUiStats}
                        playerRef={playerRef}
                        width={dimensions.width}
                        height={dimensions.height}
                      />
                    </React.Suspense>

                    {gameStatus !== GameStatus.MENU && (
                      <React.Suspense fallback={<UIFallback />}>
                        <GameUI
                          position={position}
                          entryPrice={entryPrice}
                          marketData={marketData}
                          player={uiStats}
                          onTogglePause={handlePauseToggle}
                          status={gameStatus}
                        />
                      </React.Suspense>
                    )}

                    {gameStatus === GameStatus.GAMEOVER && (
                      <React.Suspense fallback={<UIFallback />}>
                        <GameOverScreen
                          level={playerRef.current.level}
                          finalPnl={marketData.pnl}
                          survivalTime={DifficultyManager.getTotalElapsedSeconds()}
                          kills={runStats.totalKills}
                          onRestart={resetGame}
                        />
                      </React.Suspense>
                    )}

                    {gameStatus === GameStatus.PAUSED && (
                      <React.Suspense fallback={<UIFallback />}>
                        <PauseMenu
                          runStats={{
                            totalKills: runStats.totalKills,
                            // eslint-disable-next-line @typescript-eslint/no-explicit-any
                            maxStreak: (window.ComboSystem as any)?.getMaxStreak() ?? 0,
                            totalBonusXp: 0,
                          }}
                          onResume={handlePauseToggle}
                          onRestart={resetGame}
                          onMainMenu={resetGame}
                          onOpenSettings={() => setShowSettings(true)}
                          isMuted={audioState.isMuted}
                          onToggleMute={toggleMute}
                          pauseSecondsRemaining={pauseBudget.remainingSeconds}
                          pauseSecondsMax={pauseBudget.maxSeconds}
                        />
                      </React.Suspense>
                    )}

                    {gameStatus === GameStatus.MENU &&
                      !needsNickname &&
                      hubScreen === 'hub' && (
                        <React.Suspense fallback={<UIFallback />}>
                          <HubMenu
                            nickname={UserSessionService.getNickname() ?? 'Survivor'}
                            coins={walletBalance}
                            onNavigate={screen => {
                              if (screen === 'gear') setShowSettings(true);
                              else if (screen === 'hub') setHubScreen('hub');
                              else setHubScreen(screen);
                            }}
                          />
                        </React.Suspense>
                      )}

                    {gameStatus === GameStatus.MENU &&
                      !needsNickname &&
                      hubScreen === 'play' && (
                        <React.Suspense fallback={<UIFallback />}>
                          <MainMenu
                            price={marketData.price}
                            onStart={(c, l) => {
                              void startGame(c, l);
                            }}
                            onOpenSettings={() => setShowSettings(true)}
                            selectedPair={selectedPair}
                            onPairChange={setSelectedPair}
                            selectedMode={gameMode}
                            onModeChange={setGameMode}
                          />
                          <button
                            onClick={() => setHubScreen('hub')}
                            className="fixed z-[110] px-3 py-2 bg-white/10 hover:bg-white/20 border border-white/20 rounded-xl text-white text-sm font-cyber uppercase tracking-wider backdrop-blur-sm transition-all shadow-lg active:scale-95 touch-manipulation"
                            style={{
                              top: `calc(${device.isMobile ? '2.5rem' : '1rem'} + env(safe-area-inset-top, 0px))`,
                              left: `calc(${device.isMobile ? '1rem' : '1rem'} + env(safe-area-inset-left, 0px))`,
                            }}
                          >
                            ← {!device.isMobile && ` ${t('common.back_to_hub')}`}
                          </button>
                        </React.Suspense>
                      )}

                    {gameStatus === GameStatus.CYCLE_COMPLETE && cycleData && (
                      <React.Suspense fallback={<UIFallback />}>
                        <CycleCompleteScreen
                          data={cycleData}
                          onCashOut={handleCashOut}
                          onContinue={handleContinue}
                        />
                      </React.Suspense>
                    )}

                    {gameStatus === GameStatus.DATA_DISCONNECTED && (
                      <React.Suspense fallback={<UIFallback />}>
                        <MarketDisconnectedScreen onBackToMenu={resetGame} />
                      </React.Suspense>
                    )}

                    {gameStatus === GameStatus.MENU &&
                      (hubScreen === 'ranks' || hubScreen === 'play') && (
                        <React.Suspense fallback={null}>
                          <LeaderboardPanel />
                        </React.Suspense>
                      )}

                    {showSettings && (
                      <React.Suspense fallback={<UIFallback />}>
                        <SettingsPanel
                          onClose={() => setShowSettings(false)}
                          isInGame={gameStatus !== GameStatus.MENU}
                          onReplayTutorial={tutorial.startTutorial}
                        />
                      </React.Suspense>
                    )}

                    {gameStatus === GameStatus.LEVEL_UP && (
                      <React.Suspense fallback={<UIFallback />}>
                        <LevelUpScreen
                          upgradeChoices={upgradeChoices}
                          onSelect={selectUpgrade}
                        />
                      </React.Suspense>
                    )}
                  </React.Suspense>
                </>
              )}

              {/* Legal Modals */}
              {showPrivacy && <PrivacyPolicy onClose={() => setShowPrivacy(false)} />}
              {showTerms && <TermsOfService onClose={() => setShowTerms(false)} />}
            </ErrorBoundary>
          </div>
        </LazyMotionProvider>
      </ThemeProvider>
    </UserProvider>
  );
};

export default App;
