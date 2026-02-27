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
import { UserPersistenceService } from './services/auth/UserPersistenceService';
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
import { getMarketRuntimeConfig } from './config/marketRuntime';

// Lazy load heavy components for performance optimization
import { GameEngine } from './components/GameEngine';
import { GameUI } from './components/GameUI';
import { SettingsPanel } from './components/settings/SettingsPanel';
import { MainMenu } from './components/screens/MainMenu';
import { HubMenu, type HubScreen } from './components/hub';
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

const HUB_SCREEN_STORAGE_KEY = 'ui_hub_screen';
const ACTIVE_SURFACE_STORAGE_KEY = 'ui_active_surface';
const LEGAL_PATHS = new Set(['/privacy', '/terms', '/docs']);
const HUB_SCREENS: readonly HubScreen[] = [
  'hub',
  'play',
  'stash',
  'loot',
  'skins',
  'ranks',
  'gear',
];
const START_OF_RUN_LIQUIDATION_GRACE_MS = 3_000;

const isHubScreen = (value: string | null): value is HubScreen => {
  return value !== null && HUB_SCREENS.includes(value as HubScreen);
};

const readPersistedHubScreen = (): HubScreen => {
  try {
    const storedScreen = window.sessionStorage.getItem(HUB_SCREEN_STORAGE_KEY);
    return isHubScreen(storedScreen) ? storedScreen : 'hub';
  } catch {
    // Ignore storage failures (e.g. private mode restrictions).
    return 'hub';
  }
};

const persistHubScreen = (screen: HubScreen): void => {
  try {
    window.sessionStorage.setItem(HUB_SCREEN_STORAGE_KEY, screen);
  } catch {
    // Ignore storage failures (e.g. private mode restrictions).
  }
};

const persistActiveSurface = (surface: 'landing' | 'app'): void => {
  try {
    window.sessionStorage.setItem(ACTIVE_SURFACE_STORAGE_KEY, surface);
  } catch {
    // Ignore storage failures (e.g. private mode restrictions).
  }
};

