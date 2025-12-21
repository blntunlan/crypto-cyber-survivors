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
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { MarketPosition, GameStatus, type LeverageOption } from './types';
import { type CryptoPair } from './types/crypto';
import { CardSystem, type Card } from './services/CardSystem';
import { audio } from './services/audioService';
import { EventBus } from './services/EventBus';
import { GameEndReason } from './types/metrics';
import { MetricsService } from './services/MetricsService';
import { GameStateManager } from './services/GameStateManager';
import { MilestoneService } from './services/MilestoneService';
import { DifficultyManager } from './services/DifficultyManager';
import { GameStateMachine } from './services/GameStateMachine';
import { DeviceBenchmarkService } from './services/DeviceBenchmarkService';
import { ImagePreloader } from './services/ImagePreloader';

// Custom hooks
import { useDevice } from './hooks/useDevice';
import { useMarketData } from './hooks/useMarketData';
import { usePlayerState } from './hooks/usePlayerState';
import { useWindowDimensions } from './hooks/useWindowDimensions';
import { useGameStatus } from './hooks/useGameStatus';
import { useRunStats } from './hooks/useRunStats';
import { useSessionTiming } from './hooks/useSessionTiming';
import { useCheatManager } from './hooks/useCheatManager';

// Lazy load heavy components for performance optimization
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
const MetricsDebugPanel = React.lazy(() =>
  import('./components/MetricsDebugPanel').then(m => ({ default: m.MetricsDebugPanel }))
);
const ComboDebugPanel = React.lazy(() =>
  import('./components/ComboDebugPanel').then(m => ({ default: m.ComboDebugPanel }))
);
const ParticleDebugPanel = React.lazy(() =>
  import('./components/ParticleDebugPanel').then(m => ({ default: m.ParticleDebugPanel }))
);

// Fallback components
const FallbackLoader = () => (
  <div className="absolute inset-0 flex items-center justify-center bg-slate-950 text-yellow-500 font-mono text-sm tracking-widest animate-pulse">
    LOADING ENGINE...
  </div>
);
const UIFallback = () => null;

// Preload card images AFTER initial render (non-blocking)
setTimeout(() => void ImagePreloader.preloadAll(), 1000);

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

  // ========================================
  // Initialization Effects
  // ========================================
  useEffect(() => {
    void DeviceBenchmarkService.runBenchmark();
  }, []);

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
      if (marketData.price === 0) return;

      resetPlayer();
      setLeverage(selectedLeverage);
      GameStateManager.initializeNewGame(choice, marketData.price, selectedLeverage, selectedPair);
      setPosition(choice);
      setEntryPrice(marketData.price);
      setPositionColor(choice);
      GameStateMachine.transition(GameStatus.PLAYING);
      MilestoneService.startSession();
      audio.playLevelUp();
    },
    [
      marketData.price,
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
      const nextP = card.effect(p);
      nextP.level += 1;
      nextP.exp -= nextP.nextLevelExp;
      nextP.nextLevelExp = Math.floor(nextP.nextLevelExp * 1.5);

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

  const handleGameOver = useCallback(() => {
    setFinalPnl(marketData.pnl);
    setFinalSurvivalTime(DifficultyManager.getTotalElapsedSeconds());
    GameStateMachine.transition(GameStatus.GAMEOVER);

    MetricsService.endSession(GameEndReason.DEATH, {
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
    });
  }, [marketData, playerRef, position, entryPrice, leverage, runStats.totalKills]);

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

      {/* Game Engine */}
      <React.Suspense fallback={<FallbackLoader />}>
        <GameEngine
          status={gameStatus}
          position={position}
          marketData={marketData}
          onGameOver={handleGameOver}
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
          />
        </React.Suspense>
      )}

      {showSettings && (
        <React.Suspense fallback={<UIFallback />}>
          <SettingsPanel onClose={() => setShowSettings(false)} />
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
    </div>
  );
};

export default App;
