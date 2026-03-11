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
import { audio } from './services/audio';
import { EventBus } from './services/core/EventBus';
import { GameMode } from './types/gameMode';
import { CoinService } from './services/gameplay/CoinService';
import { GameStateManager } from './services/core/GameStateManager';
import { MilestoneService } from './services/gameplay/MilestoneService';
import { DifficultyManager } from './services/gameplay/DifficultyManager';
import { GameStateMachine } from './services/core/GameStateMachine';
import { ImagePreloader } from './services/system/ImagePreloader';
import { Logger } from './services/system/Logger';
import { UserSessionService } from './services/auth/UserSessionService';
import { ExperienceService } from './services/gameplay/ExperienceService';
import { TimeService } from './services/core/TimeService';
import { WalletService } from './services/gameplay/WalletService';
import { ComboSystem } from './services/combat/ComboSystem';
import { LeverageEngine } from './services/gameplay/LeverageEngine';
import { SupabaseCoinProvider } from './services/gameplay/SupabaseCoinProvider';

// Custom hooks
import { ErrorRecoveryService } from './services/core/ErrorRecoveryService';
import { MarketEventManager } from './services/market/MarketEventManager';
import { useDevice } from './hooks/useDevice';
import { useLanguage } from './contexts/LanguageContext';
import { useMarketData } from './hooks/useMarketData';
import { usePlayerState } from './hooks/usePlayerState';
import { useWindowDimensions } from './hooks/useWindowDimensions';
import { useGameStatus } from './hooks/useGameStatus';
import { useRunStats } from './hooks/useRunStats';
import { useCheatManager } from './hooks/useCheatManager';
import { useDebugBridge } from './hooks/useDebugBridge';
import { useAppInitialization } from './hooks/useAppInitialization';
import { useBeforeUnload } from './hooks/useBeforeUnload';
import { useDevShortcuts } from './hooks/useDevShortcuts';
import { useMarketTimeout } from './hooks/useMarketTimeout';
import { useTheme } from './contexts/useTheme';
import { usePauseBudget } from './hooks/usePauseBudget';
import { useCloudflareSession } from './hooks/useCloudflareSession';
import { useTutorial } from './hooks/useTutorial';
import { useGameFlowController } from './hooks/useGameFlowController';
import { useSurfaceState } from './hooks/useSurfaceState';
import { UserProvider } from './contexts/UserContext';
import { useGameStore } from './stores/gameStore';
import { cn } from './utils/classnames';
import { SEO } from './components/SEO';
import { getMarketRuntimeConfig } from './config/marketRuntime';

// Lazy load heavy components for performance optimization
import GameEngine from './components/GameEngine';
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
import { DocScreen } from './components/screens/DocScreen';
import { PrivacyPolicy, TermsOfService } from './components/screens/LegalModals';
import { NicknameEntryScreen } from './components/screens/NicknameEntryScreen';
import { AITrainerOverlay } from './components/admin/AITrainerOverlay';

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

