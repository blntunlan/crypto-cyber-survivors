/**
 * DebugState - Types for system debug state inspection
 *
 * These interfaces define the structure returned by getDebugState()
 * methods in core systems. Used for runtime debugging and admin tools.
 */

// =============================================================================
// BASE DEBUG STATE
// =============================================================================

export interface BaseDebugState {
  systemName: string;
  timestamp: number;
}

// =============================================================================
// DIFFICULTY MANAGER DEBUG STATE
// =============================================================================

export interface DifficultyDebugState extends BaseDebugState {
  systemName: 'DifficultyManager';
  wavePhase: string;
  waveTimer: number;
  killStreak: number;
  totalElapsedSeconds: number;
  pnlHistoryLength: number;
  waveDurations: Record<string, number>;
  waveMultipliers: Record<string, number>;
  cycleNumber: number;
  cycleProgress: number;
  timeRemainingInPhase: number;
  timeRemainingInCycle: number;
}

// =============================================================================
// COMBO SYSTEM DEBUG STATE
// =============================================================================

export interface ComboDebugState extends BaseDebugState {
  systemName: 'ComboSystem';
  killStreak: number;
  maxStreak: number;
  comboMultiplier: number;
  totalKills: number;
  totalBonusXp: number;
  timeToExpire: number;
  currentMilestone: string | null;
  nextMilestone: string | null;
}

// =============================================================================
// SPAWN SYSTEM DEBUG STATE
// =============================================================================

export interface SpawnDebugState extends BaseDebugState {
  systemName: 'SpawnSystem';
  spawnTimer: number;
  activeEnemies: number;
  maxEnemies: number;
  spawnConfig: {
    baseInterval: number;
    waveIntensity: number;
  };
}

// =============================================================================
// BUFFER MANAGER DEBUG STATE
// =============================================================================

export interface BuffManagerDebugState extends BaseDebugState {
  systemName: 'BuffManager';
  activeEffects: number;
  effectNames: string[];
  isInitialized: boolean;
}

// =============================================================================
// PHYSICS CONTEXT DEBUG STATE
// =============================================================================

export interface PhysicsDebugState extends BaseDebugState {
  systemName: 'PhysicsContext';
  activeBullets: number;
  activeEnemies: number;
  activeGems: number;
  particleMultiplier: number;
}

// =============================================================================
// UNION TYPE
// =============================================================================

export type SystemDebugState =
  | DifficultyDebugState
  | ComboDebugState
  | SpawnDebugState
  | BuffManagerDebugState
  | PhysicsDebugState;

// =============================================================================
// HELPER
// =============================================================================

/**
 * Get current timestamp for debug state
 */
export function getDebugTimestamp(): number {
  return Date.now();
}
