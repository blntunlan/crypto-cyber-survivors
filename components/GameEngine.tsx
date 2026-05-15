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
import { PoolManager } from '../services/combat/PoolManager';
import { GameRenderer } from '../services/renderers/GameRenderer';
import { useGameInput } from '../hooks/useGameInput';
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
import { railwayClient } from '../services/api/RailwayClient';
import { ClientIndicatorService } from '../services/indicators/ClientIndicatorService';
import { Logger } from '../services/system/Logger';
import { EventBus } from '../services/core/EventBus';
import { EngineRegistry } from '../services/core/EngineRegistry';
import { difficultyContext } from '../services/difficulty/DifficultyContext';
import { PortalSystemV2 } from '../services/gameplay/PortalSystemV2';
import { checkPortalCollision } from '../services/gameplay/portal/portalCollision';
import { type RewardPayload } from '../types/reward';
import { GameEndReason } from '../types/metrics';
import { GameMode } from '../types/gameMode';
import { evaluateCycleTimer } from '../services/gameplay/loop/cycleTimer';
import { VisualEffectService } from '../services/gameplay/VisualEffectService';
import { HitStopGovernor } from '../services/gameplay/HitStopGovernor';
import { CoreGameplayLoop } from '../services/gameplay/CoreGameplayLoop';
import { PlayerPowerAnalyzer } from '../services/difficulty/PlayerPowerAnalyzer';
import { LeverageEngine } from '../services/gameplay/LeverageEngine';
import type {
  MutableRef,
  PhaseName,
  PoolLikeRef,
  TickContext,
} from '../services/gameplay/contracts';
import {
  GameLoopCoordinator,
  PhaseProfiler,
  type GameLoopPhase,
} from '../services/gameplay/loop';
import {
  InputPhase,
  CombatPhase,
  SpawnPhase,
  PhysicsPhase,
  EffectsPhase,
  DifficultyPhase,
  PortalPhase,
  MetricsPhase,
} from '../services/gameplay/phases';
import { PriceMomentumEngine } from '../services/market/PriceMomentumEngine';
import { MarketEventAnnouncer } from '../services/market/MarketEventAnnouncer';
import { MarketAudioReactor } from '../services/audio/MarketAudioReactor';
import { WeaponSystem } from '../services/combat/WeaponSystem';
import { eliteAbilitySystem } from '../services/combat/EliteAbilitySystem';
import { useGameEngineEvents } from '../hooks/useGameEngineEvents';
import { ReplayRecorderService } from '../services/replay/ReplayRecorderService';
import { useLanguage } from '../contexts/LanguageContext';
import { type ClientIndicatorsUpdatedEvent } from '../types/events';
import { updateNearMissFeedbackTimers } from '../services/gameplay/NearMissTiming';

import { useLazyRef } from '../hooks/useLazyRef';

// Custom hooks for GameEngine
import { useGameSetup } from '../hooks/useGameSetup';
import { useGameEvents } from '../hooks/useGameEvents';
import { useGameStatusEffects } from '../hooks/useGameStatusEffects';

const DEBUG_API_ENABLED =
  import.meta.env.DEV || import.meta.env.VITE_ENABLE_DEBUG_API === 'true';

