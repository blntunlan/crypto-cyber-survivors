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
import { type WeaponMarketContext } from '../types/weapons';
import { COLORS, GAME_ENGINE } from '../constants';
import { useGameInput } from '../hooks/useGameInput';
import { ComboSystem } from '../services/combat/ComboSystem';
import { TimeService } from '../services/core/TimeService';
import { getHUDLayout } from '../config/UILayout';
import { useGameStore, selectGraphics } from '../stores/gameStore';
import { GameHUD } from './GameHUD';
import { MobileControls } from './mobile';
import { useDevice } from '../hooks/useDevice';
import { DeviceBenchmarkService } from '../services/system/DeviceBenchmarkService';
import { FPSMonitor } from '../services/system/FPSMonitor';
import {
  RuntimeDiagnosticsService,
  type RuntimeDiagnosticsFrameInput,
} from '../services/system/RuntimeDiagnosticsService';
import { BuffManager } from '../services/patterns/decorators/BuffManager';
import { BuffGemSpawner } from '../services/spawners/BuffGemSpawner';
import { SpeedLineSpawner } from '../services/spawners/SpeedLineSpawner';
import { lerp } from '../utils/math';
import { audio } from '../services/audio';
import { marketApiClient } from '../services/api/MarketApiClient';
import { ClientIndicatorService } from '../services/indicators/ClientIndicatorService';
import { Logger } from '../services/system/Logger';
import { EventBus } from '../services/core/EventBus';
import { PortalSystemV2 } from '../services/gameplay/PortalSystemV2';
import { checkPortalCollision } from '../services/gameplay/portal/portalCollision';
import { type RewardPayload } from '../types/reward';
import { GameEndReason } from '../types/metrics';
import { GameMode } from '../types/gameMode';
import {
  evaluateCycleTimer,
  isCashOutRecoveryEligible,
} from '../services/gameplay/loop/cycleTimer';
import { type DifficultyPhaseDecision } from '../services/difficulty/runtime/DifficultyRuntime';
import { HitStopGovernor } from '../services/gameplay/HitStopGovernor';
import { FeedbackService } from '../services/gameplay/FeedbackService';
import { CoreGameplayLoop } from '../services/gameplay/CoreGameplayLoop';
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
import { type ClientIndicatorsUpdatedEvent } from '../types/events';
import { updateNearMissFeedbackTimers } from '../services/gameplay/NearMissTiming';
import { createGameRuntime } from '../services/gameplay/GameRuntime';
import {
  getRuntimeDebugFlags,
  resolveRuntimeCanvasDpr,
} from '../config/RuntimeDebugFlags';
import { deriveDirectorSeed } from '../services/director/DirectorSpawnOrchestrator';
import { type SpawnExecutorWorld } from '../services/combat/SpawnExecutor';
import { MarketEventConsolidator } from '../services/market/MarketEventConsolidator';
import { type LootCacheUpdateInput } from '../services/interfaces/ILootCacheSystem';

import { useLazyRef } from '../hooks/useLazyRef';

// Custom hooks for GameEngine
import { useGameSetup } from '../hooks/useGameSetup';
import { useGameEvents } from '../hooks/useGameEvents';
import { useGameStatusEffects } from '../hooks/useGameStatusEffects';

const DEBUG_API_ENABLED =
  import.meta.env.DEV || import.meta.env.VITE_ENABLE_DEBUG_API === 'true';

