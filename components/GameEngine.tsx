import React, { useRef, useEffect } from 'react';
import {
  type MarketPosition,
  type MarketData,
  type Player,
  GameStatus,
  type GameState,
  type Candle,
} from '../types';
import { COLORS, GAME_ENGINE } from '../constants';
import { audio } from '../services/audioService';
import { PoolManager } from '../services/poolManager';
import { GameRenderer } from '../services/GameRenderer';
import { useGameInput } from '../hooks/useGameInput';
import { EventBus } from '../services/EventBus';
import { MetricsService } from '../services/MetricsService';
import { DifficultyManager } from '../services/DifficultyManager';
import { ComboSystem } from '../services/ComboSystem';
import { TimeService } from '../services/TimeService';
import { GAME_STATE_DEFAULTS } from '../services/GameStateManager';
import { getHUDLayout } from '../config/UILayout';
import { useGameStore, selectGraphics } from '../stores/gameStore';

import { PhysicsSystem } from '../services/PhysicsSystem';
import { SpawnSystem } from '../services/SpawnSystem';
import { CombatSystem } from '../services/CombatSystem';
import { GameHUD } from './GameHUD';
import { MobileControls } from './mobile';
import { useDevice } from '../hooks/useDevice';
import { DeviceBenchmarkService } from '../services/DeviceBenchmarkService';
import { generateBackgroundCandles } from '../utils/backgroundCandles';
import { FPSMonitor } from '../services/FPSMonitor';
import { BuffManager } from '../services/patterns/decorators/BuffManager';
import { BuffGemSpawner } from '../services/spawners/BuffGemSpawner';
import { lerp } from '../utils/math';

interface GameEngineProps {
  status: GameStatus;
  position: MarketPosition;
  marketData: MarketData;
  onGameOver: () => void;
  onLevelUp: () => void;
  updatePlayerStats: (player: Player) => void;
  playerRef: React.RefObject<Player>;
  sessionStartTime: number;
  width: number;
  height: number;
}

// lerp imported from utils/math.ts

