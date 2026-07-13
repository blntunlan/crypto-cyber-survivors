import { type MarketPosition, type CryptoPair } from '../../types';
import { type IPoolManager } from './IPoolManager';
import { type SpawnDebugState } from '../../types/DebugState';

/**
 * Interface for the Spawn System.
 * Temporary adapter for the pre-Director spawning implementation.
 */
export interface ISpawnSystem {
  /**
   * Update the spawn system state and trigger spawns if necessary.
   *
   * @param deltaTime Time since last frame in ms
   * @param difficulty Current game difficulty scaling
   * @param width Screen width for spawn boundaries
   * @param height Screen height for spawn boundaries
   * @param position Current market position (LONG/SHORT)
   * @param pool PoolManager instance to get/recycle entities
   * @param pnl Current player PnL for enemy type selection
   * @param maxEnemiesOverride Optional limit for total enemies
   * @param spawnRateMultiplier Optional multiplier for spawn frequency
   * @param pair Current crypto pair for market indicators
   * @returns Updated internal spawn timer
   */
  updateLegacy(
    deltaTime: number,
    difficulty: number,
    width: number,
    height: number,
    position: MarketPosition,
    pool: IPoolManager,
    pnl?: number,
    maxEnemiesOverride?: number,
    spawnRateMultiplier?: number,
    pair?: CryptoPair,
    damageMultiplier?: number,
    speedMultiplier?: number,
    marketSignals?: {
      rsi?: number;
      rsiState?: string;
      whaleTier?: number;
      playerPower?: number;
      offensePower?: number;
      counterPressure?: number;
      rangedPressure?: number;
      screenPressure?: number;
    }
  ): number;

  /**
   * Reset internal state.
   */
  reset(): void;

  /**
   * Get debug state for runtime inspection
   */
  getDebugState(currentActiveEnemies?: number): SpawnDebugState;
}
