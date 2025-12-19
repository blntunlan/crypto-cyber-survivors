import React, { useState, useEffect, useCallback } from 'react';
import { MarketPosition, GameStatus, LeverageOption } from './types';
import { CardSystem, Card } from './services/CardSystem';
import { GameEngine } from './components/GameEngine';
import { GameUI } from './components/GameUI';
import { audio } from './services/audioService';
import { CheatManager } from './services/CheatManager';
import { EventBus } from './services/EventBus';
import { ComboSystem } from './services/ComboSystem';
import { GameEndReason } from './types/metrics';
import { MetricsService } from './services/MetricsService';
import { GameStateManager, RUN_STATS_DEFAULTS } from './services/GameStateManager';
import { SettingsPanel } from './components/SettingsPanel';
import { MainMenu } from './components/screens/MainMenu';
import { LevelUpScreen } from './components/screens/LevelUpScreen';
import { PauseMenu } from './components/screens/PauseMenu';
import { GameOverScreen } from './components/screens/GameOverScreen';
import { useMarketData } from './hooks/useMarketData';
import { usePlayerState } from './hooks/usePlayerState';
import { MetricsDebugPanel } from './components/MetricsDebugPanel';
import { ComboDebugPanel } from './components/ComboDebugPanel';
import { MilestoneService } from './services/MilestoneService';
import { useDevice } from './hooks/useDevice';
import { DifficultyManager } from './services/DifficultyManager';
import { GameStateMachine } from './services/GameStateMachine';
import { ImagePreloader } from './services/ImagePreloader';

// Preload card images AFTER initial render (non-blocking)
setTimeout(() => ImagePreloader.preloadAll(), 1000);

