import React, { useRef, useEffect, useCallback, memo } from 'react';
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
import { AIDirector } from '../services/difficulty/AIDirector';
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
import { SpeedLineSpawner } from '../services/spawners/SpeedLineSpawner';
import { lerp } from '../utils/math';
import { audio } from '../services/AudioService';
import { MarketStateService } from '../services/MarketStateService';
import { marketIndicatorService } from '../services/indicators/MarketIndicatorService';
import { Logger } from '../services/Logger';
import { EventBus } from '../services/EventBus';
import { EngineRegistry } from '../services/EngineRegistry';
import { difficultyContext } from '../services/difficulty';
import { portalSystem } from '../services/PortalSystem';

import { useLazyRef } from '../hooks/useLazyRef';

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
  width,
  height,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const requestRef = useRef<number | undefined>(undefined);

  // Use singleton instances for heavy systems (Architectural Compliance)
  const pool = useRef(PoolManager.getInstance());
  const renderer = useLazyRef(() => new GameRenderer());
  const combatSystem = useRef(CombatSystem.getInstance());
  const physicsSystem = useRef(PhysicsSystem.getInstance());
  const spawnSystemRef = useLazyRef(() => new SpawnSystem());
  const speedLineSpawner = useLazyRef(() => new SpeedLineSpawner());

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
    bgUpdateFrameCounter: 0, // Add frame counter for background updates

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
    playerRotation: 0,

    // Near Miss Tension
    nearMissTimer: 0,
    nearMissCooldown: 0,

    // Market Visuals
    rsiVisualState: 'NEUTRAL',
    whaleEventTimer: 0,
    targetBg: { r: 2, g: 6, b: 23 }, // Reusable object for background color updates

    // Lootbox Spawn Timer
    interactableSpawnTimer: 0,

    // Market Indicators
    atrPercent: 0,
    spawnRateMultiplier: 1,
    marketPosition: position,

    // Animation metadata
    isMoving: false,
    lastMoveX: 1,
  });

  // Track last synced stats to prevent unnecessary re-renders in App.tsx
  const lastSyncedStats = useRef({
    hp: 0,
    exp: 0,
    level: 0,
    lastTime: 0,
  });

  // Ref for market data to avoid loop restarts while keeping data fresh
  const marketDataRef = useRef(marketData);
  useEffect(() => {
    marketDataRef.current = marketData;
  }, [marketData]);

  // DEBUG: Key '6' triggers force cycle complete (DEV ONLY)
  useEffect(() => {
    if (!import.meta.env.DEV) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === '6') {
        Logger.info('[GameEngine Debug] Force triggering cycle complete via key 6');
        EventBus.emit('cycleComplete', {
          cycleNumber: 1,
          totalElapsedSeconds: 300,
        });
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Register services with EngineRegistry for Dependency Injection
  useEffect(() => {
    EngineRegistry.setPoolManager(pool.current);
    EngineRegistry.setCombatSystem(combatSystem.current);
    EngineRegistry.setPhysicsSystem(physicsSystem.current);
    EngineRegistry.setSpawnSystem(spawnSystemRef.current);
    EngineRegistry.setAudioService(audio);
  }, [spawnSystemRef]); // Singletons aren't going to change, and spawnSystemRef is stable

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
  // Market State Initialization (Server-Side Indicators)
  useEffect(() => {
    if (status === GameStatus.PLAYING) {
      // Integrated Warmup Flow: Snapshot -> Warmup -> Realtime Stream
      const initFlow = async () => {
        try {
          Logger.info('[GameEngine] Starting market sync flow...');

          // 1. Fetch historical data (Snapshot)
          const history = await MarketStateService.fetchMarketHistory(pair, 300);

          // 2. Warm up indicators (Deterministic Initial State)
          await marketIndicatorService.warmup(history, position);

          // 3. Initialize Realtime subscription
          await MarketStateService.init();

          Logger.info('[GameEngine] Market state perfect sync complete');
        } catch (err) {
          Logger.error('[GameEngine] Market sync flow failed:', err);
        }
      };

      void initFlow();

      // Market Events for Visual Effects
      const handleRSIChange = (data: {
        state: 'OVERSOLD' | 'NEUTRAL' | 'OVERBOUGHT';
      }) => {
        state.current.rsiVisualState = data.state;
        Logger.info(`[GameEngine] RSI Visual State: ${data.state}`);
      };

      const handleWhaleChange = (data: { tier: number }) => {
        if (data.tier > 0) {
          state.current.whaleEventTimer = 2000; // 2 seconds of effect
          state.current.shake = 15 + data.tier * 5; // Big shake
        }
      };

      const unsubRSI = EventBus.on('rsiStateChanged', handleRSIChange);
      const unsubWhale = EventBus.on('whaleTierChanged', handleWhaleChange);

      return () => {
        MarketStateService.cleanup();
        unsubRSI();
        unsubWhale();
      };
    }
    // No cleanup needed if we didn't initialize
    return undefined;
  }, [status, pair, position, state]);

  // AIDirector Activation
  useEffect(() => {
    if (status === GameStatus.PLAYING) {
      AIDirector.setEnabled(true);
    } else {
      AIDirector.setEnabled(false);
    }
    return () => AIDirector.setEnabled(false);
  }, [status]);

  // Hit Stop Event Listener (freeze frame on impact)
  useEffect(() => {
    const unsubscribe = EventBus.on('hitStop', data => {
      // Take the maximum duration to handle multiple simultaneous hits
      state.current.hitStopTimer = Math.max(state.current.hitStopTimer, data.duration);
    });

    return unsubscribe;
  }, []);

  // Listen for high-frequency market updates directly to avoid React re-render overhead
  useEffect(() => {
    const unsub = EventBus.on('gameMarketUpdate', (data: MarketData) => {
      marketDataRef.current = data;
    });
    return unsub;
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
  }, [width, height, status, graphicsSettings, playerRef, pool, renderer]);

  const update = useCallback(
    (time: number) => {
      const frameStart = performance.now();
      FPSMonitor.tick();
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

      const dtFactor = (deltaTime / GAME_ENGINE.TARGET_FRAME_TIME) * timeScale;
      s.lastTime = time;

      // Update background candles (even when paused for visual continuity, but skip if menu)
      if (status !== GameStatus.MENU) {
        renderer.current.updateBackgroundCandles(
          state.current,
          marketDataRef.current.pnl,
          marketDataRef.current.difficulty, // Use total difficulty as speed/intensity proxy
          marketDataRef.current.momentum,
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
          // During freeze, skip physics updates but still draw
          draw();
          requestRef.current = requestAnimationFrame(update);
          return;
        }

        // Handle Hit Stop (freeze frame on impact)
        if (s.hitStopTimer > 0) {
          s.hitStopTimer -= deltaTime;
          // During hit stop: skip physics updates but still draw
          draw();
          requestRef.current = requestAnimationFrame(update);
          return;
        }

        if (s.shake > 0) {
          s.shake *= Math.pow(GAME_ENGINE.SHAKE_DECAY, dtFactor);
        }
        if (s.critFlash > 0) {
          s.critFlash *= Math.pow(GAME_ENGINE.CRIT_FLASH_DECAY, dtFactor);
        }

        if (s.whaleEventTimer > 0) {
          s.whaleEventTimer -= deltaTime;
        }

        // Recover player scale (Squash & Stretch)
        // Lerp back to 1.0 with a springy speed
        // Use faster recovery on mobile for snappier 100ms dash
        const recoverySpeed = device.isMobile
          ? GAME_ENGINE.PLAYER_SCALE_RECOVERY_SPEED * 2.0
          : GAME_ENGINE.PLAYER_SCALE_RECOVERY_SPEED;

        s.playerScaleX = lerp(s.playerScaleX, 1, recoverySpeed * dtFactor);
        s.playerScaleY = lerp(s.playerScaleY, 1, recoverySpeed * dtFactor);

        // Update difficulty waves in real-time
        DifficultyManager.updateWaveTimer(deltaTime);
        difficultyContext.updateTime(TimeService.getGameTimeSeconds());

        // Update AI Director (Brain) with Player Power Specs
        AIDirector.setPlayerStats(
          player.baseDamage,
          player.fireRate,
          player.projectiles,
          ComboSystem.getKillStreak()
        );
        AIDirector.update(time);

        // Update Portal System
        portalSystem.update(deltaTime, width, height);

        // Update Gatekeeper Orbit positions & Knockback
        const portal = portalSystem.getState();
        if (portal.isActive) {
          p.activeEnemies.forEach(enemy => {
            if (enemy.type === 'gatekeeper' && enemy.orbitPoint) {
              const e = enemy;
              const orbitSpeed = 0.02 * dtFactor;
              e.orbitAngle = (e.orbitAngle ?? 0) + orbitSpeed;
              enemy.x = e.orbitPoint.x + Math.cos(e.orbitAngle) * 80;
              enemy.y = e.orbitPoint.y + Math.sin(e.orbitAngle) * 80;

              // Knockback player if touching
              const dist = Math.hypot(player.x - enemy.x, player.y - enemy.y);
              if (dist < player.radius + enemy.radius) {
                const kx = (player.x - enemy.x) / dist;
                const ky = (player.y - enemy.y) / dist;
                player.x += kx * 5 * dtFactor;
                player.y += ky * 5 * dtFactor;
              }
            }
          });

          // Portal Collision Check (Extraction)
          const pDist = Math.hypot(player.x - portal.x, player.y - portal.y);
          if (pDist < player.radius + portal.radius * 0.4) {
            const rewards = portalSystem.calculateFinalRewards();
            portalSystem.closePortal();
            EventBus.emit('portalExtraction', rewards);
            onGameOver(); // Exit run
          }
        }

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

        // Update local market indicators for responsive gameplay effects
        // This calculates RSI(7), Volume Normalization and ATR-based spawn rates
        const currentMarketData = marketDataRef.current;
        marketIndicatorService.update(
          currentMarketData.price,
          currentMarketData.volume,
          position,
          pair
        );

        // Update metrics system
        const wavePhase = DifficultyManager.getWavePhase();
        const maxHp = 100 + (player.level - 1) * 10; // Base HP calculation
        const hpPercent = (player.hp / maxHp) * 100;

        // Optimized: Pass primitives directly to avoid object allocation per frame
        MetricsService.update(
          deltaTime,
          marketDataRef.current.pnl,
          marketDataRef.current.difficulty,
          hpPercent,
          p.activeEnemies.length,
          p.activeBullets.length,
          p.activeParticles.length,
          wavePhase,
          marketDataRef.current.atrPercent ?? 0.01
        );

        // Low HP Heartbeat Logic
        if (hpPercent < GAME_ENGINE.LOW_HP_THRESHOLD_PERCENT) {
          const urgency = 1 - hpPercent / GAME_ENGINE.LOW_HP_THRESHOLD_PERCENT;
          // Pulse intervals: 1000ms (start) -> 400ms (near death)
          const interval =
            GAME_ENGINE.HEARTBEAT_INTERVAL_BASE -
            urgency * GAME_ENGINE.HEARTBEAT_INTERVAL_SHIFT;

          if (time - s.lastHeartbeatTime > interval) {
            audio.playHeartbeat();
            s.lastHeartbeatTime = time;
          }
        }

        // ... Dash Logic ...

        // [Existing Dash Logic code block - omitted for brevity in replacement, but kept in file via context]
        // Note to assistant applying this: Ensure Dash Logic remains intact.
        // I will target the MetricsService block specifically, and then the updatePlayerStats block specifically.

        // Skipping dash logic lines for the tool call... see next tool call for PlayerStats throttling.

        // Dash Logic Timers
        if (s.dashTimer > 0) {
          s.dashTimer -= deltaTime;

          // Update halo opacity - pulse during dash window
          s.dashHaloOpacity =
            Math.sin(time / GAME_ENGINE.DASH_HALO_PULSE_SPEED) *
              GAME_ENGINE.DASH_HALO_OPACITY_BASE +
            GAME_ENGINE.DASH_HALO_OPACITY_AMP; // Pulsing 0.4-1.0

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
            s.playerScaleX = 0.4;
            s.playerScaleY = 1.6;
            // Keep rotation at last dash angle

            // Execute queued double dash
            if (s.doubleDashQueued) {
              const { dx: ddx, dy: ddy } = getMovementVector();
              if (ddx !== 0 || ddy !== 0) {
                // Start second dash immediately
                const effectiveDashDuration = device.isMobile
                  ? GAME_ENGINE.PLAYER_DASH_DURATION_MOBILE
                  : GAME_ENGINE.PLAYER_DASH_DURATION;

                s.isDashing = true;
                s.dashTimer = effectiveDashDuration;
                s.doubleDashQueued = false;
                s.doubleDashUsed = true;
                s.dashCooldownTimer = GAME_ENGINE.DOUBLE_DASH_COOLDOWN; // 4 seconds
                audio.playDash();
                s.shake = 10; // Extra feedback for double dash
                EventBus.emit('playerDash', {
                  duration: effectiveDashDuration,
                  cooldown: GAME_ENGINE.DOUBLE_DASH_COOLDOWN,
                  isDoubleDash: true,
                });

                // Stretch for double dash
                s.playerScaleX = 1.8;
                s.playerScaleY = 0.4;
                s.playerRotation = Math.atan2(ddy, ddx);
              } else {
                s.doubleDashQueued = false;
              }
            }
          }

          // Add current position to trail
          s.dashTrail.push({ x: player.x, y: player.y });
          const maxTrail = s.isDashing
            ? Math.floor(GAME_ENGINE.DASH_TRAIL_MAX_LENGTH * 1.5)
            : GAME_ENGINE.DASH_TRAIL_MAX_LENGTH;
          if (s.dashTrail.length > maxTrail) {
            s.dashTrail.shift();
          }
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
          const effectiveDashDuration = device.isMobile
            ? GAME_ENGINE.PLAYER_DASH_DURATION_MOBILE
            : GAME_ENGINE.PLAYER_DASH_DURATION;

          s.isDashing = true;
          s.dashTimer = effectiveDashDuration;
          s.dashCooldownTimer = GAME_ENGINE.DASH_COOLDOWN;
          s.doubleDashQueued = false;
          s.doubleDashUsed = false;
          audio.playDash();
          consumeDash();
          EventBus.emit('playerDash', {
            duration: effectiveDashDuration,
            cooldown: GAME_ENGINE.DASH_COOLDOWN,
            isDoubleDash: false,
          });

          // Dash Stretch (long and thin)
          s.playerScaleX = 1.8;
          s.playerScaleY = 0.4;
          s.playerRotation = Math.atan2(dy, dx);
        }

        // --- ANIMATION METADATA SYNC ---
        s.isMoving = Math.hypot(dx, dy) > 0.1;
        if (dx !== 0) {
          s.lastMoveX = dx > 0 ? 1 : -1;
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

          // Update rotation for squash/stretch
          if (!s.isDashing) {
            s.playerRotation = Math.atan2(dy, dx);
          }

          // Get effective speed from BuffManager (includes buff/card bonuses)
          // Apply system-level cap from PlayerConfig
          const rawSpeed = BuffManager.isInitialized()
            ? BuffManager.getDecoratedStats().getSpeed()
            : player.speed;
          const effectiveSpeed = Math.min(rawSpeed, PLAYER_STATS.MAX_SPEED);

          player.x += dirX * inputFactor * effectiveSpeed * speedMult * dtFactor;
          player.y += dirY * inputFactor * effectiveSpeed * speedMult * dtFactor;
        }

        // Clamp player to screen bounds (prevent going off-screen)
        player.x = Math.max(player.radius, Math.min(width - player.radius, player.x));

        // Mobile: Add small padding at the bottom to stay clear of HP bar
        // Desktop: Keep standard radius-based clamping
        const bottomMargin = device.isMobile ? player.radius + 40 : player.radius;
        player.y = Math.max(player.radius, Math.min(height - bottomMargin, player.y));

        // Calculate target background based on PnL
        // On mobile, we increase the floor values to prevent the screen from being too dark at low brightness
        const minVal = device.isMobile ? 12 : 2;

        // Only update background every 3 frames to optimize performance
        s.bgUpdateFrameCounter = (s.bgUpdateFrameCounter + 1) % 3;
        if (s.bgUpdateFrameCounter === 0) {
          if (marketDataRef.current.pnl >= 0) {
            s.targetBg.r = minVal;
            s.targetBg.g = lerp(
              minVal + 4,
              45,
              Math.min(1, marketDataRef.current.pnl * 20)
            );
            s.targetBg.b = minVal + 8;
          } else {
            s.targetBg.r = lerp(
              minVal,
              45,
              Math.min(
                1,
                Math.abs(marketDataRef.current.pnl) * GAME_ENGINE.PNL_VISUAL_SCALE
              )
            );
            s.targetBg.g = minVal;
            s.targetBg.b = minVal;
          }

          const bgLerpFactor = 1 - Math.pow(GAME_ENGINE.BG_LERP_FACTOR, dtFactor);
          s.currentBg.r = lerp(s.currentBg.r, s.targetBg.r, bgLerpFactor);
          s.currentBg.g = lerp(s.currentBg.g, s.targetBg.g, bgLerpFactor);
          s.currentBg.b = lerp(s.currentBg.b, s.targetBg.b, bgLerpFactor);
        }

        // Combat System - Auto Fire (only targets on-screen enemies)
        combatSystem.current.processAutoFire(p, player, s, deltaTime, width, height);

        const layout = getHUDLayout(device.platform);
        const perfConfig = DeviceBenchmarkService.getPerformanceConfig();

        // Use the lower of layout limit and performance config limit
        const maxEnemies = Math.min(layout.maxEnemies, perfConfig.maxEnemies);

        // 0. Sync Market Metadata from marketDataRef
        state.current.atrPercent = marketDataRef.current.atrPercent ?? 0;
        state.current.spawnRateMultiplier =
          marketDataRef.current.spawnRateMultiplier ?? 1;
        state.current.marketPosition = position;

        // 1. Update Sub-systems (Physics, Spawning, etc.)
        spawnSystemRef.current.update(
          deltaTime,
          marketDataRef.current.difficulty,
          width,
          height,
          position,
          p,
          marketDataRef.current.pnl,
          maxEnemies,
          state.current.spawnRateMultiplier,
          pair,
          marketDataRef.current.enemyDamage,
          marketDataRef.current.enemySpeed
        );

        // --- INTERACTABLE SPAWN LOGIC (Temporary Logic) ---
        s.interactableSpawnTimer = s.interactableSpawnTimer + deltaTime;
        if (s.interactableSpawnTimer > 20000) {
          // Every 20 seconds
          s.interactableSpawnTimer = 0;
          // Spawn random mining rig
          const pad = 100;
          const rx = pad + Math.random() * (width - pad * 2);
          const ry = pad + Math.random() * (height - pad * 2);

          p.getInteractable(
            Math.random() > 0.5 ? 'MINING_RIG' : 'LOOT_CRATE',
            rx,
            ry,
            150 // Hit Points
          );

          // Spawn effect
          Logger.info(`[GameEngine] Spawning Interactable at ${rx}, ${ry}`);
          EventBus.emit('gameNotification', {
            title: 'SUPPLY DROP',
            message: 'A loot crate appeared!',
          });
          audio.playLevelUp(); // Cue for supply drop
        }

        // Update Physics & Collisions
        const physStart = performance.now();
        physicsSystem.current.updateEntities(p, dtFactor, width, height, player);
        physicsSystem.current.handleCollisions(
          p,
          player,
          s,
          dtFactor,
          width,
          height,
          onGameOver
        );
        FPSMonitor.recordPhysics(performance.now() - physStart);

        // Only update React state if meaningful stats changed AND enough time passed (Throttle 100ms)
        // Exception: Always update immediately on Level Up
        const shouldSync =
          player.level !== lastSyncedStats.current.level ||
          (time - lastSyncedStats.current.lastTime >
            GAME_ENGINE.STATS_SYNC_THROTTLE_MS &&
            (player.hp !== lastSyncedStats.current.hp ||
              player.exp !== lastSyncedStats.current.exp));

        if (shouldSync) {
          updatePlayerStats({ ...player });
          lastSyncedStats.current = {
            hp: player.hp,
            exp: player.exp,
            level: player.level,
            lastTime: time,
          };
        }

        // PERF: Report Entity Counts to Monitor
        FPSMonitor.updateInternalCounts(
          p.activeEnemies.length,
          p.activeBullets.length,
          p.activeParticles.length
        );

        p.cleanup(); // Consolidate inactive objects
      }

      const updateEnd = performance.now();
      FPSMonitor.recordUpdate(updateEnd - frameStart);

      const renderStart = performance.now();
      draw();
      FPSMonitor.recordRender(performance.now() - renderStart);

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
      combatSystem,
      physicsSystem,
      pool,
      renderer,
      spawnSystemRef,
      speedLineSpawner,
      pair,
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
        width={width}
        height={height}
      />

      {device.isMobile && (
        <MobileControls
          status={status}
          settings={mobileSettings}
          onMove={setTouchMovement}
          onDash={() => setTouchDash(true)}
          onDashRelease={() => setTouchDash(false)}
          dashCooldownMs={GAME_ENGINE.DASH_COOLDOWN}
        />
      )}
    </div>
  );
};

// Memoize GameEngine to prevent high-frequency marketData updates from triggering React re-renders.
// The update loop uses marketDataRef which is updated via EventBus 'gameMarketUpdate'.
export const GameEngineShared = memo(
  GameEngine,
  (prev, next) =>
    prev.status === next.status &&
    prev.width === next.width &&
    prev.height === next.height &&
    prev.position === next.position &&
    prev.pair === next.pair &&
    prev.playerRef === next.playerRef
);

export default GameEngineShared;
