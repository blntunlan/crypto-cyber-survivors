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

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { MarketPosition, GameStatus, type LeverageOption } from './types';
import { type CryptoPair } from './types/crypto';
import { type Card } from './services/cards/types';
import { PLAYER_STATS } from './config/PlayerConfig';
import { applyCardEffect } from './services/cards/CardApplicator';
import { CardSystem } from './services/cards/CardSystem';
import { audio } from './services/AudioService';
import { EventBus } from './services/EventBus';
import { GameEndReason } from './types/metrics';
import { MetricsService } from './services/MetricsService';
import { GameMode, type CycleCompleteData } from './types/gameMode';
import { CoinService } from './services/CoinService';
import { GameStateManager } from './services/GameStateManager';
import { MilestoneService } from './services/MilestoneService';
import { DifficultyManager } from './services/DifficultyManager';
import { GameStateMachine } from './services/GameStateMachine';
import { ImagePreloader } from './services/ImagePreloader';
import { Logger } from './services/Logger';

// Custom hooks
import { useDevice } from './hooks/useDevice';
import { useMarketData } from './hooks/useMarketData';
import { usePlayerState } from './hooks/usePlayerState';
import { useWindowDimensions } from './hooks/useWindowDimensions';
import { useGameStatus } from './hooks/useGameStatus';
import { useRunStats } from './hooks/useRunStats';
import { useSessionTiming } from './hooks/useSessionTiming';
import { useCheatManager } from './hooks/useCheatManager';
import { useAppInitialization } from './hooks/useAppInitialization';
import { useBeforeUnload } from './hooks/useBeforeUnload';
import { useDevShortcuts } from './hooks/useDevShortcuts';
import { useMarketTimeout } from './hooks/useMarketTimeout';
import { ThemeProvider } from './contexts/ThemeContext';

// Lazy load heavy components for performance optimization
const NicknameEntryScreen = React.lazy(() =>
  import('./components/screens/NicknameEntryScreen').then(m => ({
    default: m.NicknameEntryScreen,
  }))
);
const GameEngine = React.lazy(() =>
  import('./components/GameEngine').then(m => ({ default: m.GameEngine }))
);
const GameUI = React.lazy(() => import('./components/GameUI').then(m => ({ default: m.GameUI })));
const SettingsPanel = React.lazy(() =>
  import('./components/SettingsPanel').then(m => ({ default: m.SettingsPanel }))
);
const MainMenu = React.lazy(() =>
  import('./components/screens/MainMenu').then(m => ({ default: m.MainMenu }))
);
const LevelUpScreen = React.lazy(() =>
  import('./components/screens/LevelUpScreen').then(m => ({ default: m.LevelUpScreen }))
);
const PauseMenu = React.lazy(() =>
  import('./components/screens/PauseMenu').then(m => ({ default: m.PauseMenu }))
);
const GameOverScreen = React.lazy(() =>
  import('./components/screens/GameOverScreen').then(m => ({ default: m.GameOverScreen }))
);
const CycleCompleteScreen = React.lazy(() =>
  import('./components/screens/CycleCompleteScreen').then(m => ({
    default: m.CycleCompleteScreen,
  }))
);
const MetricsDebugPanel = React.lazy(() =>
  import('./components/MetricsDebugPanel').then(m => ({ default: m.MetricsDebugPanel }))
);
const ComboDebugPanel = React.lazy(() =>
  import('./components/ComboDebugPanel').then(m => ({ default: m.ComboDebugPanel }))
);
const ParticleDebugPanel = React.lazy(() =>
  import('./components/ParticleDebugPanel').then(m => ({ default: m.ParticleDebugPanel }))
);
const AnalyticsDashboard = React.lazy(() =>
  import('./components/admin/AnalyticsDashboard').then(m => ({ default: m.AnalyticsDashboard }))
);
const AdminDashboard = React.lazy(() =>
  import('./components/admin/AdminDashboard').then(m => ({ default: m.AdminDashboard }))
);
const LeaderboardPanel = React.lazy(() =>
  import('./components/hud/LeaderboardPanel').then(m => ({ default: m.LeaderboardPanel }))
);
const DebugPanel = React.lazy(() =>
  import('./components/DebugPanel').then(m => ({ default: m.DebugPanel }))
);
const MarketDisconnectedScreen = React.lazy(() =>
  import('./components/screens/MarketDisconnectedScreen').then(m => ({
    default: m.MarketDisconnectedScreen,
  }))
);