const App: React.FC = () => {
  // Device detection for platform-specific behavior
  const device = useDevice();

  const [dimensions, setDimensions] = useState({
    width: window.innerWidth,
    height: window.innerHeight,
  });
  const [gameStatus, setGameStatus] = useState<GameStatus>(GameStatus.MENU);
  const [position, setPosition] = useState<MarketPosition>(MarketPosition.LONG);
  const [entryPrice, setEntryPrice] = useState<number>(0);
  const [upgradeChoices, setUpgradeChoices] = useState<Card[]>([]);
  const [finalPnl, setFinalPnl] = useState<number>(0);
  const [isMuted, setIsMuted] = useState<boolean>(audio.getMuted());
  const [showSettings, setShowSettings] = useState<boolean>(false);
  const [sessionStartTime, setSessionStartTime] = useState<number>(0);
  const [runStats, setRunStats] = useState({
    totalKills: 0,
    maxStreak: 0,
    totalBonusXp: 0,
  });
  const [finalSurvivalTime, setFinalSurvivalTime] = useState<number>(0);
  const [leverage, setLeverage] = useState<LeverageOption>(10);

  const {
    playerRef,
    uiStats,
    setUiStats,
    resetPlayer,
    healFull,
    setPositionColor,
  } = usePlayerState(dimensions.width, dimensions.height);

  const { marketData } = useMarketData(gameStatus, position, entryPrice, leverage, playerRef);

  useEffect(() => {
    const handleResize = () => {
      setDimensions({ width: window.innerWidth, height: window.innerHeight });
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Sync session timing
  useEffect(() => {
    if (gameStatus === GameStatus.PLAYING && sessionStartTime === 0) {
      setSessionStartTime(Date.now());
    }
    if (gameStatus === GameStatus.MENU) {
      setSessionStartTime(0);
    }
  }, [gameStatus, sessionStartTime]);

  useEffect(() => {
    const unsub = EventBus.on('comboUpdate', () => {
      const state = ComboSystem.getState();
      setRunStats({
        totalKills: state.totalKills,
        maxStreak: state.maxStreak,
        totalBonusXp: state.totalBonusXp,
      });
    });
    return () => unsub();
  }, []);

  // Subscribe to GameStateMachine for state sync
  useEffect(() => {
    const unsub = GameStateMachine.subscribe((newState) => {
      setGameStatus(newState);
    });
    return () => unsub();
  }, []);

  const handlePauseToggle = useCallback(() => {
    if (gameStatus === GameStatus.PLAYING) {
      GameStateMachine.transition(GameStatus.PAUSED);
    } else if (gameStatus === GameStatus.PAUSED) {
      GameStateMachine.transition(GameStatus.PLAYING);
    }
  }, [gameStatus]);

  useEffect(() => {
    const handleGlobalKeys = (e: KeyboardEvent) => {
      if (e.key === 'Escape' || e.key === 'p') handlePauseToggle();
    };
    window.addEventListener('keydown', handleGlobalKeys);
    return () => window.removeEventListener('keydown', handleGlobalKeys);
  }, [handlePauseToggle]);

  // Auto-pause when tab loses focus (prevents rAF throttling issues)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden && gameStatus === GameStatus.PLAYING) {
        GameStateMachine.transition(GameStatus.PAUSED);
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [gameStatus]);

  const handleLevelUp = useCallback(() => {
    healFull();
    GameStateMachine.transition(GameStatus.LEVEL_UP);
    const choices = CardSystem.generateChoices(playerRef.current.luck, playerRef.current.level);
    setUpgradeChoices(choices);
    audio.playLevelUp();
  }, [healFull, playerRef]);

  const resetGame = useCallback(() => {
    // Reset all game systems via centralized manager
    GameStateManager.resetAll();

    // Transition to menu via state machine
    GameStateMachine.forceState(GameStatus.MENU);

    // Reset local UI state
    setEntryPrice(0);
    setFinalPnl(0);
    setRunStats({ ...RUN_STATS_DEFAULTS });

    // Reset player state (handled separately for React state sync)
    resetPlayer();
  }, [resetPlayer]);

  const startGame = (choice: MarketPosition, selectedLeverage: LeverageOption) => {
    if (marketData.price === 0) return;

    // Reset player to fresh state
    resetPlayer();

    // Set leverage for this session
    setLeverage(selectedLeverage);

    // Initialize new game session via centralized manager
    // This handles: DifficultyManager, ComboSystem, MetricsService
    GameStateManager.initializeNewGame(choice, marketData.price, selectedLeverage);

    // Set local state for this game session
    setPosition(choice);
    setEntryPrice(marketData.price);
    setPositionColor(choice);
    GameStateMachine.transition(GameStatus.PLAYING);
    setSessionStartTime(Date.now());
    MilestoneService.startSession();
    audio.playLevelUp();
  };

  const selectUpgrade = (card: Card) => {
    const p = playerRef.current;
    const nextP = card.effect(p);
    nextP.level += 1;
    nextP.exp -= nextP.nextLevelExp;
    nextP.nextLevelExp = Math.floor(nextP.nextLevelExp * 1.5);

    // Track card selection in metrics
    MetricsService.trackLevelUp(nextP.level, card.name, card.tier);

    playerRef.current = nextP;
    setUiStats({ ...nextP });

    // Emit level up complete for milestone tracking
    EventBus.emit('levelUpComplete', { newLevel: nextP.level });

    if (nextP.exp >= nextP.nextLevelExp) {
      handleLevelUp();
    } else {
      GameStateMachine.transition(GameStatus.PLAYING);
    }
  };

  // CheatManager Integration
  useEffect(() => {
    CheatManager.init({
      onLevelUp: () => {
        if (gameStatus === GameStatus.PLAYING) handleLevelUp();
      },
      onHeal: healFull,
      onKillAll: () => EventBus.emit('killAll', {}),
      onToggleGodMode: () => { },
      onSetLuck: (luck) => {
        playerRef.current.luck = luck;
        setUiStats({ ...playerRef.current });
      },
      onAddExp: (amount) => {
        playerRef.current.exp += amount;
        setUiStats({ ...playerRef.current });
        if (playerRef.current.exp >= playerRef.current.nextLevelExp && gameStatus === GameStatus.PLAYING) {
          handleLevelUp();
        }
      },
      onRestart: resetGame,
      onAddComboKill: (count) => {
        for (let i = 0; i < count; i++) {
          EventBus.emit('enemyKilled', { x: 0, y: 0, type: 'cheat', isCrit: false });
        }
      },
    });
    return () => CheatManager.destroy();
  }, [gameStatus, handleLevelUp, healFull, setUiStats, resetGame, playerRef]);

  return (
    <div className="relative w-full h-screen overflow-hidden bg-slate-950 font-mono">
      {/* Background UI always active or contextual */}
      {gameStatus !== GameStatus.MENU && (
        <GameUI
          position={position}
          entryPrice={entryPrice}
          marketData={marketData}
          player={uiStats}
          onTogglePause={handlePauseToggle}
          status={gameStatus}
        />
      )}

      <GameEngine
        status={gameStatus}
        position={position}
        marketData={marketData}
        onGameOver={() => {
          setFinalPnl(marketData.pnl);
          setFinalSurvivalTime(DifficultyManager.getTotalElapsedSeconds());
          GameStateMachine.transition(GameStatus.GAMEOVER);

          // End metrics session with all final data
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
              critDamage: playerRef.current.critChance * 2, // Estimate based on critChance
            },
            position,
            entryPrice,
            leverage,
            totalKills: runStats.totalKills,
          });
        }}
        onLevelUp={handleLevelUp}
        updatePlayerStats={setUiStats}
        playerRef={playerRef}
        sessionStartTime={sessionStartTime}
        width={dimensions.width}
        height={dimensions.height}
      />

      {/* States UI Overlays */}
      {gameStatus === GameStatus.MENU && (
        <MainMenu
          price={marketData.price}
          onStart={startGame}
          onOpenSettings={() => setShowSettings(true)}
        />
      )}

      {showSettings && <SettingsPanel onClose={() => setShowSettings(false)} />}

      {gameStatus === GameStatus.LEVEL_UP && (
        <LevelUpScreen upgradeChoices={upgradeChoices} onSelect={selectUpgrade} />
      )}

      {gameStatus === GameStatus.PAUSED && (
        <PauseMenu
          sessionStartTime={sessionStartTime}
          runStats={runStats}
          onResume={() => setGameStatus(GameStatus.PLAYING)}
          onRestart={resetGame}
          onMainMenu={() => setGameStatus(GameStatus.MENU)}
          onOpenSettings={() => setShowSettings(true)}
          isMuted={isMuted}
          onToggleMute={() => setIsMuted(audio.toggleMute())}
        />
      )}

      {gameStatus === GameStatus.GAMEOVER && (
        <GameOverScreen
          level={uiStats.level}
          finalPnl={finalPnl}
          survivalTime={finalSurvivalTime}
          kills={runStats.totalKills}
          onRestart={resetGame}
        />
      )}

      {/* Debug Panels - Desktop only */}
      {!device.isMobile && (
        <>
          <MetricsDebugPanel />
          <ComboDebugPanel />
        </>
      )}

      {/* Mobile Orientation Lock Overlay - Disabled for now, evaluate after touch controls
      {device.isMobile && (
        <div className="orientation-lock-overlay">
          <div className="rotate-icon">📱</div>
          <div className="message">
            Please rotate your device to landscape mode for the best experience
          </div>
        </div>
      )}
      */}

    </div>
  );
};

export default App;