const resetPhaseDurations = (
  durations: Partial<Record<PhaseName, number>> | undefined
): void => {
  if (!durations) return;
  durations.difficulty = 0;
  durations.input = 0;
  durations.combat = 0;
  durations.spawn = 0;
  durations.physics = 0;
  durations.effects = 0;
  durations.portal = 0;
  durations.metrics = 0;
};

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
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const requestRef = useRef<number | undefined>(undefined);
  const runtimeDebugFlagsRef = useLazyRef(getRuntimeDebugFlags);
  const runtimeDebugFlags = runtimeDebugFlagsRef.current;
  const canvasDpr = resolveRuntimeCanvasDpr(runtimeDebugFlags);
  const canvasPixelWidth = Math.max(1, Math.round(width * canvasDpr));
  const canvasPixelHeight = Math.max(1, Math.round(height * canvasDpr));

  const runtimeRef = useLazyRef(() => createGameRuntime());
  const runtimeMountedRef = useRef(false);
  const pool = useRef(runtimeRef.current.poolManager);
  const renderer = useRef(runtimeRef.current.renderer);
  const combatSystem = useRef(runtimeRef.current.combatSystem);
  const physicsSystem = useRef(runtimeRef.current.physicsSystem);
  const spawnSystemRef = useRef(runtimeRef.current.spawnSystem);
  const spawnExecutorRef = useRef(runtimeRef.current.spawnExecutor);
  const difficultyContextRef = useRef(runtimeRef.current.difficultyContext);
  const lootCacheSystem = runtimeRef.current.lootCacheSystem;
  const directorSpawnWorldRef = useRef<SpawnExecutorWorld>({
    pool: runtimeRef.current.poolManager,
    position,
    maxActiveEnemies: 0,
  });
  const directorRunIdRef = useRef('');
  const directorRunSeedRef = useRef(0);
  const speedLineSpawner = useLazyRef(() => new SpeedLineSpawner());
  const lastCycleRef = useRef(1);
  const pendingCashOutCycleRef = useRef<number | null>(null);
  const cashOutRetryNotBeforeRef = useRef(0);

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
    showScreenShake:
      graphicsSettings.showScreenShake && !runtimeDebugFlags.noScreenShake,
    reducedMotion: graphicsSettings.reducedMotion,
    disableGlow: runtimeDebugFlags.noGlow,
  });
  useEffect(() => {
    graphicsRef.current.showParticles = graphicsSettings.showParticles;
    graphicsRef.current.showDamageNumbers = graphicsSettings.showDamageNumbers;
    graphicsRef.current.showScreenShake =
      graphicsSettings.showScreenShake && !runtimeDebugFlagsRef.current.noScreenShake;
    graphicsRef.current.reducedMotion = graphicsSettings.reducedMotion;
    graphicsRef.current.disableGlow = runtimeDebugFlagsRef.current.noGlow;
  }, [graphicsSettings, runtimeDebugFlagsRef]);

  useEffect(() => {
    FeedbackService.configure({
      hapticsEnabled: mobileSettings.hapticFeedback,
      isMobile: device.isMobile,
      reducedMotion: graphicsSettings.reducedMotion,
    });
  }, [device.isMobile, graphicsSettings.reducedMotion, mobileSettings.hapticFeedback]);

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
    playerRotation: 0,

    // Near Miss Tension
    nearMissTimer: 0,
    nearMissCooldown: 0,

    // Market Visuals
    rsiVisualState: 'NEUTRAL',
    whaleEventTimer: 0,
    targetBg: { r: 2, g: 6, b: 23 }, // Reusable object for background color updates

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
  const lastWhaleTierRef = useRef<0 | 1 | 2 | 3>(0);
  const gameplayFrameRef = useRef(0);
  const phaseSharedRef = useRef<Record<string, unknown>>({});
  const lastPhaseErrorLogTimeRef = useRef(0);
  const lastRawFrameTimeRef = useRef<number | null>(null);
  const phaseProfilerRef = useLazyRef(() => new PhaseProfiler());
  const lastPhaseTickRef = useRef({
    completedPhaseIds: [] as string[],
    errorCount: 0,
  });
  const diagnosticsFrameInputRef = useRef<RuntimeDiagnosticsFrameInput>({
    frame: 0,
    timestampMs: 0,
    gameTimeMs: 0,
    status: GameStatus.MENU,
    rafDeltaMs: GAME_ENGINE.MS_PER_FRAME,
    updateMs: 0,
    renderMs: 0,
    physicsMs: 0,
    phaseDurationsMs: null,
    entityCounts: {
      enemies: 0,
      bullets: 0,
      particles: 0,
      gems: 0,
      floatingTexts: 0,
      interactables: 0,
    },
    flags: {
      hitStopActive: false,
      levelUpFreezeActive: false,
    },
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
  const lootCacheUpdateInputRef = useRef<LootCacheUpdateInput>({
    deltaMs: 0,
    elapsedSeconds: 0,
    width: 0,
    height: 0,
    reducedMotion: false,
    showParticles: true,
    particleMultiplier: 1,
    pool: runtimeRef.current.poolManager,
    player: playerRef.current as Player,
    state: state.current,
  });
  const weaponMarketContextRef = useRef<WeaponMarketContext>({
    atrPercent: marketData.atrPercent ?? 0,
    rsiState: marketData.rsiState ?? 'NEUTRAL',
    pnl: marketData.pnl,
    volumeNorm: marketData.difficulty,
    isFavorable: marketData.pnl >= 0,
  });

  const gameLoopCoordinatorRef = useLazyRef(() => {
    const difficultyPhase = new DifficultyPhase(runtimeRef.current.difficultyRuntime);
    const inputPhase = new InputPhase();
    const combatPhase = new CombatPhase();
    const spawnPhase = new SpawnPhase();
    const physicsPhase = new PhysicsPhase();
    const effectsPhase = new EffectsPhase(
      runtimeRef.current.presentationDirector,
      runtimeRef.current.presentationCueAdapter
    );
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
          RuntimeDiagnosticsService.recordPhaseError({
            phaseId: phaseError.phaseId,
            stage: phaseError.stage,
            frame: phaseError.context.clock.frame,
            timestampMs: phaseError.context.clock.nowMs,
            gameTimeMs: phaseError.context.clock.elapsedMs,
          });
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
    elapsedMs: 0,
  });

  useEffect(() => {
    marketDataRef.current = marketData;
  }, [marketData]);

  useEffect(() => {
    if (status !== GameStatus.PLAYING) {
      hitStopGovernorRef.current.reset();
      phaseProfilerRef.current.reset();
      MarketAudioReactor.stop();
    }
    if (status === GameStatus.GAMEOVER || status === GameStatus.MENU) {
      MarketEventAnnouncer.reset();
      coreLoopRef.current.reset();
      RuntimeDiagnosticsService.stop();
    }
    if (status === GameStatus.GAMEOVER || status === GameStatus.CYCLE_COMPLETE) {
      lootCacheSystem.reset();
      directorRunIdRef.current = '';
      directorRunSeedRef.current = 0;
    }
    if (status === GameStatus.MENU) {
      lastCycleRef.current = 1;
      pendingCashOutCycleRef.current = null;
      cashOutRetryNotBeforeRef.current = 0;
      lastRawFrameTimeRef.current = null;
    }
  }, [phaseProfilerRef, status, coreLoopRef, hitStopGovernorRef, lootCacheSystem]);

  useEffect(() => {
    const unsubscribeOpened = EventBus.on('cashOutOfferOpened', ({ cycleNumber }) => {
      lastCycleRef.current = Math.max(lastCycleRef.current, cycleNumber);
      if (pendingCashOutCycleRef.current === cycleNumber) {
        pendingCashOutCycleRef.current = null;
      }
      cashOutRetryNotBeforeRef.current = 0;
    });
    const unsubscribeFailed = EventBus.on(
      'cashOutOfferQuoteFailed',
      ({ cycleNumber }) => {
        if (pendingCashOutCycleRef.current === cycleNumber) {
          pendingCashOutCycleRef.current = null;
          cashOutRetryNotBeforeRef.current =
            performance.now() + GAME_ENGINE.CASH_OUT_QUOTE_RETRY_DELAY_MS;
        }
      }
    );

    return () => {
      unsubscribeOpened();
      unsubscribeFailed();
    };
  }, []);

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

  useEffect(() => {
    const runtime = runtimeRef.current;
    runtimeMountedRef.current = true;

    return () => {
      runtimeMountedRef.current = false;
      queueMicrotask(() => {
        if (!runtimeMountedRef.current) {
          runtime.dispose();
        }
      });
    };
  }, [runtimeRef, runtimeMountedRef]);

  // ========================================
  // Custom Hooks for Setup, Events & Status
  // ========================================

  // Initial setup: FPS monitor, pool pre-warming, background candles
  useGameSetup({ pool, state, width, height });

  // Event subscriptions: afterReset, killAll
  useGameEvents({ pool, state, spawnSystem: spawnSystemRef });

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
          const history = await marketApiClient
            .getHistory(pair, 300)
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
      const currentLeverage = difficultyContextRef.current.inputs.leverage;
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

  useEffect(() => {
    FeedbackService.start();
    return () => FeedbackService.stop();
  }, []);

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
        diagnostics: RuntimeDiagnosticsService.getSnapshot().summary,
      });
    };

    return () => {
      delete window.render_game_to_text;
    };
  }, [phaseProfilerRef, playerRef, pool, state, status]);

  const recordRuntimeDiagnostics = useCallback(
    (
      frame: number,
      timestampMs: number,
      gameTimeMs: number,
      currentStatus: GameStatus,
      rafDeltaMs: number,
      updateMs: number,
      renderMs: number,
      physicsMs: number,
      phaseDurationsMs: Partial<Record<PhaseName, number>> | null,
      hitStopActive: boolean,
      levelUpFreezeActive: boolean
    ) => {
      const p = pool.current;
      const input = diagnosticsFrameInputRef.current;
      input.frame = frame;
      input.timestampMs = timestampMs;
      input.gameTimeMs = gameTimeMs;
      input.status = currentStatus;
      input.rafDeltaMs = rafDeltaMs;
      input.updateMs = updateMs;
      input.renderMs = renderMs;
      input.physicsMs = physicsMs;
      input.phaseDurationsMs = phaseDurationsMs;
      input.entityCounts.enemies = p.activeEnemies.length;
      input.entityCounts.bullets = p.activeBullets.length;
      input.entityCounts.particles = p.activeParticles.length;
      input.entityCounts.gems = p.activeGems.length;
      input.entityCounts.floatingTexts = p.activeFloatingTexts.length;
      input.entityCounts.interactables = p.activeInteractables.length;
      input.flags.hitStopActive = hitStopActive;
      input.flags.levelUpFreezeActive = levelUpFreezeActive;

      RuntimeDiagnosticsService.recordFrame(input);
    },
    [pool]
  );

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.setTransform(canvasDpr, 0, 0, canvasDpr, 0, 0);
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
  }, [width, height, status, playerRef, pool, renderer, canvasDpr]);

  const update = useCallback(
    (time: number) => {
      const frameStart = performance.now();
      const previousRawFrameTime = lastRawFrameTimeRef.current;
      const rawFrameDeltaMs =
        previousRawFrameTime === null
          ? GAME_ENGINE.MS_PER_FRAME
          : Math.max(0, time - previousRawFrameTime);
      lastRawFrameTimeRef.current = time;
      let physicsDurationMs = 0;
      FPSMonitor.tick();
      const s = state.current;
      const player = playerRef.current;
      const p = pool.current;

      const deltaTime = TimeService.update(time);
      const gameTimeMs = TimeService.getGameTime();

      const dtFactor = updateNearMissFeedbackTimers(s, deltaTime);
      s.lastTime = gameTimeMs;

      gameplayFrameRef.current += 1;

      // Update background candles (even when paused for visual continuity, but skip if menu)
      if (status !== GameStatus.MENU && !runtimeDebugFlags.noBackgroundCandles) {
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
      } else if (runtimeDebugFlags.noBackgroundCandles && s.bgCandles.length > 0) {
        s.bgCandles.length = 0;
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
          const freezeUpdateMs = performance.now() - frameStart;
          FPSMonitor.recordUpdate(freezeUpdateMs);
          const freezeRenderStart = performance.now();
          draw();
          const freezeRenderMs = performance.now() - freezeRenderStart;
          FPSMonitor.recordRender(freezeRenderMs);
          recordRuntimeDiagnostics(
            gameplayFrameRef.current,
            time,
            TimeService.getGameTime(),
            status,
            rawFrameDeltaMs,
            freezeUpdateMs,
            freezeRenderMs,
            0,
            null,
            false,
            true
          );
          requestRef.current = requestAnimationFrame(update);
          return;
        }

        // Handle Hit Stop (freeze frame on impact)
        if (s.hitStopTimer > 0) {
          s.hitStopTimer -= deltaTime;
          // During hit stop: skip physics updates but still draw
          const hitStopUpdateMs = performance.now() - frameStart;
          FPSMonitor.recordUpdate(hitStopUpdateMs);
          const hitStopRenderStart = performance.now();
          draw();
          const hitStopRenderMs = performance.now() - hitStopRenderStart;
          FPSMonitor.recordRender(hitStopRenderMs);
          recordRuntimeDiagnostics(
            gameplayFrameRef.current,
            time,
            TimeService.getGameTime(),
            status,
            rawFrameDeltaMs,
            hitStopUpdateMs,
            hitStopRenderMs,
            0,
            null,
            true,
            false
          );
          requestRef.current = requestAnimationFrame(update);
          return;
        }

        if (runtimeDebugFlags.noScreenShake) {
          s.shake = 0;
        } else if (s.shake > 0) {
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

        // Combo, BuffManager, and MetricsService updates are now in MetricsPhase (Step 5).
        // BuffManager.updateBaseStats needs direct player ref, keep it here.
        BuffManager.updateBaseStats(player);

        // Update buff gem spawner (spawns gems based on volatility)
        BuffGemSpawner.updateDimensions(width, height);
        BuffGemSpawner.update(marketDataRef.current.difficulty, deltaTime);

        // Update Speed Lines
        speedLineSpawner.current.update(p, s, player, width, height, deltaTime);

        // Low HP Heartbeat Logic
        if (hpPercent < GAME_ENGINE.LOW_HP_THRESHOLD_PERCENT) {
          const urgency = 1 - hpPercent / GAME_ENGINE.LOW_HP_THRESHOLD_PERCENT;
          // Pulse intervals: 1000ms (start) -> 400ms (near death)
          const interval =
            GAME_ENGINE.HEARTBEAT_INTERVAL_BASE -
            urgency * GAME_ENGINE.HEARTBEAT_INTERVAL_SHIFT;

          if (gameTimeMs - s.lastHeartbeatTime > interval) {
            audio.playHeartbeat();
            s.lastHeartbeatTime = gameTimeMs;
          }
        }

        const layout = getHUDLayout(device.platform);
        const perfConfig = DeviceBenchmarkService.getPerformanceConfig();
        const maxEnemies = Math.min(layout.maxEnemies, perfConfig.maxEnemies);

        // Mutate pre-allocated shared object instead of creating new one each frame
        const shared = phaseSharedRef.current;
        shared.deltaTime = deltaTime;
        shared.dtFactor = dtFactor;
        shared.timeMs = gameTimeMs;
        shared.width = width;
        shared.height = height;
        shared.deviceIsMobile = device.isMobile;
        shared.screenShakeEnabled =
          graphicsRef.current.showScreenShake && !runtimeDebugFlags.noScreenShake;
        shared.reducedMotion = graphicsRef.current.reducedMotion;
        shared.combatSystem = combatSystem.current;
        shared.getMovementVector = getMovementVector;
        shared.isDashPressed = isSpacePressed;
        shared.isDashFreshPress = isSpaceFreshPress;
        shared.consumeDash = consumeDash;
        shared.spawnExecutor = spawnExecutorRef.current;
        const directorSpawnWorld = directorSpawnWorldRef.current;
        directorSpawnWorld.pool = p;
        directorSpawnWorld.position = position;
        directorSpawnWorld.maxActiveEnemies = maxEnemies;
        shared.spawnWorld = directorSpawnWorld;
        shared.spawnPlan = undefined;
        shared.spawnExecution = undefined;

        const canonicalFrame = MarketEventConsolidator.lockForSimulationTick(
          gameplayFrameRef.current,
          time
        );
        const directorInputs = difficultyContextRef.current.inputs;
        const runId = marketDataRef.current.runtimeRunId;
        shared.canonicalMarketFrame = canonicalFrame;
        shared.difficultyRunId = undefined;
        shared.difficultyRunSeed = undefined;
        shared.difficultyRunMode = undefined;
        shared.difficultyEntryPrice = undefined;
        shared.difficultyLiquidationPrice = undefined;
        shared.difficultyPosition = position;
        shared.difficultyMaximumEnemies = maxEnemies;
        shared.difficultyKillStreak = killStreak;
        shared.difficultyActivePrimaryEncounters = 0;
        shared.difficultyActiveSupportEncounters = 0;

        if (
          canonicalFrame !== null &&
          runId !== undefined &&
          directorInputs.entryPrice > 0
        ) {
          if (directorRunIdRef.current !== runId) {
            directorRunIdRef.current = runId;
            directorRunSeedRef.current = deriveDirectorSeed(runId);
            lootCacheSystem.beginRun(
              deriveDirectorSeed(runId),
              TimeService.getGameTimeSeconds()
            );
          }
          shared.difficultyRunId = runId;
          shared.difficultyRunSeed = directorRunSeedRef.current;
          shared.difficultyRunMode =
            gameMode === GameMode.CASUAL ? 'PRACTICE' : 'TOKEN';
          shared.difficultyEntryPrice = directorInputs.entryPrice;
          shared.difficultyLiquidationPrice = directorInputs.liquidationPrice;
        }

        // Reuse pre-allocated tick context to avoid per-frame GC pressure
        const tick = tickContextRef.current;
        tick.clock.frame = gameplayFrameRef.current;
        tick.clock.nowMs = time;
        tick.clock.deltaMs = deltaTime;
        tick.clock.elapsedMs = gameTimeMs;
        tick.status = status;
        tick.dimensions.width = width;
        tick.dimensions.height = height;
        tick.world.player = playerRef as unknown as MutableRef<Player | null>;
        tick.world.gameState = state as unknown as MutableRef<GameState>;
        tick.world.pool = pool as unknown as MutableRef<PoolLikeRef>;
        tick.marketData = marketDataRef.current;
        resetPhaseDurations(tick.telemetry.phaseDurationsMs);

        const phaseTickResult = gameLoopCoordinatorRef.current.runTickSync(tick);
        const lastPhaseTick = lastPhaseTickRef.current;
        lastPhaseTick.completedPhaseIds = phaseTickResult.completedPhaseIds;
        lastPhaseTick.errorCount = phaseTickResult.errors.length;

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

        // Cycle boundaries become cash-out offers only in an authored recovery window.
        // A cycle is acknowledged after the signed quote opens, so failed requests can retry.
        {
          const elapsed = TimeService.getGameTimeSeconds();
          const cycle = evaluateCycleTimer(elapsed, lastCycleRef.current, gameMode);
          const difficultyDecision = shared.difficultyPhaseDecision as
            | DifficultyPhaseDecision
            | undefined;
          if (
            cycle.shouldEmit &&
            pendingCashOutCycleRef.current !== cycle.currentCycle &&
            time >= cashOutRetryNotBeforeRef.current &&
            isCashOutRecoveryEligible(difficultyDecision)
          ) {
            pendingCashOutCycleRef.current = cycle.currentCycle;
            Logger.info(
              `[GameEngine] Cycle ${cycle.currentCycle} cash-out recovery at ${elapsed.toFixed(0)}s`
            );
            EventBus.emit('cycleComplete', {
              cycleNumber: cycle.currentCycle,
              totalElapsedSeconds: elapsed,
            });
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
        coreInput.elapsedMs = gameTimeMs;

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

        if (!runtimeDebugFlags.noScreenShake && coreLoopOutput.shakeBoost > 0) {
          s.shake = Math.max(s.shake, coreLoopOutput.shakeBoost);
        }

        // Calculate target background based on PnL
        // On mobile, we increase the floor values to prevent the screen from being too dark at low brightness
        const minVal = device.isMobile ? 12 : 2;

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

        const bgLerpFactor = 1 - Math.pow(1 - GAME_ENGINE.BG_LERP_FACTOR, dtFactor);
        s.currentBg.r = lerp(s.currentBg.r, s.targetBg.r, bgLerpFactor);
        s.currentBg.g = lerp(s.currentBg.g, s.targetBg.g, bgLerpFactor);
        s.currentBg.b = lerp(s.currentBg.b, s.targetBg.b, bgLerpFactor);

        // 0. Sync Market Metadata from marketDataRef
        state.current.atrPercent = marketDataRef.current.atrPercent ?? 0;

        // Update Physics & Collisions
        const physStart = performance.now();
        const lootCacheUpdateInput = lootCacheUpdateInputRef.current;
        lootCacheUpdateInput.deltaMs = deltaTime;
        lootCacheUpdateInput.elapsedSeconds = TimeService.getGameTimeSeconds();
        lootCacheUpdateInput.width = width;
        lootCacheUpdateInput.height = height;
        lootCacheUpdateInput.reducedMotion = graphicsRef.current.reducedMotion;
        lootCacheUpdateInput.showParticles = graphicsRef.current.showParticles;
        lootCacheUpdateInput.particleMultiplier = perfConfig.particleMultiplier;
        lootCacheUpdateInput.pool = p;
        lootCacheUpdateInput.player = player;
        lootCacheUpdateInput.state = s;
        lootCacheSystem.update(lootCacheUpdateInput);
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
          onGameOver,
          graphicsRef.current.reducedMotion
        );
        physicsDurationMs = performance.now() - physStart;
        FPSMonitor.recordPhysics(physicsDurationMs);

        // Update Weapon System (market-driven weapon firing via shared pipeline)
        const weaponMarketContext = weaponMarketContextRef.current;
        weaponMarketContext.atrPercent = marketDataRef.current.atrPercent ?? 0;
        weaponMarketContext.rsiState = marketDataRef.current.rsiState ?? 'NEUTRAL';
        weaponMarketContext.pnl = marketDataRef.current.pnl;
        weaponMarketContext.volumeNorm = marketDataRef.current.difficulty;
        weaponMarketContext.isFavorable = marketDataRef.current.pnl >= 0;
        WeaponSystem.update(
          deltaTime,
          player.x,
          player.y,
          player.baseDamage,
          weaponMarketContext,
          pool.current,
          width,
          height
        );

        // Record replay snapshot (player every 500ms, enemies every 1000ms internally)
        ReplayRecorderService.tick(
          deltaTime,
          player.x,
          player.y,
          player.hp,
          player.level,
          p.activeEnemies
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
          lastSyncedStats.current.hp = player.hp;
          lastSyncedStats.current.exp = player.exp;
          lastSyncedStats.current.level = player.level;
          lastSyncedStats.current.lastTime = time;
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
      const updateDurationMs = updateEnd - frameStart;
      FPSMonitor.recordUpdate(updateDurationMs);

      const renderStart = performance.now();
      draw();
      const renderDurationMs = performance.now() - renderStart;
      FPSMonitor.recordRender(renderDurationMs);

      recordRuntimeDiagnostics(
        gameplayFrameRef.current,
        time,
        TimeService.getGameTime(),
        status,
        rawFrameDeltaMs,
        updateDurationMs,
        renderDurationMs,
        physicsDurationMs,
        status === GameStatus.PLAYING
          ? (tickContextRef.current.telemetry.phaseDurationsMs ?? null)
          : null,
        false,
        false
      );

      requestRef.current = requestAnimationFrame(update);
    },

    [
      status,
      width,
      height,
      onLevelUp,
      onGameOver,
      draw,
      recordRuntimeDiagnostics,
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
      spawnExecutorRef,
      directorSpawnWorldRef,
      speedLineSpawner,
      gameLoopCoordinatorRef,
      gameMode,
      coreLoopRef,
      runtimeDebugFlags,
      lootCacheSystem,
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
      <canvas
        ref={canvasRef}
        width={canvasPixelWidth}
        height={canvasPixelHeight}
        style={{ width, height }}
        className="block"
        data-runtime-diagnostics-canvas="game"
        data-runtime-canvas-dpr={canvasDpr}
      />
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