// Fallback components
const FallbackLoader = () => (
  <div className="absolute inset-0 flex items-center justify-center bg-slate-950 text-yellow-500 font-mono text-sm tracking-widest animate-pulse">
    LOADING ENGINE...
  </div>
);
const UIFallback = () => null;

// Preload card images AFTER initial render (non-blocking)
setTimeout(() => {
  void ImagePreloader.preloadAll();
}, 1000);

const App: React.FC = () => {
  // ========================================
  // Custom Hooks
  // ========================================
  const device = useDevice();
  const dimensions = useWindowDimensions();
  const { gameStatus, handlePauseToggle } = useGameStatus();
  const { runStats, resetRunStats } = useRunStats();
  const { sessionStartTime } = useSessionTiming(gameStatus);

  // ========================================
  // Local State
  // ========================================
  const [position, setPosition] = useState<MarketPosition>(MarketPosition.LONG);
  const [entryPrice, setEntryPrice] = useState<number>(0);
  const [upgradeChoices, setUpgradeChoices] = useState<Card[]>([]);
  const [finalPnl, setFinalPnl] = useState<number>(0);
  const [isMuted, setIsMuted] = useState<boolean>(audio.getMuted());
  const [showSettings, setShowSettings] = useState<boolean>(false);
  const [finalSurvivalTime, setFinalSurvivalTime] = useState<number>(0);
  const [leverage, setLeverage] = useState<LeverageOption>(10);
  const [selectedPair, setSelectedPair] = useState<CryptoPair>('BTC');
  const [gameMode, setGameMode] = useState<GameMode>(GameMode.COMPETITIVE);
  const [cycleData, setCycleData] = useState<CycleCompleteData | null>(null);

  // ========================================
  // Initialization & Utility Hooks (refactored from inline useEffects)
  // ========================================
  const { needsNickname, setNeedsNickname } = useAppInitialization();
  const { showAnalytics, showAdminDashboard, closeAnalytics, closeAdminDashboard } =
    useDevShortcuts();

  // Handle tab close warning during gameplay
  useBeforeUnload(gameStatus);

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

  // Handle market data timeout (pauses game if feed disconnects)
  useMarketTimeout({
    playerRef,
  });

  // ========================================
  // Callbacks
  // ========================================
  const handleNicknameComplete = useCallback(
    (nickname: string) => {
      setNeedsNickname(false);
      Logger.info(`Signed in as ${nickname}`);

      // Refresh player tracker with new nickname
      void import('./services/analytics/PlayerTracker').then(({ default: playerTracker }) => {
        void playerTracker.refresh();
      });
    },
    [setNeedsNickname]
  );

  // ========================================
  // Game Actions
  // ========================================
  const handleLevelUp = useCallback(() => {
    healFull();
    GameStateMachine.transition(GameStatus.LEVEL_UP);
    const choices = CardSystem.generateChoices(playerRef.current.luck, playerRef.current.level);
    setUpgradeChoices(choices);
    audio.playLevelUp();
  }, [healFull, playerRef]);

  const resetGame = useCallback(() => {
    GameStateManager.resetAll();
    GameStateMachine.forceState(GameStatus.MENU);
    setEntryPrice(0);
    setFinalPnl(0);
    resetRunStats();
    resetPlayer();
  }, [resetPlayer, resetRunStats]);

  const startGame = useCallback(
    (choice: MarketPosition, selectedLeverage: LeverageOption) => {
      if (marketData.price === 0 || gameStatus !== GameStatus.MENU) return;

      resetPlayer();
      setLeverage(selectedLeverage);
      CoinService.resetSession();
      GameStateManager.initializeNewGame(choice, marketData.price, selectedLeverage, selectedPair);
      setPosition(choice);
      setEntryPrice(marketData.price);
      setPositionColor(choice);
      GameStateMachine.transition(GameStatus.PLAYING);
      MilestoneService.startSession();
      audio.playLevelUp();

      // Start performance tracking
      void import('./services/analytics/PerformanceTracker').then(({ PerformanceTracker }) => {
        PerformanceTracker.getInstance().start();
      });
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
    ]
  );

  const selectUpgrade = useCallback(
    (card: Card) => {
      const p = playerRef.current;
      const nextP = applyCardEffect(p, card);
      nextP.level += 1;
      nextP.exp -= nextP.nextLevelExp;
      nextP.nextLevelExp = Math.floor(nextP.nextLevelExp * PLAYER_STATS.LEVEL_EXP_MULTIPLIER);

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
    [playerRef, setUiStats, handleLevelUp]
  );

  const handleGameOver = useCallback(
    async (reason: GameEndReason = GameEndReason.DEATH) => {
      setFinalPnl(marketData.effectivePnl);
      setFinalSurvivalTime(DifficultyManager.getTotalElapsedSeconds());
      GameStateMachine.transition(GameStatus.GAMEOVER);

      // Stop performance tracking and get results
      const { PerformanceTracker } = await import('./services/analytics/PerformanceTracker');
      const { DeviceProfiler } = await import('./services/analytics/DeviceProfiler');

      const tracker = PerformanceTracker.getInstance();
      tracker.stop();
      const perfStats = tracker.getStats();

      MetricsService.endSession(reason, {
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
        // Pass performance stats
        avgFps: perfStats.avgFps,
        minFps: perfStats.minFps,
        deviceFingerprint: DeviceProfiler.getFingerprint(),
      });
    },
    [marketData, playerRef, position, entryPrice, leverage, runStats.totalKills]
  );

  // Handle liquidation (ends game if effective PnL hits -100%)
  useEffect(() => {
    if (gameStatus === GameStatus.PLAYING && marketData.effectivePnl <= -1) {
      Logger.warn(`[Liquidation] Player liquidated at price ${marketData.price}`);
      void handleGameOver(GameEndReason.LIQUIDATION);
    }
  }, [gameStatus, marketData.effectivePnl, handleGameOver, marketData.price]);

  // Handle cycle completion
  useEffect(() => {
    const handleCycleComplete = (data: { cycleNumber: number; totalElapsedSeconds: number }) => {
      if (gameMode === GameMode.COMPETITIVE) {
        setCycleData({
          cycleNumber: data.cycleNumber,
          survivalTimeSeconds: data.totalElapsedSeconds,
          totalKills: runStats.totalKills,
          level: playerRef.current.level,
          pnl: marketData.pnl,
          effectivePnl: marketData.effectivePnl,
          coinsEarned: 0, // Calculated in UI
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
        maxStreak: 0,
      });
      await CoinService.creditCoins(calc.total, 'cycle_complete');
      void handleGameOver(GameEndReason.DEATH); // Reusing death as generic session end
    }
  }, [cycleData, handleGameOver]);

  const handleContinue = useCallback(() => {
    setCycleData(null);
    GameStateMachine.transition(GameStatus.PLAYING);
  }, []);

  // ========================================
  // Cheat Manager Integration
  // ========================================
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

  // ========================================
  // Render
  // ========================================
  return (
    <ThemeProvider>
      <div className="relative w-full h-screen overflow-hidden bg-slate-950 font-mono">
        {/* Game UI Overlay */}
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

        {/* Nickname Entry - Initial Login */}
        {needsNickname && (
          <React.Suspense fallback={<FallbackLoader />}>
            <NicknameEntryScreen onComplete={handleNicknameComplete} />
          </React.Suspense>
        )}

        {/* Game Engine */}
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
            sessionStartTime={sessionStartTime}
            width={dimensions.width}
            height={dimensions.height}
          />
        </React.Suspense>

        {/* Screen Overlays */}
        {gameStatus === GameStatus.MENU && (
          <React.Suspense fallback={<UIFallback />}>
            <MainMenu
              price={marketData.price}
              onStart={startGame}
              onOpenSettings={() => setShowSettings(true)}
              selectedPair={selectedPair}
              onPairChange={setSelectedPair}
              selectedMode={gameMode}
              onModeChange={setGameMode}
            />
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

        {/* Leaderboard Panel - Desktop only, visible in MENU */}
        {gameStatus === GameStatus.MENU && (
          <React.Suspense fallback={null}>
            <LeaderboardPanel />
          </React.Suspense>
        )}

        {showSettings && (
          <React.Suspense fallback={<UIFallback />}>
            <SettingsPanel
              onClose={() => setShowSettings(false)}
              isInGame={gameStatus !== GameStatus.MENU}
            />
          </React.Suspense>
        )}

        {gameStatus === GameStatus.LEVEL_UP && (
          <React.Suspense fallback={<UIFallback />}>
            <LevelUpScreen upgradeChoices={upgradeChoices} onSelect={selectUpgrade} />
          </React.Suspense>
        )}

        {gameStatus === GameStatus.PAUSED && (
          <React.Suspense fallback={<UIFallback />}>
            <PauseMenu
              sessionStartTime={sessionStartTime}
              runStats={runStats}
              onResume={() => GameStateMachine.transition(GameStatus.PLAYING)}
              onRestart={resetGame}
              onMainMenu={resetGame}
              onOpenSettings={() => setShowSettings(true)}
              isMuted={isMuted}
              onToggleMute={() => setIsMuted(audio.toggleMute())}
            />
          </React.Suspense>
        )}

        {gameStatus === GameStatus.GAMEOVER && (
          <React.Suspense fallback={<UIFallback />}>
            <GameOverScreen
              level={uiStats.level}
              finalPnl={finalPnl}
              survivalTime={finalSurvivalTime}
              kills={runStats.totalKills}
              onRestart={resetGame}
            />
          </React.Suspense>
        )}

        {/* Debug Panels - Desktop only */}
        {!device.isMobile && (
          <React.Suspense fallback={<UIFallback />}>
            <MetricsDebugPanel />
            <ComboDebugPanel />
            <ParticleDebugPanel />
          </React.Suspense>
        )}

        {/* Analytics Dashboard - DEV ONLY (Ctrl+Shift+A) */}
        {import.meta.env.DEV && showAnalytics && (
          <React.Suspense fallback={<FallbackLoader />}>
            <AnalyticsDashboard />
            <button
              onClick={closeAnalytics}
              className="fixed top-4 right-4 z-[110] px-3 py-1 bg-red-600/80 hover:bg-red-500 rounded text-white text-sm"
            >
              ✕ Close (Ctrl+Shift+A)
            </button>
          </React.Suspense>
        )}

        {/* Admin Dashboard - DEV ONLY (Ctrl+Shift+D) */}
        {import.meta.env.DEV && showAdminDashboard && (
          <React.Suspense fallback={<FallbackLoader />}>
            <AdminDashboard onClose={closeAdminDashboard} />
          </React.Suspense>
        )}

        {/* Debug Panel - DEV ONLY (Desktop only) */}
        {import.meta.env.DEV && !device.isMobile && (
          <React.Suspense fallback={null}>
            <DebugPanel />
          </React.Suspense>
        )}
      </div>
    </ThemeProvider>
  );
};

export default App;