const START_OF_RUN_LIQUIDATION_GRACE_MS = 3_000;

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

  // Track tab hidden state for competitive mode abuse prevention
  const tabHiddenSinceRef = useRef<number | null>(null);

  useEffect(() => {
    const handleVisibilityChange = () => {
      const isCompetitive = gameMode === GameMode.COMPETITIVE;

      if (document.hidden) {
        // Tab became hidden
        if (gameStatus === GameStatus.PLAYING) {
          if (isCompetitive) {
            // Competitive: Auto-pause to consume pause budget (anti-abuse)
            tabHiddenSinceRef.current = Date.now();
            Logger.info(
              '[App] Competitive mode: Tab hidden, auto-pausing to use pause budget'
            );
            GameStateMachine.transition(GameStatus.PAUSED);
          } else {
            // Casual: Normal pause
            GameStateMachine.transition(GameStatus.PAUSED);
          }
        } else if (gameStatus === GameStatus.LEVEL_UP && isCompetitive) {
          // Competitive: Level-up screen counts against timer while hidden
          Logger.info('[App] Competitive mode: Tab hidden during level-up');
        }
      } else {
        // Tab became visible
        tabHiddenSinceRef.current = null;
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () =>
      document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [gameStatus, gameMode]);

  // ========================================
  // Local State
  // ========================================
  const [position, setPosition] = useState<MarketPosition>(MarketPosition.LONG);
  const [entryPrice, setEntryPrice] = useState<number>(0);
  const [leverage, setLeverage] = useState<LeverageOption>(10);
  const [selectedPair, setSelectedPair] = useState<CryptoPair>('BTC');
  const [walletBalance, setWalletBalance] = useState<number>(0);
  const {
    showLanding,
    showSettings,
    hubScreen,
    showPrivacy,
    showTerms,
    showDocs,
    isIdentityReady,
    hasNickname,
    setHubScreen,
    setShowSettings,
    patchLegalRoute,
    patchIdentityState,
    handleLaunchGame,
    handleReturnToLanding,
  } = useSurfaceState();

  const marketRuntimeConfig = useMemo(() => getMarketRuntimeConfig(), []);

  // ========================================
  // Initialization & Utility Hooks
  // ========================================
  const { isInitialized } = useAppInitialization();
  const { showAnalytics: _showAnalytics, showAdminDashboard: _showAdminDashboard } =
    useDevShortcuts();
  const tutorial = useTutorial({ enabled: !showLanding });
  const { t, language } = useLanguage();
  const { isRetro } = useTheme();
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
    Logger.info('[MarketRuntime] Mode initialized', {
      mode: marketRuntimeConfig.mode,
      shadowRuntimeEnabled: marketRuntimeConfig.shouldRunShadowRuntime,
    });
  }, [marketRuntimeConfig.mode, marketRuntimeConfig.shouldRunShadowRuntime]);

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
    selectedPair,
    marketRuntimeConfig.mode
  );

  useMarketTimeout({ playerRef });

  const {
    upgradeChoices,
    cycleData,
    pauseMenuStats,
    frozenPnlRef,
    handleLevelUp,
    selectUpgrade,
    handleGameOver,
    handleCashOut,
    handleContinue,
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
    startOfRunLiquidationGraceMs: START_OF_RUN_LIQUIDATION_GRACE_MS,
  });

  // ========================================
  // Callbacks
  // ========================================

  const resetGame = useCallback(() => {
    GameStateManager.resetAll();
    GameStateMachine.forceState(GameStatus.MENU);
    setEntryPrice(0);
    resetRunStats();
    resetPlayer();
    resetFlowState();
    void WalletService.getInstance()
      .getBalance()
      .then(b => setWalletBalance(b));
  }, [resetPlayer, resetRunStats, resetFlowState]);

  const startGame = useCallback(
    async (choice: MarketPosition, selectedLeverage: LeverageOption) => {
      if (gameStatus !== GameStatus.MENU) {
        Logger.error(`[App] startGame aborted: game is not in MENU state.`);
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

      resetPlayer();
      setLeverage(selectedLeverage);
      CoinService.resetSession();
      ComboSystem.startGame();

      let success: boolean;
      try {
        success = await GameStateManager.initializeNewGame(
          choice,
          marketData.price,
          selectedLeverage,
          selectedPair
        );
      } catch (error) {
        // Identity/session bootstrap errors route user back to nickname onboarding.
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
          patchIdentityState({ hasNickname: false });
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

      setPosition(choice);
      setEntryPrice(marketData.price);
      setPositionColor(choice);
      markRunStarted();

      // Apply leverage-based max HP scaling (FRAGILITY)
      // Higher leverage = lower maxHp (e.g., 100x → 50% of base health)
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
      hasNickname,
      resetPlayer,
      setPositionColor,
      selectedPair,
      setLeverage,
      setPosition,
      setEntryPrice,
      gameMode,
      playerRef,
      setUiStats,
      markRunStarted,
      setHubScreen,
      patchIdentityState,
    ]
  );

  const handleOpenSettings = useCallback(() => {
    setShowSettings(true);
  }, [setShowSettings]);

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

  useCheatManager(gameStatus, cheatHandlers, import.meta.env.DEV);

  useDebugBridge({
    onLevelUp: handleLevelUp,
    onGameOver: () => {
      void handleGameOver();
    },
  });

  useBeforeUnload(gameStatus);

  const shouldShowNicknameEntry =
    isIdentityReady &&
    !hasNickname &&
    !showLanding &&
    !showDocs &&
    !showPrivacy &&
    !showTerms &&
    gameStatus === GameStatus.MENU;

  // ========================================
  // Render Logic
  // ========================================

  // Darwin Spectator Mode
  if (isDarwinMode) {
    return (
      <React.Suspense
        fallback={
          <div className="bg-black p-4 text-green-500">Loading Project Darwin...</div>
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
      <LazyMotionProvider>
        <div
          className={cn(
            'relative h-screen w-full font-mono',
            showLanding ? 'bg-transparent' : 'bg-slate-950',
            gameStatus === GameStatus.PLAYING && !showLanding
              ? 'overflow-hidden'
              : 'overflow-y-auto'
          )}
        >
          <ErrorBoundary>
            {/* Dynamic 2026 SEO & AI Discovery Meta Tags */}
            {showLanding ? (
              <SEO
                title={
                  (t('landing.hero.title_top') as string) +
                  ' ' +
                  (t('landing.hero.title_highlight') as string)
                }
                description={t('landing.hero.description') as string}
                canonicalPath="/"
                lang={language}
                themeColor={isRetro ? '#334155' : '#020617'}
                structuredData={{
                  '@context': 'https://schema.org',
                  '@type': 'VideoGame',
                  name: 'Crypto Survivors',
                  description: t('landing.hero.description') as string,
                  genre: ['Survival', 'Rogue-lite', 'Simulation', 'Arcade'],
                  gamePlatform: ['Web Browser', 'Mobile Browser', 'PWA'],
                  applicationCategory: 'Game',
                  operatingSystem: 'Any',
                  playMode: 'SinglePlayer',
                  author: {
                    '@type': 'Person',
                    name: 'blntunlan',
                  },
                  offers: {
                    '@type': 'Offer',
                    price: '0',
                    priceCurrency: 'USD',
                  },
                }}
                breadcrumbs={[{ name: 'Home', item: '/' }]}
              />
            ) : showDocs ? (
              <SEO
                title={t('landing.nav.docs') as string}
                description="Complete technical protocol documentation for the Crypto Survivors engine, mechanics, and architecture."
                canonicalPath="/docs"
                lang={language}
                breadcrumbs={[
                  { name: 'Home', item: '/' },
                  { name: 'Documentation', item: '/docs' },
                ]}
              />
            ) : showPrivacy ? (
              <SEO
                title={t('landing.footer.privacy') as string}
                description="Our commitment to protecting your privacy and gaming data."
                canonicalPath="/privacy"
                lang={language}
                breadcrumbs={[
                  { name: 'Home', item: '/' },
                  { name: 'Privacy', item: '/privacy' },
                ]}
              />
            ) : showTerms ? (
              <SEO
                title={t('landing.footer.terms') as string}
                description="Official terms and conditions for playing Crypto Survivors."
                canonicalPath="/terms"
                lang={language}
                breadcrumbs={[
                  { name: 'Home', item: '/' },
                  { name: 'Terms', item: '/terms' },
                ]}
              />
            ) : (
              <SEO
                title={
                  gameStatus === GameStatus.PLAYING
                    ? '🔴 LIVE SESSION'
                    : (t('hub.play') as string)
                }
                noindex={true}
                lang={language}
              />
            )}

            {showLanding ? (
              <LandingPage
                onLaunch={handleLaunchGame}
                onViewPrivacy={() => {
                  patchLegalRoute({
                    showPrivacy: true,
                    showTerms: false,
                  });
                  window.history.pushState(null, '', '/privacy');
                }}
                onViewTerms={() => {
                  patchLegalRoute({
                    showTerms: true,
                    showPrivacy: false,
                  });
                  window.history.pushState(null, '', '/terms');
                }}
              />
            ) : (
              <>
                {import.meta.env.DEV && (
                  <AITrainerOverlay
                    playerRef={playerRef}
                    gameStatus={gameStatus}
                    resetGame={resetGame}
                    startGame={(c, l) => { void startGame(c, l); }}
                    upgradeChoices={upgradeChoices}
                    selectUpgrade={selectUpgrade}
                  />
                )}
                <NotificationSystem />
                {shouldShowNicknameEntry && (
                  <NicknameEntryScreen
                    onComplete={() => {
                      patchIdentityState({ hasNickname: true });
                    }}
                  />
                )}

                <React.Suspense fallback={<FallbackLoader />}>
                  {tutorial.showTutorial &&
                    gameStatus === GameStatus.MENU &&
                    hubScreen === 'hub' && (
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
                        finalPnl={frozenPnlRef.current}
                        survivalTime={DifficultyManager.getTotalElapsedSeconds()}
                        kills={runStats.totalKills}
                        onRestart={resetGame}
                        coinsEarned={CoinService.getSessionCoins()}
                      />
                    </React.Suspense>
                  )}

                  {gameStatus === GameStatus.PAUSED && (
                    <React.Suspense fallback={<UIFallback />}>
                      <PauseMenu
                        runStats={pauseMenuStats}
                        onResume={handlePauseToggle}
                        onRestart={resetGame}
                        onMainMenu={resetGame}
                        onOpenSettings={handleOpenSettings}
                        isMuted={audioState.isMuted}
                        onToggleMute={toggleMute}
                        pauseSecondsRemaining={pauseBudget.remainingSeconds}
                        pauseSecondsMax={pauseBudget.maxSeconds}
                      />
                    </React.Suspense>
                  )}

                  {gameStatus === GameStatus.MENU && hubScreen === 'hub' && (
                    <React.Suspense fallback={<UIFallback />}>
                      <HubMenu
                        nickname={UserSessionService.getNickname() ?? 'Survivor'}
                        coins={walletBalance}
                        onNavigate={screen => {
                          if (screen === 'gear') {
                            setShowSettings(true);
                          } else if (screen === 'hub') {
                            setHubScreen('hub');
                          } else {
                            setHubScreen(screen);
                          }
                        }}
                        onBack={handleReturnToLanding}
                      />
                    </React.Suspense>
                  )}

                  {gameStatus === GameStatus.MENU && hubScreen === 'play' && (
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
                        className="fixed z-[110] flex h-10 touch-manipulation items-center gap-2 border border-white/10 bg-white/5 px-4 font-mono text-xs font-semibold uppercase tracking-widest text-slate-400 backdrop-blur-sm transition-all duration-300 hover:border-[#d6b85c]/40 hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#d6b85c] active:scale-95"
                        style={{
                          top: `calc(${device.isMobile ? '2.5rem' : '1rem'} + env(safe-area-inset-top, 0px))`,
                          left: `calc(1rem + env(safe-area-inset-left, 0px))`,
                        }}
                      >
                        ← {!device.isMobile && 'HUB'}
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
                        gameMode={gameMode}
                      />
                    </React.Suspense>
                  )}
                </React.Suspense>
              </>
            )}

            {/* Legal Modals */}
            {showPrivacy && (
              <PrivacyPolicy
                onClose={() => {
                  patchLegalRoute({ showPrivacy: false });
                  if (window.location.pathname === '/privacy') {
                    window.history.pushState(null, '', '/');
                  }
                }}
                onViewTerms={() => {
                  patchLegalRoute({
                    showPrivacy: false,
                    showTerms: true,
                  });
                  window.history.pushState(null, '', '/terms');
                }}
              />
            )}
            {showTerms && (
              <TermsOfService
                onClose={() => {
                  patchLegalRoute({ showTerms: false });
                  if (window.location.pathname === '/terms') {
                    window.history.pushState(null, '', '/');
                  }
                }}
                onViewPrivacy={() => {
                  patchLegalRoute({
                    showTerms: false,
                    showPrivacy: true,
                  });
                  window.history.pushState(null, '', '/privacy');
                }}
              />
            )}
            {showDocs && (
              <DocScreen
                onClose={() => {
                  patchLegalRoute({ showDocs: false });
                  window.location.hash = '';
                  if (window.location.pathname === '/docs') {
                    window.history.pushState(null, '', '/');
                  }
                }}
              />
            )}
          </ErrorBoundary>
        </div>
      </LazyMotionProvider>
    </UserProvider>
  );
};

export default App;
