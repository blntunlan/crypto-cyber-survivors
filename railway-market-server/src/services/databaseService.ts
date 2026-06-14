/**
 * DatabaseService — PostgreSQL database operations
 *
 * Migrated from raw pg queries to Drizzle ORM.
 */

import { sql } from 'drizzle-orm';
import { getDb } from '../db';
import { priceHistory, marketState } from '../db/schema';
import { query } from '../db/pool';
import { Logger } from '../utils/logger';
import { ErrorReporter } from '../utils/errorReporter';

export class DatabaseService {
  private static instance: DatabaseService | null = null;

  private constructor() {
    // Validate DATABASE_URL is present
    if (!process.env.DATABASE_URL) {
      throw new Error('Missing DATABASE_URL environment variable');
    }

    // Initialize ErrorReporter with pg query function
    ErrorReporter.setQueryFn(query);

    Logger.info('✅ PostgreSQL database service initialized');
  }

  static getInstance(): DatabaseService {
    return (DatabaseService.instance ??= new DatabaseService());
  }

  async insertPriceLog(data: {
    pair: string;
    price: number;
    high: number;
    low: number;
    volume: number;
    timestamp: Date;
  }): Promise<void> {
    try {
      const db = getDb();
      await db
        .insert(priceHistory)
        .values({
          pair: data.pair,
          price: data.price,
          volume: data.volume,
          timestamp: data.timestamp,
          metadata: { high: data.high, low: data.low },
        })
        .onConflictDoNothing();
    } catch (error) {
      const pgError = error as { code?: string; message?: string };
      // Duplicate entry is ok (timestamp collision)
      if (pgError.code !== '23505') {
        void ErrorReporter.report({
          type: 'DBInsertError',
          message: pgError.message ?? 'Unknown insert error',
          severity: 'high',
          context: { table: 'price_history', data },
        });
        throw error;
      }
    }
  }

  async updateMarketState(state: {
    pair: string;
    price: number;
    volume: number;
    high: number;
    low: number;
    rsi: number;
    rsi_state: string;
    atr: number;
    atr_percent: number;
    spawn_rate_multiplier: number;
    normalized_volume: number;
    volume_percentile: number;
    volume_z_score: number;
    volume_mean: number;
    volume_std_dev: number;
    whale_tier: number;
    volume_history_min: number;
    volume_history_max: number;
    volume_history_count: number;
    enemy_aggro_multiplier_long: number;
    enemy_aggro_multiplier_short: number;
  }): Promise<void> {
    try {
      const db = getDb();
      await db
        .insert(marketState)
        .values({
          pair: state.pair,
          price: state.price,
          volume: state.volume,
          high: state.high,
          low: state.low,
          rsi: state.rsi,
          rsiState: state.rsi_state,
          atr: state.atr,
          atrPercent: state.atr_percent,
          spawnRateMultiplier: state.spawn_rate_multiplier,
          normalizedVolume: state.normalized_volume,
          volumePercentile: state.volume_percentile,
          volumeZScore: state.volume_z_score,
          volumeMean: state.volume_mean,
          volumeStdDev: state.volume_std_dev,
          whaleTier: state.whale_tier,
          volumeHistoryMin: state.volume_history_min,
          volumeHistoryMax: state.volume_history_max,
          volumeHistoryCount: state.volume_history_count,
          enemyAggroMultiplierLong: state.enemy_aggro_multiplier_long,
          enemyAggroMultiplierShort: state.enemy_aggro_multiplier_short,
          updatedAt: sql`now()`,
        })
        .onConflictDoUpdate({
          target: marketState.pair,
          set: {
            price: sql`EXCLUDED.price`,
            volume: sql`EXCLUDED.volume`,
            high: sql`EXCLUDED.high`,
            low: sql`EXCLUDED.low`,
            rsi: sql`EXCLUDED.rsi`,
            rsiState: sql`EXCLUDED.rsi_state`,
            atr: sql`EXCLUDED.atr`,
            atrPercent: sql`EXCLUDED.atr_percent`,
            spawnRateMultiplier: sql`EXCLUDED.spawn_rate_multiplier`,
            normalizedVolume: sql`EXCLUDED.normalized_volume`,
            volumePercentile: sql`EXCLUDED.volume_percentile`,
            volumeZScore: sql`EXCLUDED.volume_z_score`,
            volumeMean: sql`EXCLUDED.volume_mean`,
            volumeStdDev: sql`EXCLUDED.volume_std_dev`,
            whaleTier: sql`EXCLUDED.whale_tier`,
            volumeHistoryMin: sql`EXCLUDED.volume_history_min`,
            volumeHistoryMax: sql`EXCLUDED.volume_history_max`,
            volumeHistoryCount: sql`EXCLUDED.volume_history_count`,
            enemyAggroMultiplierLong: sql`EXCLUDED.enemy_aggro_multiplier_long`,
            enemyAggroMultiplierShort: sql`EXCLUDED.enemy_aggro_multiplier_short`,
            updatedAt: sql`now()`,
          },
        });
    } catch (error) {
      const pgError = error as { message?: string };
      void ErrorReporter.report({
        type: 'DBUpdateError',
        message: pgError.message ?? 'Unknown update error',
        severity: 'high',
        context: { table: 'market_state', pair: state.pair },
      });
      throw new Error(`Failed to update market_state: ${pgError.message}`);
    }
  }

  async checkHealth(): Promise<boolean> {
    try {
      const db = getDb();
      await db.execute(sql`SELECT 1`);
      return true;
    } catch {
      return false;
    }
  }
}
