import React, { useRef, useEffect, useCallback } from 'react';
import {
  type MarketPosition,
  type MarketData,
  type Player,
  GameStatus,
  type GameState,
  type Candle,
} from '../types';
import { type CryptoPair } from '../types/crypto';
import { COLORS, GAME_ENGINE } from '../constants';
import { PLAYER_STATS } from '../config/PlayerConfig';
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
import { spawnSystem } from '../services/SpawnSystem';
import { CombatSystem } from '../services/CombatSystem';
import { GameHUD } from './GameHUD';
import { MobileControls } from './mobile';
import { useDevice } from '../hooks/useDevice';
import { DeviceBenchmarkService } from '../services/DeviceBenchmarkService';
import { FPSMonitor } from '../services/FPSMonitor';
import { BuffManager } from '../services/patterns/decorators/BuffManager';
import { BuffGemSpawner } from '../services/spawners/BuffGemSpawner';
import { SpeedLineSpawner } from '../services/spawners/SpeedLineSpawner';
import { lerp } from '../utils/math';
import { audio } from '../services/AudioService';
import { marketStateService } from '../services/MarketStateService';
import { Logger } from '../services/Logger';
import { EventBus } from '../services/EventBus';

// Custom hooks for GameEngine
import { useGameSetup } from '../hooks/useGameSetup';
import { useGameEvents } from '../hooks/useGameEvents';
import { useGameStatusEffects } from '../hooks/useGameStatusEffects';

interface GameEngineProps {
  status: GameStatus;
  position: MarketPosition;
  pair: CryptoPair;
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
  pair,
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
  const speedLineSpawner = useRef(new SpeedLineSpawner());
  const {
    getMovementVector,
    isSpacePressed,
    isSpaceFreshPress,
    setTouchMovement,
    setTouchDash,
    consumeDash,
  } = useGameInput();
  const device = useDevice();
  const mobileSettings = useGameStore(state => state.mobile);
  const graphicsSettings = useGameStore(selectGraphics);