interface GameEngineProps {
  status: GameStatus;
  position: MarketPosition;
  pair: CryptoPair;
  marketData: MarketData;
  onGameOver: (reason?: GameEndReason, rewardPayload?: RewardPayload) => void;
  onLevelUp: () => void;
  updatePlayerStats: (player: Player) => void;
  playerRef: React.RefObject<Player>;
  width: number;
  height: number;
  gameMode?: GameMode;
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
  gameMode = GameMode.COMPETITIVE,
}) => {
  const { t } = useLanguage();
  const tRef = useRef(t);
  tRef.current = t;
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const requestRef = useRef<number | undefined>(undefined);

  // Use singleton instances for heavy systems (Architectural Compliance)
  const pool = useRef(PoolManager.getInstance());
  const renderer = useLazyRef(() => GameRenderer.getInstance());
  const combatSystem = useRef(CombatSystem.getInstance());
  const physicsSystem = useRef(PhysicsSystem.getInstance());
  const spawnSystemRef = useLazyRef(() => SpawnSystem.getInstance());
  const speedLineSpawner = useLazyRef(() => new SpeedLineSpawner());
  const lastCycleRef = useRef(1);

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
  const graphicsRef = useRef({
    showParticles: graphicsSettings.showParticles,
    showDamageNumbers: graphicsSettings.showDamageNumbers,
    showScreenShake: graphicsSettings.showScreenShake,
  });
  useEffect(() => {
    graphicsRef.current.showParticles = graphicsSettings.showParticles;
    graphicsRef.current.showDamageNumbers = graphicsSettings.showDamageNumbers;
    graphicsRef.current.showScreenShake = graphicsSettings.showScreenShake;
  }, [graphicsSettings]);

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
  const hitStopGovernorRef = useLazyRef(() => new HitStopGovernor());
  const coreLoopRef = useLazyRef(() => new CoreGameplayLoop());
  const playerPowerAnalyzerRef = useLazyRef(() => new PlayerPowerAnalyzer());
  const lastWhaleTierRef = useRef<0 | 1 | 2 | 3>(0);
  const gameplayFrameRef = useRef(0);
  const phaseSharedRef = useRef<Record<string, unknown>>({});
  const lastPhaseErrorLogTimeRef = useRef(0);
  const phaseProfilerRef = useLazyRef(() => new PhaseProfiler());
  const lastPhaseTickRef = useRef({
    completedPhaseIds: [] as string[],
    errorCount: 0,
  });
  // Pre-allocated tick context to avoid per-frame object creation
  const tickContextRef = useRef<TickContext>({
    clock: { frame: 0, nowMs: 0, deltaMs: 0, elapsedMs: 0 },
    status: GameStatus.PLAYING,
    dimensions: { width: 0, height: 0 },
    world: {
      player: { current: null } as MutableRef<Player | null>,
      gameState: { current: null } as unknown as MutableRef<GameState>,
      pool: { current: null } as unknown as MutableRef<PoolLikeRef>,
    },
    marketData: {} as MarketData,
    telemetry: {
      phaseDurationsMs: {},
      counters: {},
      marks: {},
    },
  });

  const gameLoopCoordinatorRef = useLazyRef(() => {
    const difficultyPhase = new DifficultyPhase();
    const inputPhase = new InputPhase();
    const combatPhase = new CombatPhase();
    const spawnPhase = new SpawnPhase();
    const physicsPhase = new PhysicsPhase();
    const effectsPhase = new EffectsPhase();
    const portalPhase = new PortalPhase();
    const metricsPhase = new MetricsPhase();

    const wrapPhase = <T extends PhaseName>(phase: {
      phase: T;
      execute: (args: {
        phase: T;
        context: TickContext;
        shared: Record<string, never>;
      }) => { shared?: Record<string, unknown> };
    }) => ({
      id: phase.phase,
      execute: (context: TickContext) => {
        const result = phase.execute({
          phase: phase.phase,
          context,
          shared: phaseSharedRef.current as Record<string, never>,
        });
        if (result.shared) {
          Object.assign(
            phaseSharedRef.current,
            result.shared as Record<string, unknown>
          );
        }
      },
    });

    const phases: GameLoopPhase<TickContext>[] = [
      wrapPhase(difficultyPhase),
      {
        id: inputPhase.phase,
        execute: context => {
          const result = inputPhase.execute({
            phase: inputPhase.phase,
            context,
            shared: phaseSharedRef.current as Record<string, never>,
          });
          if (result.shared) {
            Object.assign(
              phaseSharedRef.current,
              result.shared as Record<string, unknown>
            );
          }
        },
      },
      {
        id: combatPhase.phase,
        execute: context => {
          const result = combatPhase.execute({
            phase: combatPhase.phase,
            context,
            shared: phaseSharedRef.current as Record<string, never>,
          });
          if (result.shared) {
            Object.assign(
              phaseSharedRef.current,
              result.shared as Record<string, unknown>
            );
          }
        },
      },
      {
        id: spawnPhase.phase,
        execute: context => {
          const result = spawnPhase.execute({
            phase: spawnPhase.phase,
            context,
            shared: phaseSharedRef.current as Record<string, never>,
          });
          if (result.shared) {
            Object.assign(
              phaseSharedRef.current,
              result.shared as Record<string, unknown>
            );
          }
        },
      },
      {
        id: physicsPhase.phase,
        execute: context => {
          const result = physicsPhase.execute({
            phase: physicsPhase.phase,
            context,
            shared: phaseSharedRef.current as Record<string, never>,
          });
          if (result.shared) {
            Object.assign(
              phaseSharedRef.current,
              result.shared as Record<string, unknown>
            );
          }
        },
      },
      {
        id: effectsPhase.phase,
        execute: context => {
          const result = effectsPhase.execute({
            phase: effectsPhase.phase,
            context,
            shared: phaseSharedRef.current as Record<string, never>,
          });
          if (result.shared) {
            Object.assign(
              phaseSharedRef.current,
              result.shared as Record<string, unknown>
            );
          }
        },
      },
      wrapPhase(portalPhase),
      wrapPhase(metricsPhase),
    ];

    return new GameLoopCoordinator<TickContext>(phases, {
      errorPolicy: 'collect',
      hooks: {
        beforePhase: (phase, context) => {
          phaseProfilerRef.current.beforePhase(phase, context);
        },
        afterPhase: (phase, context, phaseHadError) => {
          phaseProfilerRef.current.afterPhase(phase, context, phaseHadError);
        },
        onError: phaseError => {
          phaseProfilerRef.current.recordError(phaseError);
          Logger.warn('[GameLoopCoordinator] Phase execution error', {
            phaseId: phaseError.phaseId,
            stage: phaseError.stage,
          });
        },
      },
    });
  });

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
    playerPower: 0,
    offensePower: 0,
    counterPressure: 0,
    rangedPressure: 0,
    screenPressure: 0,
  });

  useEffect(() => {
    marketDataRef.current = marketData;
  }, [marketData]);

  useEffect(() => {
    if (status !== GameStatus.PLAYING) {
      hitStopGovernorRef.current.reset();
      phaseProfilerRef.current.reset();
      MarketAudioReactor.stop();
      MarketEventAnnouncer.reset();
    }
    if (status === GameStatus.GAMEOVER || status === GameStatus.MENU) {
      coreLoopRef.current.reset();
      playerPowerAnalyzerRef.current.reset();
    }
    if (status === GameStatus.MENU) {
      lastCycleRef.current = 1;
    }
  }, [
    phaseProfilerRef,
    status,
    coreLoopRef,
    hitStopGovernorRef,
    playerPowerAnalyzerRef,
  ]);

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
      const cancelRef = { current: false };
      let marketAudioStartTimeoutId: ReturnType<typeof setTimeout> | null = null;

      // Integrated Warmup Flow: Snapshot -> Warmup -> Realtime Stream
      const initFlow = async () => {
        try {
          Logger.info('[GameEngine] Starting market sync flow...');

          // 1. Fetch historical data (Snapshot) from Railway API
          const history = await railwayClient
            .get<
              Array<{ price: number; volume: number; timestamp: number }>
            >(`/api/v1/market/history?pair=${pair}&limit=300`)
            .catch(
              () => [] as Array<{ price: number; volume: number; timestamp: number }>
            );
          if (cancelRef.current) return;

          // 2. Warm up client indicators (deterministic initial state)
          ClientIndicatorService.setPair(pair);
          ClientIndicatorService.setPosition(position);
          await ClientIndicatorService.warmup(history);
          // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
          if (cancelRef.current) return;
          const clientIndicatorState = ClientIndicatorService.getState();
          // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
          if (cancelRef.current) return;
          state.current.rsiVisualState = clientIndicatorState.rsiState;
          lastWhaleTierRef.current = clientIndicatorState.whaleTier;

          // 3. SSE market stream is initialized by useMarketData hook
          // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
          if (cancelRef.current) return;

          Logger.info('[GameEngine] Market state perfect sync complete');
        } catch (err) {
          if (cancelRef.current) return;
          Logger.error('[GameEngine] Market sync flow failed:', err);
        }
      };

      void initFlow();

      // Initialize market engines with game context
      const currentLeverage = difficultyContext.inputs.leverage;
      PriceMomentumEngine.setContext(position, currentLeverage);

      // Start market-synced audio pulse (delayed to let audio context fully init)
      marketAudioStartTimeoutId = setTimeout(() => {
        if (!cancelRef.current) {
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
        cancelRef.current = true;
        if (marketAudioStartTimeoutId !== null) {
          clearTimeout(marketAudioStartTimeoutId);
          marketAudioStartTimeoutId = null;
        }
        // SSE cleanup handled by useMarketData hook
        MarketAudioReactor.stop();
        unsubClientIndicators();
      };
    }
    // No cleanup needed if we didn't initialize
    return undefined;
  }, [status, pair, position]);

  // Extracted EventBus listeners: hitStop, gameMarketUpdate, nearMiss, weaponFired audio
  useGameEngineEvents({
    stateRef: state,
    marketDataRef,
    hitStopGovernorRef,
    position,
    status,
  });

  // Expose concise state snapshot for Playwright smoke validation.
  useEffect(() => {
    if (!DEBUG_API_ENABLED) {
      return;
    }

    window.render_game_to_text = () => {
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
        enemies: (() => {
          const maxEnemies = Math.min(12, currentPool.activeEnemies.length);
          const enemiesList = new Array(maxEnemies);
          for (let i = 0; i < maxEnemies; i++) {
            const enemy = currentPool.activeEnemies[i]!;
            enemiesList[i] = {
              x: Number(enemy.x.toFixed(1)),
              y: Number(enemy.y.toFixed(1)),
              hp: Number(enemy.health.toFixed(1)),
              type: enemy.type,
            };
          }
          return enemiesList;
        })(),
        counts: {
          enemies: currentPool.activeEnemies.length,
          bullets: currentPool.activeBullets.length,
          gems: currentPool.activeGems.length,
        },
        phases: {
          completed: lastPhaseTickRef.current.completedPhaseIds,
          errorCount: lastPhaseTickRef.current.errorCount,
          profiler: phaseProfilerRef.current.getSnapshot(),
        },
      });
    };

    return () => {
      delete window.render_game_to_text;
    };
  }, [phaseProfilerRef, playerRef, pool, state, status]);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    renderer.current.render(
      ctx,
      width,
      height,
      state.current,
      playerRef.current!,
      pool.current,
      status,
      graphicsRef.current
    );
  }, [width, height, status, playerRef, pool, renderer]);

  const update = useCallback(
    (time: number) => {
      const frameStart = performance.now();
      FPSMonitor.tick();
      const s = state.current;
      const player = playerRef.current;
      const p = pool.current;

      const deltaTime = TimeService.update(time);

      const dtFactor = updateNearMissFeedbackTimers(s, deltaTime);
      s.lastTime = time;

      gameplayFrameRef.current += 1;

      // Update Visual Effects Service (Decay intensities)
      VisualEffectService.update(deltaTime);

      // Apply volatility-driven shake only during active gameplay.
      if (status === GameStatus.PLAYING) {
        const shockIntensity = VisualEffectService.getIntensity();
        if (shockIntensity > 0) {
          const leverage = difficultyContext.inputs.leverage;
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

        // Difficulty and Portal updates are now handled by DifficultyPhase and PortalPhase
        // in the GameLoopCoordinator pipeline (Step 5).
        const maxHp = 100 + (player.level - 1) * 10; // Base HP calculation
        const hpPercent = (player.hp / maxHp) * 100;
        const killStreak = ComboSystem.getKillStreak();

        // Update Gatekeeper Orbit positions & Knockback
        const portal = PortalSystemV2.getPortalState();
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
              if (dist > 0 && dist < player.radius + enemy.radius) {
                const kx = (player.x - enemy.x) / dist;
                const ky = (player.y - enemy.y) / dist;
                player.x += kx * 5 * dtFactor;
                player.y += ky * 5 * dtFactor;
              }
            }
          }

          // Portal Collision Check (Extraction)
          const portalHit = checkPortalCollision(
            player.x,
            player.y,
            player.radius,
            portal.x,
            portal.y,
            portal.radius
          );
          if (portalHit.collides) {
            // V2: enterPortal() calculates rewards and closes portal internally
            const coinReward = PortalSystemV2.enterPortal();

            // Build RewardPayload from CoinRewardResult + service data
            const rewardPayload: RewardPayload = {
              kills: PortalSystemV2.getKillCount(),
              level: PortalSystemV2.getCurrentLevel(),
              survivalSeconds: TimeService.getGameTimeSeconds(),
              pnlPercent: marketDataRef.current.pnl,
              maxStreak: ComboSystem.getMaxStreak(),
              exitType: coinReward.exitType,
              portalType: coinReward.portalType,
              rawCoins: coinReward.breakdown.raw,
              enemyDropCoins: coinReward.breakdown.enemyDrops,
              totalCoins: coinReward.total,
              breakdown: {
                base: coinReward.breakdown.survivalBonus,
                survival: coinReward.breakdown.survivalBonus,
                kill: coinReward.breakdown.raw,
                level: coinReward.breakdown.levelBonus,
                market: coinReward.breakdown.marketBonus,
                streak: coinReward.breakdown.comboBonus,
                portal: coinReward.breakdown.portalBonus,
              },
            };

            EventBus.emit('portalExtraction', {
              totalCoins: rewardPayload.totalCoins,
              rawCoins: rewardPayload.rawCoins,
              bonus:
                coinReward.breakdown.portalBonus + coinReward.breakdown.survivalBonus,
              kills: rewardPayload.kills,
              level: rewardPayload.level,
              survivalSeconds: rewardPayload.survivalSeconds,
              pnlPercent: rewardPayload.pnlPercent,
              maxStreak: rewardPayload.maxStreak,
              exitType: rewardPayload.exitType,
              portalType: rewardPayload.portalType,
              enemyDropCoins: rewardPayload.enemyDropCoins,
            });

            Logger.info('[GameEngine] Portal extraction complete', {
              total: coinReward.total,
              exitType: coinReward.exitType,
              portalType: coinReward.portalType,
            });

            onGameOver(GameEndReason.PORTAL, rewardPayload); // Exit run
          }
        }

        // Cycle Timer: auto-emit cycleComplete at cycle boundaries (COMPETITIVE mode)
        {
          const elapsed = TimeService.getGameTimeSeconds();
          const cycle = evaluateCycleTimer(elapsed, lastCycleRef.current, gameMode);
          if (cycle.shouldEmit) {
            lastCycleRef.current = cycle.currentCycle;
            Logger.info(
              `[GameEngine] Cycle ${cycle.currentCycle} complete at ${elapsed.toFixed(0)}s`
            );
            EventBus.emit('cycleComplete', {
              cycleNumber: cycle.currentCycle,
              totalElapsedSeconds: elapsed,
            });
          }
        }

        // Combo, BuffManager, and MetricsService updates are now in MetricsPhase (Step 5).
        // BuffManager.updateBaseStats needs direct player ref, keep it here.
        BuffManager.updateBaseStats(player);

        // Update buff gem spawner (spawns gems based on volatility)
        BuffGemSpawner.updateDimensions(width, height);
        BuffGemSpawner.update(marketDataRef.current.difficulty, deltaTime);

        // Update Speed Lines
        speedLineSpawner.current.update(p, s, player, width, height, time);

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

        // Mutate pre-allocated shared object instead of creating new one each frame
        const shared = phaseSharedRef.current;
        shared.deltaTime = deltaTime;
        shared.dtFactor = dtFactor;
        shared.timeMs = time;
        shared.width = width;
        shared.height = height;
        shared.deviceIsMobile = device.isMobile;
        shared.combatSystem = combatSystem.current;
        shared.getMovementVector = getMovementVector;
        shared.isDashPressed = isSpacePressed;
        shared.isDashFreshPress = isSpaceFreshPress;
        shared.consumeDash = consumeDash;

        // Reuse pre-allocated tick context to avoid per-frame GC pressure
        const tick = tickContextRef.current;
        tick.clock.frame = gameplayFrameRef.current;
        tick.clock.nowMs = time;
        tick.clock.deltaMs = deltaTime;
        tick.clock.elapsedMs = TimeService.getGameTime();
        tick.status = status;
        tick.dimensions.width = width;
        tick.dimensions.height = height;
        tick.world.player = playerRef as unknown as MutableRef<Player | null>;
        tick.world.gameState = state as unknown as MutableRef<GameState>;
        tick.world.pool = pool as unknown as MutableRef<PoolLikeRef>;
        tick.marketData = marketDataRef.current;
        // Reset telemetry (reassign to avoid V8 hidden-class deopt from delete)
        tick.telemetry.phaseDurationsMs = {};
        tick.telemetry.counters = {};
        tick.telemetry.marks = {};

        const phaseTickResult = gameLoopCoordinatorRef.current.runTickSync(tick);
        lastPhaseTickRef.current = {
          completedPhaseIds: phaseTickResult.completedPhaseIds,
          errorCount: phaseTickResult.errors.length,
        };

        if (phaseTickResult.errors.length > 0) {
          // Throttle warning logs to avoid console spam during frame loop.
          if (time - lastPhaseErrorLogTimeRef.current > 1000) {
            const firstError = phaseTickResult.errors[0];
            if (firstError) {
              Logger.warn('[GameLoopCoordinator] Tick completed with phase errors', {
                errorCount: phaseTickResult.errors.length,
                firstPhaseId: firstError.phaseId,
                firstStage: firstError.stage,
              });
            }
            lastPhaseErrorLogTimeRef.current = time;
          }
        }

        const movementVector = phaseSharedRef.current.inputVector as
          | { dx: number; dy: number }
          | undefined;
        const dx = movementVector?.dx ?? 0;
        const dy = movementVector?.dy ?? 0;

        const didAttack =
          typeof phaseSharedRef.current.didAttack === 'boolean'
            ? phaseSharedRef.current.didAttack
            : false;

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
        const playerPowerState = playerPowerAnalyzerRef.current.updateFromValues(
          player,
          p.activeEnemies.length,
          maxEnemies,
          killStreak,
          WeaponSystem.getWeapons(),
          coreLoopOutput.flowState
        );
        difficultyContext.updatePlayerPower(
          playerPowerState.playerPower,
          playerPowerState.offensePower,
          playerPowerState.counterPressure,
          playerPowerState.rangedPressure
        );

        const spawnOpts = spawnOptionsRef.current;
        spawnOpts.rsi = marketDataRef.current.rsi;
        spawnOpts.rsiState = marketDataRef.current.rsiState ?? 'NEUTRAL';
        spawnOpts.whaleTier = marketDataRef.current.whaleTier ?? 0;
        spawnOpts.playerPower = playerPowerState.playerPower;
        spawnOpts.offensePower = playerPowerState.offensePower;
        spawnOpts.counterPressure = playerPowerState.counterPressure;
        spawnOpts.rangedPressure = playerPowerState.rangedPressure;
        spawnOpts.screenPressure = playerPowerState.screenPressure;

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
              title: tRef.current('hud.announcer.supply_drop') as string,
              message: tRef.current('hud.announcer.loot_crate_appeared') as string,
              type: 'success',
            });
          }
          audio.playLevelUp();
        }

        // Update Physics & Collisions
        const physStart = performance.now();
        physicsSystem.current.updateEntities(p, dtFactor, width, height, player);
        eliteAbilitySystem.update(
          deltaTime / 1000,
          p.activeEnemies,
          player,
          p,
          p.activeEnemies
        );
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

        // Update Weapon System (market-driven weapon firing via shared pipeline)
        WeaponSystem.update(
          deltaTime,
          player.x,
          player.y,
          player.baseDamage,
          {
            atrPercent: marketDataRef.current.atrPercent ?? 0,
            rsiState: marketDataRef.current.rsiState ?? 'NEUTRAL',
            pnl: marketDataRef.current.pnl,
            volumeNorm: marketDataRef.current.difficulty,
            isFavorable: marketDataRef.current.pnl >= 0,
          },
          pool.current,
          width,
          height
        );

        // Record replay snapshot (every 500ms internally)
        ReplayRecorderService.tick(
          deltaTime,
          player.x,
          player.y,
          player.hp,
          player.level
        );

        // Only update React state if meaningful stats changed AND enough time passed (Throttle 100ms)
        // Exception: Always update immediately on Level Up
        const shouldSync =
          !TimeService.isClockPaused() &&
          (player.level !== lastSyncedStats.current.level ||
            (time - lastSyncedStats.current.lastTime >
              GAME_ENGINE.STATS_SYNC_THROTTLE_MS &&
              (player.hp !== lastSyncedStats.current.hp ||
                player.exp !== lastSyncedStats.current.exp)));

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
      gameLoopCoordinatorRef,
      pair,
      gameMode,
      coreLoopRef,
      playerPowerAnalyzerRef,
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
          dashCooldownMs={
            GAME_ENGINE.DASH_COOLDOWN * (playerRef.current.dashCooldownMultiplier ?? 1)
          }
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
    prev.playerRef === next.playerRef &&
    prev.gameMode === next.gameMode
);

export default GameEngineShared;
