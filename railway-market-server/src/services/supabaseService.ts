import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { Logger } from '../utils/logger';

export class SupabaseService {
  private static instance: SupabaseService | null = null;
  private client: SupabaseClient;

  private constructor() {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Missing Supabase credentials: SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
    }

    this.client = createClient(supabaseUrl, supabaseKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });

    Logger.info('✅ Supabase client initialized');
  }

  static getInstance(): SupabaseService {
    return (SupabaseService.instance ??= new SupabaseService());
  }

  getClient(): SupabaseClient {
    return this.client;
  }

  async insertPriceLog(data: {
    pair: string;
    price: number;
    high: number;
    low: number;
    volume: number;
    timestamp: Date;
  }): Promise<void> {
    const { error } = await this.client.from('price_logs').insert({
      pair: data.pair,
      price: data.price,
      high: data.high,
      low: data.low,
      volume: data.volume,
      timestamp: data.timestamp.toISOString(),
      source: 'binance',
    });

    if (error) {
      // Duplicate entry is ok (timestamp collision)
      if (error.code !== '23505') {
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
    const { error } = await this.client.from('market_state').upsert(
      {
        ...state,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'pair' }
    );

    if (error) {
      throw new Error(`Failed to update market_state: ${error.message}`);
    }
  }

  async checkHealth(): Promise<boolean> {
    try {
      const { error } = await this.client.from('price_logs').select('id').limit(1);

      return !error;
    } catch {
      return false;
    }
  }
}
