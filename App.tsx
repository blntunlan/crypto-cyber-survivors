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
import { loadGameMasterBrain } from './services/difficulty/BrainLoader';
import { PerformanceTracker } from './services/analytics/PerformanceTracker';
import { DeviceProfiler } from './services/analytics/DeviceProfiler';
import { WalletService } from './services/gameplay/WalletService';
import { ComboSystem } from './services/combat/ComboSystem';
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
import { useAppInitialization } from './hooks/useAppInitialization';
import { useBeforeUnload } from './hooks/useBeforeUnload';
import { useDevShortcuts } from './hooks/useDevShortcuts';
import { useMarketTimeout } from './hooks/useMarketTimeout';
import { useTheme } from './contexts/useTheme';
import { usePauseBudget } from './hooks/usePauseBudget';
import { useCloudflareSession } from './hooks/useCloudflareSession';
import { useTutorial } from './hooks/useTutorial';
import { UserProvider } from './contexts/UserContext';
import { useGameStore } from './stores/gameStore';
import { cn } from './utils/classnames';
import { SEO } from './components/SEO';

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
import { DocScreen } from './components/screens/DocScreen';
import { PrivacyPolicy, TermsOfService } from './components/screens/LegalModals';
import { AuthCallback } from './components/auth';
import { SupabaseAuthService } from './services/auth/SupabaseAuthService';

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
  const { t, language } = useLanguage();
  const { isRetro } = useTheme();

  // Landing & Legal State - Landing page doesn't require auth
  const [showLanding, setShowLanding] = useState(() => {
    // Check auth callback path - don't show landing during OAuth redirect
    if (window.location.pathname === '/auth/callback') return false;
    // If user has seen landing and is authenticated, skip landing
    if (localStorage.getItem('has_seen_landing') === 'true') return false;
    // Otherwise always show landing first (no auth required)
    return true;
  });
  const [showPrivacy, setShowPrivacy] = useState(false);
  const [showTerms, setShowTerms] = useState(false);
  const [showDocs, setShowDocs] = useState(false);
  const [showAuthCallback, setShowAuthCallback] = useState(false);

  // Handle Hash and Path Navigation for Docs and Legal
  useEffect(() => {
    const handleNavigation = () => {
      // Check Hash for #docs
      if (window.location.hash === '#docs') {
        setShowDocs(true);
      } else {
        setShowDocs(false);
      }

      // Check Pathname for /privacy, /terms, /docs, and /auth/callback
      const path = window.location.pathname;
      if (path === '/privacy') {
        setShowPrivacy(true);
      } else if (path === '/terms') {
        setShowTerms(true);
      } else if (path === '/docs') {
        setShowDocs(true);
      } else if (path === '/auth/callback') {
        setShowAuthCallback(true);
      } else {
        setShowAuthCallback(false);
      }
    };

    window.addEventListener('hashchange', handleNavigation);
    window.addEventListener('popstate', handleNavigation); // Handle back/forward and pushState
    handleNavigation(); // Check on initial load

    return () => {
      window.removeEventListener('hashchange', handleNavigation);
      window.removeEventListener('popstate', handleNavigation);
    };
  }, []);

  const handleLaunchGame = useCallback(() => {
    // Check if user is authenticated before proceeding
    if (needsNickname) {
      // User needs to authenticate - hide landing but show auth screen
      setShowLanding(false);
      // Don't set has_seen_landing yet - will be set after successful auth
    } else {
      // User is authenticated - proceed to hub
      setShowLanding(false);
      localStorage.setItem('has_seen_landing', 'true');
    }
  }, [needsNickname]);

  useEffect(() => {
    if (gameStatus === GameStatus.MENU && isInitialized) {
      void (async () => {
        const balance = await WalletService.getInstance().getBalance();
        setWalletBalance(balance);
      })();
    }
  }, [gameStatus, isInitialized]);

  useEffect(() => {
    void loadGameMasterBrain();
    CoinService.setProvider(new SupabaseCoinProvider());
    SupabaseAuthService.initialize();
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
      localStorage.setItem('has_seen_landing', 'true');
      setHubScreen('hub'); // Go to hub after auth
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

      let success: boolean;
      try {
        success = await GameStateManager.initializeNewGame(
          choice,
          marketData.price,
          selectedLeverage,
          selectedPair
        );
      } catch (error) {
        // Profile not found in production - redirect to nickname screen
        if (error instanceof Error && error.message === 'PROFILE_NOT_FOUND') {
          EventBus.emit('gameNotification', {
            title: 'Session Expired',
            message: 'Please enter your nickname again.',
            type: 'warning',
          });
          // Force re-render to show nickname screen (user cleared in GameSessionService)
          window.location.reload();
          return;
        }
        success = false;
      }

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

      // Ensure exp and level are valid numbers
      const safeExp = isNaN(nextP.exp) ? 0 : nextP.exp;
      const safeNextLevelExp = isNaN(nextP.nextLevelExp) ? 100 : nextP.nextLevelExp;

      nextP.level += 1;
      nextP.exp = Math.max(0, safeExp - safeNextLevelExp);
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

  const pauseMenuStats = useMemo(
    () => ({
      totalKills: runStats.totalKills,
      maxStreak: ComboSystem.getMaxStreak(),
      totalBonusXp: 0,
    }),
    [runStats.totalKills]
  );

  const handleOpenSettings = useCallback(() => {
    setShowSettings(true);
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
            'relative h-screen w-full bg-slate-950 font-mono',
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

            {/* Auth Callback Handler - Priority Route */}
            {showAuthCallback ? (
              <AuthCallback
                onSuccess={needsProfile => {
                  setShowAuthCallback(false);
                  setShowLanding(false);
                  setNeedsNickname(needsProfile); // Set based on profile status from OAuth
                  localStorage.setItem('has_seen_landing', 'true');
                  window.history.replaceState(null, '', '/');
                }}
                onError={error => {
                  Logger.error('[App] Auth callback error:', { error });
                  setShowAuthCallback(false);
                  window.history.replaceState(null, '', '/');
                }}
              />
            ) : showLanding ? (
              <LandingPage
                onLaunch={handleLaunchGame}
                onViewPrivacy={() => {
                  setShowPrivacy(true);
                  window.history.pushState(null, '', '/privacy');
                }}
                onViewTerms={() => {
                  setShowTerms(true);
                  window.history.pushState(null, '', '/terms');
                }}
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
                          onBack={() => setShowLanding(true)}
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
                  setShowPrivacy(false);
                  if (window.location.pathname === '/privacy') {
                    window.history.pushState(null, '', '/');
                  }
                }}
                onViewTerms={() => {
                  setShowPrivacy(false);
                  setShowTerms(true);
                  window.history.pushState(null, '', '/terms');
                }}
              />
            )}
            {showTerms && (
              <TermsOfService
                onClose={() => {
                  setShowTerms(false);
                  if (window.location.pathname === '/terms') {
                    window.history.pushState(null, '', '/');
                  }
                }}
                onViewPrivacy={() => {
                  setShowTerms(false);
                  setShowPrivacy(true);
                  window.history.pushState(null, '', '/privacy');
                }}
              />
            )}
            {showDocs && (
              <DocScreen
                onClose={() => {
                  setShowDocs(false);
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