  const state = useRef<GameState>({
    bgCandles: [] as Candle[],
    lastFireTime: 0,
    fireTimer: 0,
    spawnTimer: 0,
    damageIndicators: [],
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
    lastHeartbeatTime: 0,

    // Double Dash
    doubleDashQueued: false,
    doubleDashUsed: false,
    dashHaloOpacity: 0,

    // Hit Stop
    hitStopTimer: 0,

    // Squash & Stretch
    playerScaleX: 1,
    playerScaleY: 1,

    // Near Miss Tension
    nearMissTimer: 0,
    nearMissCooldown: 0,
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

  // Market State Initialization (Server-Side Indicators)
  useEffect(() => {
    if (status === GameStatus.PLAYING) {
      marketStateService
        .initialize(pair, position)
        .then(state => {
          Logger.info('[GameEngine] Market state initialized:', state);
        })
        .catch(err => {
          Logger.error('[GameEngine] Failed to initialize market state:', err);
        });

      // Return cleanup only when we initialized
      // This ensures destroy() is called when:
      // 1. Status changes away from PLAYING
      // 2. Position or pair changes while PLAYING
      // 3. Component unmounts
      return () => {
        void marketStateService.destroy();
      };
    }
    // No cleanup needed if we didn't initialize
    return undefined;
  }, [status, position, pair]);

  // Hit Stop Event Listener (freeze frame on impact)
  useEffect(() => {
    const unsubscribe = EventBus.on('hitStop', data => {
      // Take the maximum duration to handle multiple simultaneous hits
      state.current.hitStopTimer = Math.max(state.current.hitStopTimer, data.duration);
    });

    return unsubscribe;
  }, []);

  // Near Miss Event Listener (Matrix slow-mo effect)
  useEffect(() => {
    const unsubscribe = EventBus.on('nearMiss', () => {
      if (state.current.nearMissCooldown <= 0) {
        state.current.nearMissTimer = GAME_ENGINE.NEAR_MISS_DURATION;
        state.current.nearMissCooldown = GAME_ENGINE.NEAR_MISS_COOLDOWN;
        audio.playWhoosh();
      }
    });
    return unsubscribe;
  }, []);

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

      // Update Near Miss Timers (Decremented by real time, but affects game time)
      if (s.nearMissCooldown > 0) s.nearMissCooldown -= deltaTime;

      let timeScale = 1.0;
      if (s.nearMissTimer > 0) {
        s.nearMissTimer -= deltaTime;
        timeScale = GAME_ENGINE.NEAR_MISS_SLOWMO;
      }

      const dtFactor = (deltaTime / 16.67) * timeScale;
      s.lastTime = time;
      FPSMonitor.tick();

      // Update background candles (even when paused for visual continuity, but skip if menu)
      if (status !== GameStatus.MENU) {
        const waveMultiplier = DifficultyManager.getWaveMultiplier();
        renderer.current.updateBackgroundCandles(
          s,
          marketDataRef.current.pnl,
          waveMultiplier,
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

        // Handle Hit Stop (freeze frame on impact)
        if (s.hitStopTimer > 0) {
          s.hitStopTimer -= deltaTime;
          // During hit stop: still draw, but skip physics updates
          // This creates the "freeze frame" impact feel
          draw();
          requestRef.current = requestAnimationFrame(update);
          return;
        }

        if (s.shake > 0) s.shake *= Math.pow(GAME_ENGINE.SHAKE_DECAY, dtFactor);
        if (s.critFlash > 0) s.critFlash *= Math.pow(GAME_ENGINE.CRIT_FLASH_DECAY, dtFactor);

        // Recover player scale (Squash & Stretch)
        // Lerp back to 1.0 with a springy speed (approx 0.15 per frame)
        s.playerScaleX = lerp(s.playerScaleX, 1, 0.15 * dtFactor);
        s.playerScaleY = lerp(s.playerScaleY, 1, 0.15 * dtFactor);

        // Update difficulty waves in real-time
        DifficultyManager.updateWaveTimer(deltaTime);

        // Update combo system
        ComboSystem.update();

        // Update buff manager (handles effect expiration)
        BuffManager.update();
        BuffManager.updateBaseStats(player);

        // Update buff gem spawner (spawns gems based on volatility)
        BuffGemSpawner.updateDimensions(width, height);
        BuffGemSpawner.update(marketDataRef.current.difficulty, deltaTime);

        // Update Speed Lines
        speedLineSpawner.current.update(p, s, player, width, height, time);

        // REMOVED: marketIndicatorService.update(...) - handled by realtime service now
        // Indicators flow directly to SpawnSystem via marketStateService

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

        // Low HP Heartbeat Logic
        if (hpPercent < 25) {
          const urgency = 1 - hpPercent / 25;
          // Pulse intervals: 1000ms (start) -> 400ms (near death)
          const interval = 1000 - urgency * 600;

          if (time - s.lastHeartbeatTime > interval) {
            audio.playHeartbeat();
            s.lastHeartbeatTime = time;
          }
        }

        // Dash Logic Timers
        if (s.dashTimer > 0) {
          s.dashTimer -= deltaTime;

          // Update halo opacity - pulse during dash window
          s.dashHaloOpacity = Math.sin(time / 50) * 0.3 + 0.7; // Pulsing 0.4-1.0

          // Check for double dash input during active dash
          // User must RELEASE and PRESS space again (not just hold)
          if (isSpaceFreshPress() && !s.doubleDashQueued && !s.doubleDashUsed) {
            s.doubleDashQueued = true;
            consumeDash();
            // Visual feedback for queued double dash
            s.shake = 5;
          }

          // Dash ended
          if (s.dashTimer <= 0) {
            s.isDashing = false;
            s.dashHaloOpacity = 0;

            // Squash effect at end of dash (short and fat)
            s.playerScaleX = 1.3;
            s.playerScaleY = 0.7;

            // Execute queued double dash
            if (s.doubleDashQueued) {
              const { dx: ddx, dy: ddy } = getMovementVector();
              if (ddx !== 0 || ddy !== 0) {
                // Start second dash immediately
                s.isDashing = true;
                s.dashTimer = GAME_ENGINE.DASH_DURATION;
                s.doubleDashQueued = false;
                s.doubleDashUsed = true;
                s.dashCooldownTimer = GAME_ENGINE.DOUBLE_DASH_COOLDOWN; // 4 seconds
                audio.playDash();
                s.shake = 10; // Extra feedback for double dash

                // Stretch for double dash
                s.playerScaleX = 0.6;
                s.playerScaleY = 1.4;
              } else {
                s.doubleDashQueued = false;
              }
            }
          }

          // Add current position to trail
          s.dashTrail.push({ x: player.x, y: player.y });
          if (s.dashTrail.length > 8) s.dashTrail.shift();
        } else {
          // Fade out trail - frame-rate independent using accumulator
          s.dashHaloOpacity = 0;
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
          if (s.dashCooldownTimer <= 0) {
            // Reset double dash flag when cooldown ends
            s.doubleDashUsed = false;
          }
        }

        const { dx, dy } = getMovementVector();

        // Handle Dash Trigger (initial dash only)
        if (
          isSpacePressed() &&
          s.dashCooldownTimer <= 0 &&
          (dx !== 0 || dy !== 0) &&
          !s.isDashing
        ) {
          s.isDashing = true;
          s.dashTimer = GAME_ENGINE.DASH_DURATION;
          s.dashCooldownTimer = GAME_ENGINE.DASH_COOLDOWN;
          s.doubleDashQueued = false;
          s.doubleDashUsed = false;
          audio.playDash();
          consumeDash();

          // Dash Stretch (long and thin)
          s.playerScaleX = 0.6;
          s.playerScaleY = 1.4;
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

          // Get effective speed from BuffManager (includes buff/card bonuses)
          // Apply system-level cap from PlayerConfig
          const rawSpeed = BuffManager.isInitialized()
            ? BuffManager.getDecoratedStats().getSpeed()
            : player.speed;
          const effectiveSpeed = Math.min(rawSpeed, PLAYER_STATS.MAX_SPEED);

          player.x += dirX * inputFactor * effectiveSpeed * speedMult * dtFactor;
          player.y += dirY * inputFactor * effectiveSpeed * speedMult * dtFactor;
        }

        player.x = Math.max(player.radius, Math.min(width - player.radius, player.x));
        player.y = Math.max(player.radius, Math.min(height - player.radius, player.y));

        // Calculate target background based on PnL
        // On mobile, we increase the floor values to prevent the screen from being too dark at low brightness
        const minVal = device.isMobile ? 12 : 2;
        const targetBg =
          marketDataRef.current.pnl >= 0
            ? {
                r: minVal,
                g: lerp(minVal + 4, 45, Math.min(1, marketDataRef.current.pnl * 20)),
                b: minVal + 8,
              }
            : {
                r: lerp(minVal, 45, Math.min(1, Math.abs(marketDataRef.current.pnl) * 20)),
                g: minVal,
                b: minVal,
              };

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
        spawnSystem.update(
          deltaTime,
          marketDataRef.current.difficulty,
          width,
          height,
          position,
          p,
          marketDataRef.current.pnl,
          maxEnemies
        );

        // Update Physics & Collisions
        PhysicsSystem.updateEntities(p, dtFactor, width, height, player);
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
      isSpaceFreshPress,
      consumeDash,
      device.platform,
      device.isMobile,
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
