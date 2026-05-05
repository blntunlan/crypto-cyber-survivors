import { query, checkPoolHealth } from '../db/pool';
import { Logger } from '../utils/logger';
import { withRetry } from '../utils/retry';

export interface MarketStateUpdate {
  pair: string;
  price: number;
  volume: number;
  high: number;
  low: number;
  rsi: number;
  rsiState: string;
  atr: number;
  atrPercent: number;
  spawnRateMultiplier: number;
  normalizedVolume: number;
  volumePercentile: number;
  volumeZScore: number;
  volumeMean: number;
  volumeStdDev: number;
  whaleTier: number;
  volumeHistoryMin: number;
  volumeHistoryMax: number;
  volumeHistoryCount: number;
  enemyAggroMultiplierLong: number;
  enemyAggroMultiplierShort: number;
}

/**
 * Upsert a single market state row.
 * Uses INSERT … ON CONFLICT DO UPDATE so it works whether the row exists or not.
 */
async function upsertMarketState(state: MarketStateUpdate): Promise<void> {
  await query(
    `INSERT INTO market_state (
       pair, price, volume, high, low,
       rsi, rsi_state, atr, atr_percent, spawn_rate_multiplier,
       normalized_volume, volume_percentile, volume_z_score,
       volume_mean, volume_std_dev, whale_tier,
       volume_history_min, volume_history_max, volume_history_count,
       enemy_aggro_multiplier_long, enemy_aggro_multiplier_short,
       updated_at
     ) VALUES (
       $1, $2, $3, $4, $5,
       $6, $7, $8, $9, $10,
       $11, $12, $13,
       $14, $15, $16,
       $17, $18, $19,
       $20, $21,
       now()
     )
     ON CONFLICT (pair) DO UPDATE SET
       price                       = EXCLUDED.price,
       volume                      = EXCLUDED.volume,
       high                        = EXCLUDED.high,
       low                         = EXCLUDED.low,
       rsi                         = EXCLUDED.rsi,
       rsi_state                   = EXCLUDED.rsi_state,
       atr                         = EXCLUDED.atr,
       atr_percent                 = EXCLUDED.atr_percent,
       spawn_rate_multiplier       = EXCLUDED.spawn_rate_multiplier,
       normalized_volume           = EXCLUDED.normalized_volume,
       volume_percentile           = EXCLUDED.volume_percentile,
       volume_z_score              = EXCLUDED.volume_z_score,
       volume_mean                 = EXCLUDED.volume_mean,
       volume_std_dev              = EXCLUDED.volume_std_dev,
       whale_tier                  = EXCLUDED.whale_tier,
       volume_history_min          = EXCLUDED.volume_history_min,
       volume_history_max          = EXCLUDED.volume_history_max,
       volume_history_count        = EXCLUDED.volume_history_count,
       enemy_aggro_multiplier_long = EXCLUDED.enemy_aggro_multiplier_long,
       enemy_aggro_multiplier_short = EXCLUDED.enemy_aggro_multiplier_short,
       updated_at                  = now()`,
    [
      state.pair,
      state.price,
      state.volume,
      state.high,
      state.low,
      state.rsi,
      state.rsiState,
      state.atr,
      state.atrPercent,
      state.spawnRateMultiplier,
      state.normalizedVolume,
      state.volumePercentile,
      state.volumeZScore,
      state.volumeMean,
      state.volumeStdDev,
      state.whaleTier,
      state.volumeHistoryMin,
      state.volumeHistoryMax,
      state.volumeHistoryCount,
      state.enemyAggroMultiplierLong,
      state.enemyAggroMultiplierShort,
    ]
  );
}

/**
 * Update market state for a single pair with retry logic and connection validation.
 * Retries up to 3 times with exponential backoff on transient failures.
 */
export async function updateMarketState(state: MarketStateUpdate): Promise<void> {
  try {
    await withRetry(() => upsertMarketState(state), {
      maxRetries: 3,
      delayMs: 250,
      backoff: true,
    });
  } catch (error) {
    Logger.error('[DatabaseService] Failed to update market state after retries', {
      pair: state.pair,
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}

/**
 * Update market state for multiple pairs in parallel.
 * Each pair is retried independently so a single failure doesn't block others.
 * Returns the number of pairs successfully updated.
 */
export async function updateMarketStates(states: MarketStateUpdate[]): Promise<number> {
  if (states.length === 0) return 0;

  // Validate connection before attempting batch update
  const healthy = await checkPoolHealth();
  if (!healthy) {
    Logger.warn('[DatabaseService] Pool health check failed, skipping market state batch update');
    return 0;
  }

  const results = await Promise.allSettled(states.map(s => updateMarketState(s)));

  let successCount = 0;
  for (const result of results) {
    if (result.status === 'fulfilled') {
      successCount++;
    } else {
      Logger.error('[DatabaseService] Market state update failed for one pair:', {
        error: result.reason instanceof Error ? result.reason.message : String(result.reason),
      });
    }
  }

  if (successCount < states.length) {
    Logger.warn(`[DatabaseService] Partial market state update: ${successCount}/${states.length} pairs succeeded`);
  }

  return successCount;
}
