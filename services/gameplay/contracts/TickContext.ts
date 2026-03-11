import type { GameState, GameStatus, MarketData, Player } from '../../../types';
import type { GameEvent } from '../../../types/events';

/**
 * Shared ref shape used by loop coordinator and phase modules.
 * Keeps contracts framework-agnostic (no direct React import).
 */
export interface MutableRef<TValue> {
  current: TValue;
}

export interface PoolLikeRef {
  activeEnemies: readonly unknown[];
  activeBullets: readonly unknown[];
  activeGems: readonly unknown[];
  activeParticles: readonly unknown[];
  activeFloatingTexts?: readonly unknown[];
  activeSpeedLines?: readonly unknown[];
  activeInteractables?: readonly unknown[];
}

export interface WorldStateRef {
  player: MutableRef<Player | null>;
  gameState: MutableRef<GameState>;
  pool: MutableRef<PoolLikeRef>;
}

export interface TickClock {
  frame: number;
  nowMs: number;
  deltaMs: number;
  elapsedMs: number;
}

export interface TickDimensions {
  width: number;
  height: number;
}

export interface TickTelemetryBucket {
  phaseDurationsMs?: Partial<Record<PhaseName, number>>;
  emittedEvents?: Partial<Record<GameEvent, number>>;
  counters?: Record<string, number>;
  marks?: Record<string, number>;
}

export type PhaseName =
  | 'clock'
  | 'input'
  | 'motion'
  | 'combat'
  | 'spawn'
  | 'physics'
  | 'effects'
  | 'render'
  | 'uiSync';

export interface TickContext {
  clock: TickClock;
  status: GameStatus;
  dimensions: TickDimensions;
  world: WorldStateRef;
  marketData: MarketData;
  telemetry: TickTelemetryBucket;
}

export interface PhaseInput<
  TPhase extends PhaseName = PhaseName,
  TShared extends object = Record<string, never>,
> {
  phase: TPhase;
  context: TickContext;
  shared: TShared;
}

export type PhaseControl = 'continue' | 'skip' | 'stop';

export interface PhaseResult<
  TPhase extends PhaseName = PhaseName,
  TShared extends object = Record<string, never>,
> {
  phase: TPhase;
  control?: PhaseControl;
  nextStatus?: GameStatus;
  shared?: TShared;
  worldState?: unknown;
  metadata?: Record<string, unknown>;
}