const readInitialLandingVisibility = (): boolean => {
  const searchParams = new URLSearchParams(window.location.search);

  // Deep links to legal/docs routes should open their own page, not landing.
  if (LEGAL_PATHS.has(window.location.pathname) || window.location.hash === '#docs') {
    return false;
  }

  // Dev/QA override: force landing with ?landing=1
  if (searchParams.get('landing') === '1') {
    return true;
  }

  // If user has already completed landing, always skip it by default.
  // Explicit query params (e.g. ?landing=1) still override this.
  if (localStorage.getItem('has_seen_landing') === 'true') {
    return false;
  }

  try {
    if (window.sessionStorage.getItem(ACTIVE_SURFACE_STORAGE_KEY) === 'landing') {
      return true;
    }
  } catch {
    // Ignore storage failures (e.g. private mode restrictions).
  }

  return true;
};

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
  const [hubScreen, setHubScreen] = useState<HubScreen>(() => readPersistedHubScreen());
  const [walletBalance, setWalletBalance] = useState<number>(0);
  const isGameOverProcessing = useRef(false);
  const frozenPnlRef = useRef<number>(0);
  const liquidationGraceUntilRef = useRef<number>(0);
  const marketRuntimeConfig = useMemo(() => getMarketRuntimeConfig(), []);

  // ========================================
  // Initialization & Utility Hooks
  // ========================================
  const { isInitialized } = useAppInitialization();
  const { showAnalytics: _showAnalytics, showAdminDashboard: _showAdminDashboard } =
    useDevShortcuts();
  const [showLanding, setShowLanding] = useState(() => readInitialLandingVisibility());
  const tutorial = useTutorial({ enabled: !showLanding });
  const { t, language } = useLanguage();
  const { isRetro } = useTheme();

  // Landing & Legal State
  const [legalRoute, setLegalRoute] = useState({
    showPrivacy: false,
    showTerms: false,
    showDocs: false,
  });
  const [identityState, setIdentityState] = useState({
    isReady: false,
    hasNickname: false,
  });
  const { showPrivacy, showTerms, showDocs } = legalRoute;
  const { isReady: isIdentityReady, hasNickname } = identityState;

  // Handle Hash and Path Navigation for Docs and Legal
  useEffect(() => {
    const handleNavigation = () => {
      const isHashDocs = window.location.hash === '#docs';
      const path = window.location.pathname;

      setLegalRoute({
        showDocs: isHashDocs || path === '/docs',
        showPrivacy: path === '/privacy',
        showTerms: path === '/terms',
      });
    };

    window.addEventListener('hashchange', handleNavigation);
    window.addEventListener('popstate', handleNavigation); // Handle back/forward and pushState
    handleNavigation(); // Check on initial load

    return () => {
      window.removeEventListener('hashchange', handleNavigation);
      window.removeEventListener('popstate', handleNavigation);
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    const initIdentity = async () => {
      let isReady = false;
      let hasNicknameVal = false;
      try {
        const user = await UserPersistenceService.initialize();
        if (!cancelled) {
          hasNicknameVal = Boolean(user?.nickname);
        }
      } catch {
        if (!cancelled) {
          hasNicknameVal = Boolean(UserSessionService.getNickname());
        }
      } finally {
        if (!cancelled) {
          isReady = true;
          setIdentityState({ isReady, hasNickname: hasNicknameVal });
        }
      }
    };

    void initIdentity();

    return () => {
      cancelled = true;
    };
  }, []);

  const handleLaunchGame = useCallback(() => {
    persistActiveSurface('app');
    setShowLanding(false);
    localStorage.setItem('has_seen_landing', 'true');
  }, []);

  const handleReturnToLanding = useCallback(() => {
    // User explicitly requested landing; keep it sticky across refresh.
    localStorage.removeItem('has_seen_landing');
    persistActiveSurface('landing');
    setShowLanding(true);
    setLegalRoute({ showDocs: false, showPrivacy: false, showTerms: false });
    if (window.location.pathname !== '/' || window.location.hash) {
      window.history.pushState(null, '', '/');
    }
  }, []);

  useEffect(() => {
    persistHubScreen(hubScreen);
  }, [hubScreen]);

  useEffect(() => {
    persistActiveSurface(showLanding ? 'landing' : 'app');
  }, [showLanding]);

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

  // ========================================
  // Callbacks
  // ========================================
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
    frozenPnlRef.current = 0;
    void WalletService.getInstance()
      .getBalance()
      .then(b => setWalletBalance(b));
  }, [resetPlayer, resetRunStats]);

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
          setIdentityState(prev => ({ ...prev, hasNickname: false }));
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
      liquidationGraceUntilRef.current = Date.now() + START_OF_RUN_LIQUIDATION_GRACE_MS;

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

      // Capture P/L at the moment of death so it stays fixed on the Game Over screen
      frozenPnlRef.current = marketData.pnl;

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
    if (gameStatus !== GameStatus.PLAYING) return;
    if (Date.now() < liquidationGraceUntilRef.current) return;

    if (marketData.effectivePnl <= -1) {
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
                  setLegalRoute(prev => ({
                    ...prev,
                    showPrivacy: true,
                    showTerms: false,
                  }));
                  window.history.pushState(null, '', '/privacy');
                }}
                onViewTerms={() => {
                  setLegalRoute(prev => ({
                    ...prev,
                    showTerms: true,
                    showPrivacy: false,
                  }));
                  window.history.pushState(null, '', '/terms');
                }}
              />
            ) : (
              <>
                <NotificationSystem />
                {shouldShowNicknameEntry && (
                  <NicknameEntryScreen
                    onComplete={() => {
                      setIdentityState(prev => ({ ...prev, hasNickname: true }));
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
                          if (screen === 'gear') setShowSettings(true);
                          else if (screen === 'hub') setHubScreen('hub');
                          else setHubScreen(screen);
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
                  setLegalRoute(prev => ({ ...prev, showPrivacy: false }));
                  if (window.location.pathname === '/privacy') {
                    window.history.pushState(null, '', '/');
                  }
                }}
                onViewTerms={() => {
                  setLegalRoute(prev => ({
                    ...prev,
                    showPrivacy: false,
                    showTerms: true,
                  }));
                  window.history.pushState(null, '', '/terms');
                }}
              />
            )}
            {showTerms && (
              <TermsOfService
                onClose={() => {
                  setLegalRoute(prev => ({ ...prev, showTerms: false }));
                  if (window.location.pathname === '/terms') {
                    window.history.pushState(null, '', '/');
                  }
                }}
                onViewPrivacy={() => {
                  setLegalRoute(prev => ({
                    ...prev,
                    showTerms: false,
                    showPrivacy: true,
                  }));
                  window.history.pushState(null, '', '/privacy');
                }}
              />
            )}
            {showDocs && (
              <DocScreen
                onClose={() => {
                  setLegalRoute(prev => ({ ...prev, showDocs: false }));
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
