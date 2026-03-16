/**
 * DatabaseService — PostgreSQL database operations
 *
 * Migrated from Supabase client to direct PostgreSQL via `pg`.
 * Class name kept as SupabaseService for backward compatibility with existing consumers.
 */

import { query } from '../db/pool';
import { Logger } from '../utils/logger';
import { ErrorReporter } from '../utils/errorReporter';

export class SupabaseService {
  private static instance: SupabaseService | null = null;

  private constructor() {
    // Validate DATABASE_URL is present
    if (!process.env.DATABASE_URL) {
      throw new Error('Missing DATABASE_URL environment variable');
    }

    // Initialize ErrorReporter with pg query function
    ErrorReporter.setQueryFn(query);

    Logger.info('✅ PostgreSQL database service initialized');
  }

  static getInstance(): SupabaseService {
    return (SupabaseService.instance ??= new SupabaseService());
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
      await query(
        `INSERT INTO price_history (pair, price, volume, timestamp, metadata)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (pair, timestamp) DO NOTHING`,
        [
          data.pair,
          data.price,
          data.volume,
          data.timestamp.toISOString(),
          JSON.stringify({ high: data.high, low: data.low }),
        ]
      );
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
      await query(
        `INSERT INTO market_state (
           pair, price, volume, high, low, rsi, rsi_state, atr, atr_percent,
           spawn_rate_multiplier, normalized_volume, volume_percentile,
           volume_z_score, volume_mean, volume_std_dev, whale_tier,
           volume_history_min, volume_history_max, volume_history_count,
           enemy_aggro_multiplier_long, enemy_aggro_multiplier_short, updated_at
         ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,now())
         ON CONFLICT (pair) DO UPDATE SET
           price=$2, volume=$3, high=$4, low=$5, rsi=$6, rsi_state=$7,
           atr=$8, atr_percent=$9, spawn_rate_multiplier=$10,
           normalized_volume=$11, volume_percentile=$12, volume_z_score=$13,
           volume_mean=$14, volume_std_dev=$15, whale_tier=$16,
           volume_history_min=$17, volume_history_max=$18, volume_history_count=$19,
           enemy_aggro_multiplier_long=$20, enemy_aggro_multiplier_short=$21,
           updated_at=now()`,
        [
          state.pair, state.price, state.volume, state.high, state.low,
          state.rsi, state.rsi_state, state.atr, state.atr_percent,
          state.spawn_rate_multiplier, state.normalized_volume, state.volume_percentile,
          state.volume_z_score, state.volume_mean, state.volume_std_dev, state.whale_tier,
          state.volume_history_min, state.volume_history_max, state.volume_history_count,
          state.enemy_aggro_multiplier_long, state.enemy_aggro_multiplier_short,
        ]
      );
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
      await query('SELECT 1');
      return true;
    } catch {
      return false;
    }
  }
}
