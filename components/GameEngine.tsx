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
import { PoolManager } from '../services/combat/PoolManager';
import { GameRenderer } from '../services/renderers/GameRenderer';
import { useGameInput } from '../hooks/useGameInput';
import { MetricsService } from '../services/core/MetricsService';
import { DifficultyManager } from '../services/gameplay/DifficultyManager';
import { AIDirector } from '../services/difficulty/AIDirector';
import { ComboSystem } from '../services/combat/ComboSystem';
import { TimeService } from '../services/core/TimeService';
import { getHUDLayout } from '../config/UILayout';
import { useGameStore, selectGraphics } from '../stores/gameStore';
import { PhysicsSystem } from '../services/combat/PhysicsSystem';
import { SpawnSystem } from '../services/combat/SpawnSystem';
import { CombatSystem } from '../services/combat/CombatSystem';
import { GameHUD } from './GameHUD';
import { MobileControls } from './mobile';
import { useDevice } from '../hooks/useDevice';
import { DeviceBenchmarkService } from '../services/system/DeviceBenchmarkService';
import { FPSMonitor } from '../services/system/FPSMonitor';
import { BuffManager } from '../services/patterns/decorators/BuffManager';
import { BuffGemSpawner } from '../services/spawners/BuffGemSpawner';
import { SpeedLineSpawner } from '../services/spawners/SpeedLineSpawner';
import { lerp } from '../utils/math';
import { audio } from '../services/audio';
import { MarketStateService } from '../services/market/MarketStateService';
import { ClientIndicatorService } from '../services/indicators/ClientIndicatorService';
import { Logger } from '../services/system/Logger';
import { EventBus } from '../services/core/EventBus';
import { EngineRegistry } from '../services/core/EngineRegistry';
import { difficultyContext } from '../services/difficulty/DifficultyContext';
import { portalSystem } from '../services/gameplay/PortalSystem';
import { VisualEffectService } from '../services/gameplay/VisualEffectService';
import { HitStopGovernor } from '../services/gameplay/HitStopGovernor';
import { CoreGameplayLoop } from '../services/gameplay/CoreGameplayLoop';
import { LeverageEngine } from '../services/gameplay/LeverageEngine';
import { PriceMomentumEngine } from '../services/market/PriceMomentumEngine';
import { MarketAudioReactor } from '../services/audio/MarketAudioReactor';
import { useLanguage } from '../contexts/LanguageContext';
import { type ClientIndicatorsUpdatedEvent } from '../types/events';

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
  const { t } = useLanguage();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const requestRef = useRef<number | undefined>(undefined);

  // Use singleton instances for heavy systems (Architectural Compliance)
  const pool = useRef(PoolManager.getInstance());
  const renderer = useLazyRef(() => GameRenderer.getInstance());
  const combatSystem = useRef(CombatSystem.getInstance());
  const physicsSystem = useRef(PhysicsSystem.getInstance());
  const spawnSystemRef = useLazyRef(() => SpawnSystem.getInstance());
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
  const hitStopGovernorRef = useRef(new HitStopGovernor());
  const coreLoopRef = useRef(new CoreGameplayLoop());
  const lastWhaleTierRef = useRef<0 | 1 | 2 | 3>(0);

  // Pre-allocated objects for GC-free loop references
  const coreLoopInputRef = useRef({
    deltaMs: 0,
    hpPercent: 0,
    enemyCount: 0,
    killStreak: 0,
    movementMagnitude: 0,
    didAttack: false,
    isDashing: false,
    nowMs: 0,
  });

  const spawnOptionsRef = useRef({
    rsi: 0,
    rsiState: 'NEUTRAL' as string,
    whaleTier: 0 as 0 | 1 | 2 | 3,
  });

  useEffect(() => {
    marketDataRef.current = marketData;
  }, [marketData]);

  useEffect(() => {
    if (status !== GameStatus.PLAYING) {
      hitStopGovernorRef.current.reset();
      coreLoopRef.current.reset();
      MarketAudioReactor.stop();
    }
  }, [status]);

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
  useEffect(() => {
    if (status === GameStatus.PLAYING) {
      let isCancelled = false;
      let marketAudioStartTimeoutId: ReturnType<typeof setTimeout> | null = null;

      // Integrated Warmup Flow: Snapshot -> Warmup -> Realtime Stream
      const initFlow = async () => {
        try {
          Logger.info('[GameEngine] Starting market sync flow...');

          // 1. Fetch historical data (Snapshot)
          const history = await MarketStateService.fetchMarketHistory(pair, 300);
          if (isCancelled) return;

          // 2. Warm up client indicators (deterministic initial state)
          ClientIndicatorService.setPair(pair);
          ClientIndicatorService.setPosition(position);
          await ClientIndicatorService.warmup(history);
          if (isCancelled) return;
          const clientIndicatorState = ClientIndicatorService.getState();
          if (isCancelled) return;
          state.current.rsiVisualState = clientIndicatorState.rsiState;
          lastWhaleTierRef.current = clientIndicatorState.whaleTier;

          // 3. Initialize Realtime subscription
          await MarketStateService.init();
          if (isCancelled) {
            MarketStateService.cleanup();
            return;
          }

          Logger.info('[GameEngine] Market state perfect sync complete');
        } catch (err) {
          if (isCancelled) return;
          Logger.error('[GameEngine] Market sync flow failed:', err);
        }
      };

      void initFlow();

      // Initialize market engines with game context
      const currentLeverage = difficultyContext.getContext().inputs.leverage;
      PriceMomentumEngine.setContext(position, currentLeverage);

      // Start market-synced audio pulse (delayed to let audio context fully init)
      marketAudioStartTimeoutId = setTimeout(() => {
        if (!isCancelled) {
          MarketAudioReactor.start();
        }
      }, 500);

      // Market Events for Visual Effects
      const handleClientIndicators = (data: ClientIndicatorsUpdatedEvent) => {
        if (data.rsiState !== state.current.rsiVisualState) {
          Logger.info(`[GameEngine] RSI Visual State: ${data.rsiState}`);
        }
        state.current.rsiVisualState = data.rsiState;

        const nextWhaleTier = data.whaleTier;
        if (nextWhaleTier > lastWhaleTierRef.current && nextWhaleTier > 0) {
          state.current.whaleEventTimer = 2000; // 2 seconds of effect
          state.current.shake = 15 + nextWhaleTier * 5; // Big shake
        }
        lastWhaleTierRef.current = nextWhaleTier;
      };

      const unsubClientIndicators = EventBus.on(
        'clientIndicatorsUpdated',
        handleClientIndicators
      );

      return () => {
        isCancelled = true;
        if (marketAudioStartTimeoutId !== null) {
          clearTimeout(marketAudioStartTimeoutId);
          marketAudioStartTimeoutId = null;
        }
        MarketStateService.cleanup();
        MarketAudioReactor.stop();
        unsubClientIndicators();
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
      const nowMs = typeof performance !== 'undefined' ? performance.now() : Date.now();
      const adjustedDuration = hitStopGovernorRef.current.getAdjustedDuration(
        data,
        nowMs
      );

      if (adjustedDuration <= 0) return;

      // Take the max duration, but cap chained freeze for smoothness.
      state.current.hitStopTimer = Math.min(
        GAME_ENGINE.HIT_STOP_CHAIN_CAP_MS,
        Math.max(state.current.hitStopTimer, adjustedDuration)
      );
    });

    return unsubscribe;
  }, []);

  // Listen for high-frequency market updates directly to avoid React re-render overhead
  useEffect(() => {
    const unsub = EventBus.on('gameMarketUpdate', (data: MarketData) => {
      marketDataRef.current = data;

      // Feed PriceMomentumEngine with every price tick
      if (data.price > 0) {
        PriceMomentumEngine.update(data.price, Date.now());
      }
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

  // Expose concise state snapshot for Playwright smoke validation.
  useEffect(() => {
    const gameWindow = window as Window & {
      render_game_to_text?: () => string;
    };

    gameWindow.render_game_to_text = () => {
      const currentPlayer = playerRef.current;
      const currentState = state.current;
      const currentPool = pool.current;

      return JSON.stringify({
        note: 'origin=(top-left), +x=right, +y=down',
        status,
        player: {
          x: Number(currentPlayer.x.toFixed(1)),
          y: Number(currentPlayer.y.toFixed(1)),
          hp: Number(currentPlayer.hp.toFixed(1)),
          level: currentPlayer.level,
        },
        pacing: {
          spawnRateMultiplier: Number(currentState.spawnRateMultiplier.toFixed(3)),
          atrPercent: Number(currentState.atrPercent.toFixed(4)),
          isDashing: currentState.isDashing,
          shake: Number(currentState.shake.toFixed(2)),
        },
        enemies: currentPool.activeEnemies.slice(0, 12).map(enemy => ({
          x: Number(enemy.x.toFixed(1)),
          y: Number(enemy.y.toFixed(1)),
          hp: Number(enemy.health.toFixed(1)),
          type: enemy.type,
        })),
        counts: {
          enemies: currentPool.activeEnemies.length,
          bullets: currentPool.activeBullets.length,
          gems: currentPool.activeGems.length,
        },
      });
    };

    return () => {
      delete gameWindow.render_game_to_text;
    };
  }, [playerRef, pool, state, status]);

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

      // Update Visual Effects Service (Decay intensities)
      VisualEffectService.update(deltaTime);

      // Apply volatility-driven shake only during active gameplay.
      if (status === GameStatus.PLAYING) {
        const shockIntensity = VisualEffectService.getIntensity();
        if (shockIntensity > 0) {
          const leverage = difficultyContext.getContext().inputs.leverage;
          const scaledShock = VisualEffectService.calculateLeverageScaledIntensity(
            shockIntensity,
            leverage
          );
          // Apply immediate shake boost - don't clamp here to allow high-leverage "chaos"
          s.shake = Math.max(s.shake, scaledShock * 5);
        }
      }

      // Update background candles (even when paused for visual continuity, but skip if menu)
      if (status !== GameStatus.MENU) {
        // Use PriceMomentumEngine for intensity-driven background
        const priceMom = PriceMomentumEngine.getLatest();
        // Amplify wave multiplier with market intensity (background moves faster in surging/crashing)
        const marketAmpWave =
          marketDataRef.current.difficulty * (1.0 + priceMom.intensity * 0.6);
        // Use velocity direction as momentum for parallax drift
        const driftMomentum = priceMom.velocity * 50; // Scale velocity for visible parallax

        renderer.current.updateBackgroundCandles(
          state.current,
          marketDataRef.current.pnl,
          marketAmpWave,
          driftMomentum,
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
        const maxHp = 100 + (player.level - 1) * 10; // Base HP calculation
        const hpPercent = (player.hp / maxHp) * 100;
        const killStreak = ComboSystem.getKillStreak();

        // Update AI Director (Brain) with Player Power Specs
        AIDirector.setPlayerStats(
          player.baseDamage,
          player.fireRate,
          player.projectiles,
          killStreak,
          // Calculate Dash Pressure (0 = Ready, >0 = Cooldown/Panic)
          s.dashCooldownTimer > 0 ? s.dashCooldownTimer / GAME_ENGINE.DASH_COOLDOWN : 0
        );
        AIDirector.update(time);

        // Update Portal System
        portalSystem.update(deltaTime, width, height);

        // Update Gatekeeper Orbit positions & Knockback
        const portal = portalSystem.getState();
        if (portal.isActive) {
          const enemies = p.activeEnemies;
          for (let i = 0; i < enemies.length; i++) {
            const enemy = enemies[i]!;
            if (enemy.type === 'gatekeeper' && enemy.orbitPoint) {
              const e = enemy;
              const orbitSpeed = 0.02 * dtFactor;
              e.orbitAngle = (e.orbitAngle ?? 0) + orbitSpeed;
              enemy.x = e.orbitPoint!.x + Math.cos(e.orbitAngle) * 80;
              enemy.y = e.orbitPoint!.y + Math.sin(e.orbitAngle) * 80;

              // Knockback player if touching
              const dist = Math.hypot(player.x - enemy.x, player.y - enemy.y);
              if (dist < player.radius + enemy.radius) {
                const kx = (player.x - enemy.x) / dist;
                const ky = (player.y - enemy.y) / dist;
                player.x += kx * 5 * dtFactor;
                player.y += ky * 5 * dtFactor;
              }
            }
          }

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

        // Update metrics system
        const wavePhase = 'active'; // AI Director V2: Wave phases removed

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

        // Combat System - Auto Fire (only targets on-screen enemies)
        const didAttack = combatSystem.current.processAutoFire(
          p,
          player,
          s,
          deltaTime,
          width,
          height
        );

        const movementMagnitude = Math.min(1, Math.hypot(dx, dy));

        const coreInput = coreLoopInputRef.current;
        coreInput.deltaMs = deltaTime;
        coreInput.hpPercent = hpPercent;
        coreInput.enemyCount = p.activeEnemies.length;
        coreInput.killStreak = killStreak;
        coreInput.movementMagnitude = movementMagnitude;
        coreInput.didAttack = didAttack;
        coreInput.isDashing = s.isDashing;
        coreInput.nowMs = Date.now();

        const coreLoopOutput = coreLoopRef.current.update(coreInput);

        if (!s.isDashing) {
          const pulseLerp = Math.min(1, (0.08 + coreLoopOutput.pulse * 0.1) * dtFactor);
          s.playerScaleX = lerp(
            s.playerScaleX,
            coreLoopOutput.playerScaleTargetX,
            pulseLerp
          );
          s.playerScaleY = lerp(
            s.playerScaleY,
            coreLoopOutput.playerScaleTargetY,
            pulseLerp
          );
        }

        if (coreLoopOutput.shakeBoost > 0) {
          s.shake = Math.max(s.shake, coreLoopOutput.shakeBoost);
        }

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

        const layout = getHUDLayout(device.platform);
        const perfConfig = DeviceBenchmarkService.getPerformanceConfig();

        // Use the lower of layout limit and performance config limit
        const maxEnemies = Math.min(layout.maxEnemies, perfConfig.maxEnemies);

        // 0. Sync Market Metadata from marketDataRef
        state.current.atrPercent = marketDataRef.current.atrPercent ?? 0;

        // Feed LeverageEngine (controls Risk/Reward XP and Damage)
        LeverageEngine.updateMarketState(
          state.current.atrPercent,
          marketDataRef.current.pnl
        );

        state.current.spawnRateMultiplier =
          (marketDataRef.current.spawnRateMultiplier ?? 1) *
          coreLoopOutput.spawnMultiplier;
        state.current.marketPosition = position;

        // 1. Update Sub-systems (Physics, Spawning, etc.)
        const spawnOpts = spawnOptionsRef.current;
        spawnOpts.rsi = marketDataRef.current.rsi;
        spawnOpts.rsiState = marketDataRef.current.rsiState ?? 'NEUTRAL';
        spawnOpts.whaleTier = marketDataRef.current.whaleTier ?? 0;

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
          // marketData enemy damage/speed already include leverage-aware difficulty output.
          // Applying LeverageEngine enemy multipliers here double-counts leverage and causes
          // near-instant deaths at high leverage (e.g. 100x).
          (marketDataRef.current.enemyDamage ?? 1) *
            coreLoopOutput.enemyDamageMultiplier,
          (marketDataRef.current.enemySpeed ?? 1) * coreLoopOutput.enemySpeedMultiplier,
          spawnOpts
        );

        // --- INTERACTABLE SPAWN LOGIC ---
        s.interactableSpawnTimer = s.interactableSpawnTimer + deltaTime;
        if (s.interactableSpawnTimer > 30000) {
          // Every 30 seconds wait for a random loot crate
          s.interactableSpawnTimer = 0;
          const pad = 100;
          const rx = pad + Math.random() * (width - pad * 2);
          const ry = pad + Math.random() * (height - pad * 2);

          p.getInteractable('LOOT_CRATE', rx, ry, 150);

          // Only show supply drop notifications in development mode
          if (import.meta.env.DEV) {
            EventBus.emit('gameNotification', {
              title: t('hud.announcer.supply_drop') as string,
              message: t('hud.announcer.loot_crate_appeared') as string,
              type: 'success',
            });
          }
          audio.playLevelUp();
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
      t,
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
    <div className="relative h-full w-full cursor-none">
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