export const GameEngine: React.FC<GameEngineProps> = ({
  status,
  position,
  marketData,
  onGameOver,
  onLevelUp,
  updatePlayerStats,
  playerRef,
  sessionStartTime,
  width,
  height,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const requestRef = useRef<number | undefined>(undefined);
  const pool = useRef(new PoolManager());
  const renderer = useRef(new GameRenderer());
  const { getMovementVector, isSpacePressed, setTouchMovement, setTouchDash, consumeDash } =
    useGameInput();
  const device = useDevice();
  const mobileSettings = useGameStore(state => state.mobile);
  const graphicsSettings = useGameStore(selectGraphics);

  const state = useRef<GameState>({
    bgCandles: [] as Candle[],
    lastFireTime: 0,
    fireTimer: 0,
    spawnTimer: 0,
    shake: 0,
    critFlash: 0,
    critFlashColor: COLORS.CRIT,
    currentBg: { r: 2, g: 6, b: 23 },
    lastTime: 0,

    levelUpFreeze: 0,
    isDashing: false,
    dashTimer: 0,
    dashCooldownTimer: 0,
    dashTrail: [],
    dashTrailAccumulator: 0,
    isGameOverTriggered: false,
  });

  // Track last synced stats to prevent unnecessary re-renders in App.tsx
  const lastSyncedStats = useRef({
    hp: 0,
    exp: 0,
    level: 0,
  });

  useEffect(() => {
    // Start FPS monitor
    FPSMonitor.start();

    // Pre-warm object pools to prevent allocation stutters during gameplay
    const perfConfig = DeviceBenchmarkService.getPerformanceConfig();
    pool.current.preWarm({
      bullets: Math.round(80 * perfConfig.particleMultiplier),
      particles: Math.round(150 * perfConfig.particleMultiplier),
      gems: 20,
      texts: 30,
    });

    // Initial candle generation
    const updateCandles = () => {
      const config = DeviceBenchmarkService.getPerformanceConfig();
      state.current.bgCandles = generateBackgroundCandles(width, height, config);
    };

    updateCandles();

    // Listen for profile changes (adaptive performance)
    const unsubscribe = DeviceBenchmarkService.subscribe(() => {
      updateCandles();
    });

    return () => {
      FPSMonitor.stop();
      unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Clamp player to screen if dimensions change (e.g. resize while paused)
  useEffect(() => {
    const player = playerRef.current;
    player.x = Math.max(player.radius, Math.min(width - player.radius, player.x));
    player.y = Math.max(player.radius, Math.min(height - player.radius, player.y));
  }, [width, height, playerRef]);

  useEffect(() => {
    // Reset time trackers on any status change to prevent jumps/spikes
    state.current.lastTime = 0;

    // Handle MENU-specific cleanup (TimeService is now managed by GameStateMachine)
    if (status === GameStatus.MENU) {
      pool.current.clearAll();
      state.current.spawnTimer = 0;
      state.current.lastFireTime = 0;
      state.current.shake = 0;
      state.current.critFlash = 0;
      BuffManager.reset(); // Reset buffs on menu
    }

    // Initialize BuffManager when game starts
    if (status === GameStatus.PLAYING && !BuffManager.isInitialized()) {
      BuffManager.initialize(playerRef.current);
      BuffGemSpawner.initialize(width, height);
    }

    // Pause/Resume buff timers based on game status
    if (status === GameStatus.PAUSED || status === GameStatus.LEVEL_UP) {
      BuffManager.pause();
    } else if (status === GameStatus.PLAYING && BuffManager.isPaused()) {
      BuffManager.resume();
    }
  }, [status, playerRef, width, height]);

  // Listen for afterReset event from GameStateManager to fully reset all game state
  useEffect(() => {
    const unsub = EventBus.subscribe('afterReset', () => {
      // Clear all game entities
      pool.current.clearAll();

      // Reset state using centralized defaults
      Object.assign(state.current, {
        ...GAME_STATE_DEFAULTS,
        bgCandles: state.current.bgCandles, // Preserve background candles
        dashTrail: [], // Reset trail array
      });

      // Reset buff manager
      BuffManager.reset();
      BuffGemSpawner.reset();
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    const unsub = EventBus.subscribe('killAll', () => {
      state.current.shake = 20;
      audio.playHit();
      pool.current.activeEnemies.forEach(e => {
        e.health = 0;
      });
    });
    return () => unsub();
  }, []);

  const update = (time: number) => {
    const s = state.current;
    const player = playerRef.current;
    const p = pool.current;

    const deltaTime = TimeService.update(time);
    const dtFactor = deltaTime > 0 ? deltaTime / 16.67 : 0;
    s.lastTime = time;
    FPSMonitor.tick();

    if (status !== GameStatus.PAUSED) {
      renderer.current.updateBackgroundCandles(
        s,
        marketData.pnl,
        marketData.difficulty,
        dtFactor,
        width,
        height
      );
    }

    if (status === GameStatus.PLAYING) {
      // Handle Level Up Freeze
      if (s.levelUpFreeze > 0) {
        s.levelUpFreeze -= deltaTime;
        // Reset shake during level up screen
        s.shake = 0;
        s.critFlash = 0;
        if (s.levelUpFreeze <= 0) {
          onLevelUp();
        }
        // During freeze, we still want to draw but not update physics
        draw();
        requestRef.current = requestAnimationFrame(update);
        return;
      }

      if (s.shake > 0) s.shake *= Math.pow(GAME_ENGINE.SHAKE_DECAY, dtFactor);
      if (s.critFlash > 0) s.critFlash *= Math.pow(GAME_ENGINE.CRIT_FLASH_DECAY, dtFactor);

      // Update difficulty time-based factors
      DifficultyManager.update(deltaTime);

      // Update combo system
      ComboSystem.update();

      // Update buff manager (handles effect expiration)
      BuffManager.update();
      BuffManager.updateBaseStats(player);

      // Update buff gem spawner (spawns gems based on volatility)
      BuffGemSpawner.updateDimensions(width, height);
      BuffGemSpawner.update(marketData.difficulty, deltaTime);

      // Update metrics system
      const wavePhase = DifficultyManager.getWavePhase();
      const maxHp = 100 + (player.level - 1) * 10; // Base HP calculation
      const hpPercent = (player.hp / maxHp) * 100;
      MetricsService.update(deltaTime, {
        pnl: marketData.pnl,
        atr: 0.01, // ATR from market data if available
        difficulty: marketData.difficulty,
        wavePhase,
        hpPercent,
        enemyCount: p.activeEnemies.length,
      });

      // Dash Logic Timers
      if (s.dashTimer > 0) {
        s.dashTimer -= deltaTime;
        if (s.dashTimer <= 0) s.isDashing = false;

        // Add current position to trail
        s.dashTrail.push({ x: player.x, y: player.y });
        if (s.dashTrail.length > 8) s.dashTrail.shift();
      } else {
        // Fade out trail - frame-rate independent using accumulator
        if (s.dashTrail.length > 0) {
          s.dashTrailAccumulator += dtFactor;
          while (s.dashTrailAccumulator >= 1) {
            if (s.dashTrail.length > 0) {
              s.dashTrail.shift();
            }
            s.dashTrailAccumulator -= 1;
          }
        } else {
          s.dashTrailAccumulator = 0;
        }
      }
      if (s.dashCooldownTimer > 0) {
        s.dashCooldownTimer -= deltaTime;
      }

      const { dx, dy } = getMovementVector();

      // Handle Dash Trigger
      if (isSpacePressed() && s.dashCooldownTimer <= 0 && (dx !== 0 || dy !== 0)) {
        s.isDashing = true;
        s.dashTimer = GAME_ENGINE.DASH_DURATION;
        s.dashCooldownTimer = GAME_ENGINE.DASH_COOLDOWN;
        audio.playDash();
        consumeDash();
      }

      if (dx !== 0 || dy !== 0) {
        const mag = Math.hypot(dx, dy);
        let speedMult = 1;

        // Support analog move: if mag < 1 (joystick), move slower.
        // If mag > 1 (keyboard diagonals), normalize to 1.
        let inputFactor = Math.min(1, mag);

        if (s.isDashing) {
          speedMult = GAME_ENGINE.DASH_SPEED_MULTIPLIER;
          // Forced fixed distance for dash, even if joystick is slightly pushed
          inputFactor = 1.0;
        }

        const dirX = dx / mag;
        const dirY = dy / mag;

        player.x += dirX * inputFactor * player.speed * speedMult * dtFactor;
        player.y += dirY * inputFactor * player.speed * speedMult * dtFactor;
      }

      player.x = Math.max(player.radius, Math.min(width - player.radius, player.x));
      player.y = Math.max(player.radius, Math.min(height - player.radius, player.y));

      const targetBg =
        marketData.pnl >= 0
          ? { r: 2, g: lerp(6, 40, Math.min(1, marketData.pnl * 20)), b: 10 }
          : { r: lerp(2, 40, Math.min(1, Math.abs(marketData.pnl) * 20)), g: 2, b: 2 };

      const bgLerpFactor = 1 - Math.pow(0.95, dtFactor);
      s.currentBg.r = lerp(s.currentBg.r, targetBg.r, bgLerpFactor);
      s.currentBg.g = lerp(s.currentBg.g, targetBg.g, bgLerpFactor);
      s.currentBg.b = lerp(s.currentBg.b, targetBg.b, bgLerpFactor);

      // Combat System - Auto Fire (only targets on-screen enemies)
      CombatSystem.processAutoFire(p, player, s, deltaTime, width, height);

      const layout = getHUDLayout(device.platform);
      const perfConfig = DeviceBenchmarkService.getPerformanceConfig();

      // Use the lower of layout limit and performance config limit
      const maxEnemies = Math.min(layout.maxEnemies, perfConfig.maxEnemies);

      // Update Spawn System
      s.spawnTimer = SpawnSystem.update(
        deltaTime,
        s.spawnTimer,
        marketData.difficulty,
        width,
        height,
        position,
        p,
        maxEnemies
      );

      // Update Physics & Collisions
      PhysicsSystem.updateEntities(p, dtFactor, width, height);
      PhysicsSystem.handleCollisions(p, player, s, dtFactor, width, height, onGameOver);

      // Only update React state if meaningful stats changed to prevent 60fps re-renders of the whole UI
      if (
        player.hp !== lastSyncedStats.current.hp ||
        player.exp !== lastSyncedStats.current.exp ||
        player.level !== lastSyncedStats.current.level
      ) {
        updatePlayerStats({ ...player });
        lastSyncedStats.current = {
          hp: player.hp,
          exp: player.exp,
          level: player.level,
        };
      }

      p.cleanup(); // Consolidate inactive objects
    }

    draw();
    requestRef.current = requestAnimationFrame(update);
  };

  function draw() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Pass graphics settings to renderer
    const graphics = {
      showParticles: graphicsSettings.showParticles,
      showDamageNumbers: graphicsSettings.showDamageNumbers,
      showScreenShake: graphicsSettings.showScreenShake,
    };

    renderer.current.render(
      ctx,
      width,
      height,
      state.current,
      playerRef.current,
      pool.current,
      status,
      graphics
    );
  }

  useEffect(() => {
    if (requestRef.current) {
      cancelAnimationFrame(requestRef.current);
    }
    requestRef.current = requestAnimationFrame(update);
    return () => {
      if (requestRef.current) {
        cancelAnimationFrame(requestRef.current);
        requestRef.current = undefined;
      }
    };
    // Note: removed marketData and position to prevent shuttering on every update
    // The update loop naturally reads these from current props on each frame
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, width, height]);

  return (
    <div className="relative w-full h-full cursor-none">
      <canvas ref={canvasRef} width={width} height={height} className="block" />
      <GameHUD
        status={status}
        enemies={pool.current.activeEnemies}
        player={playerRef.current}
        sessionStartTime={sessionStartTime}
        width={width}
        height={height}
      />

      {device.isMobile && (
        <MobileControls
          status={status}
          settings={mobileSettings}
          onMove={setTouchMovement}
          onDash={() => setTouchDash(true)}
          dashCooldownMs={GAME_ENGINE.DASH_COOLDOWN}
        />
      )}
    </div>
  );
};
