import React, { useRef, useEffect, useCallback } from 'react';
import {
  type MarketPosition,
  type MarketData,
  type Player,
  GameStatus,
  type GameState,
  type Candle,
} from '../types';
import { COLORS, GAME_ENGINE } from '../constants';
import { PoolManager } from '../services/PoolManager';
import { GameRenderer } from '../services/GameRenderer';
import { useGameInput } from '../hooks/useGameInput';
import { MetricsService } from '../services/MetricsService';
import { DifficultyManager } from '../services/DifficultyManager';
import { ComboSystem } from '../services/ComboSystem';
import { TimeService } from '../services/TimeService';
import { getHUDLayout } from '../config/UILayout';
import { useGameStore, selectGraphics } from '../stores/gameStore';
import { PhysicsSystem } from '../services/PhysicsSystem';
import { SpawnSystem } from '../services/SpawnSystem';
import { CombatSystem } from '../services/CombatSystem';
import { GameHUD } from './GameHUD';
import { MobileControls } from './mobile';
import { useDevice } from '../hooks/useDevice';
import { DeviceBenchmarkService } from '../services/DeviceBenchmarkService';
import { FPSMonitor } from '../services/FPSMonitor';
import { BuffManager } from '../services/patterns/decorators/BuffManager';
import { BuffGemSpawner } from '../services/spawners/BuffGemSpawner';
import { lerp } from '../utils/math';
import { audio } from '../services/audioService';

// Custom hooks for GameEngine
import { useGameSetup } from '../hooks/useGameSetup';
import { useGameEvents } from '../hooks/useGameEvents';
import { useGameStatusEffects } from '../hooks/useGameStatusEffects';

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

  // Ref for market data to avoid loop restarts while keeping data fresh
  const marketDataRef = useRef(marketData);
  useEffect(() => {
    marketDataRef.current = marketData;
  }, [marketData]);

  // ========================================
  // Custom Hooks for Setup, Events & Status
  // ========================================

  // Initial setup: FPS monitor, pool pre-warming, background candles
  useGameSetup({ pool, state, width, height });

  // Event subscriptions: afterReset, killAll
  useGameEvents({ pool, state });

  // Status change effects: menu cleanup, buff initialization, pause handling
  useGameStatusEffects({ status, pool, state, playerRef, width, height });

  const draw = useCallback(() => {
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
      playerRef.current!,
      pool.current,
      status,
      graphics
    );
  }, [width, height, status, graphicsSettings, playerRef]);

  const update = useCallback(
    (time: number) => {
      const s = state.current;
      const player = playerRef.current;
      const p = pool.current;

      const deltaTime = TimeService.update(time);
      const dtFactor = deltaTime / 16.67;
      s.lastTime = time;
      FPSMonitor.tick();

      if (status !== GameStatus.PAUSED) {
        renderer.current.updateBackgroundCandles(
          s,
          marketDataRef.current.pnl,
          marketDataRef.current.difficulty,
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
        BuffGemSpawner.update(marketDataRef.current.difficulty, deltaTime);

        // Update metrics system
        const wavePhase = DifficultyManager.getWavePhase();
        const maxHp = 100 + (player.level - 1) * 10; // Base HP calculation
        const hpPercent = (player.hp / maxHp) * 100;
        MetricsService.update(deltaTime, {
          pnl: marketDataRef.current.pnl,
          atr: 0.01, // ATR from market data if available
          difficulty: marketDataRef.current.difficulty,
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

          // Support analog move
          let inputFactor = Math.min(1, mag);

          if (s.isDashing) {
            speedMult = GAME_ENGINE.DASH_SPEED_MULTIPLIER;
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
          marketDataRef.current.pnl >= 0
            ? { r: 2, g: lerp(6, 40, Math.min(1, marketDataRef.current.pnl * 20)), b: 10 }
            : { r: lerp(2, 40, Math.min(1, Math.abs(marketDataRef.current.pnl) * 20)), g: 2, b: 2 };

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
          marketDataRef.current.difficulty,
          width,
          height,
          position,
          p,
          maxEnemies
        );

        // Update Physics & Collisions
        PhysicsSystem.updateEntities(p, dtFactor, width, height);
        PhysicsSystem.handleCollisions(p, player, s, dtFactor, width, height, onGameOver);

        // Only update React state if meaningful stats changed
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
    },
    [
      status,
      width,
      height,
      onLevelUp,
      onGameOver,
      draw,
      playerRef,
      getMovementVector,
      isSpacePressed,
      consumeDash,
      device.platform,
      position,
      updatePlayerStats,
    ]
  );

  // Animation frame setup
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
  }, [update]);

  return (
    <div className="relative w-full h-full cursor-none">
      <canvas ref={canvasRef} width={width} height={height} className="block" />
      <GameHUD
        status={status}
        enemies={pool.current.activeEnemies}
        player={playerRef.current!}
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

export default GameEngine;
