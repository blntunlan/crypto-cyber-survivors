import { supabase } from '../core/Supabase';
import { Logger } from '../system/Logger';
import { EventBus } from '../core/EventBus';
import { type MarketStateUpdatedEvent } from '../../types/events';
import { type RealtimeChannel } from '@supabase/supabase-js';
import { type CryptoPair } from '../../types';

export type MarketState = MarketStateUpdatedEvent;

type RsiState = 'OVERSOLD' | 'NEUTRAL' | 'OVERBOUGHT';

const STALE_THRESHOLD_MS = 15000; // 15 seconds - reduced from 30s per user feedback

class MarketStateServiceClass {
  private static instance: MarketStateServiceClass | null = null;
  private states: Map<string, MarketState> = new Map();
  private subscription: RealtimeChannel | null = null;
  private lastUpdate: number = Date.now();
  private stalenessTimer: ReturnType<typeof setInterval> | null = null;
  private isStale: boolean = false;

  static getInstance(): MarketStateServiceClass {
    return (MarketStateServiceClass.instance ??= new MarketStateServiceClass());
  }

  /**
   * Initialize Realtime subscription to market_state table
   */
  async init(): Promise<void> {
    if (!supabase) return;
    try {
      // 1. Initial fetch
      await this.fetchAll();

      // 2. Setup Realtime
      this.subscription = supabase
        .channel('market_state_changes')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'market_state' },
          payload => {
            const row = payload.new as Record<string, unknown> | null;
            if (row && typeof row.pair === 'string') {
              const now = Date.now();
              const wasStale = this.isStale;
              this.lastUpdate = now;
              this.isStale = false;

              if (wasStale) {
                Logger.info(
                  `[MarketState] Data recovered after ${((now - this.lastUpdate) / 1000).toFixed(1)}s`
                );

                // Map pair string to CryptoPair type
                let cryptoPair: CryptoPair = 'BTC';
                if (row.pair.includes('ETH')) cryptoPair = 'ETH';
                if (row.pair.includes('SOL')) cryptoPair = 'SOL';

                EventBus.emit('marketDataRecovered', { pair: cryptoPair });
              }

              // Map snake_case from DB to camelCase for Event
              const pair = row.pair;
              const mappedState: MarketState = {
                pair,
                price: Number(row.price),
                volume: Number(row.volume),
                rsi: Number(row.rsi),
                rsiState: (row.rsi_state as RsiState | null) ?? 'NEUTRAL',
                atr: Number(row.atr),
                atrPercent: Number(row.atr_percent),
                spawnRateMultiplier: Number(row.spawn_rate_multiplier),
                normalizedVolume: Number(row.normalized_volume),
                volumePercentile: Number(row.volume_percentile),
                whaleTier: (row.whale_tier as 0 | 1 | 2 | 3 | null) ?? 0,
                enemyAggroMultiplier: Number(row.enemy_aggro_multiplier_long),
                updatedAt: new Date(String(row.updated_at)),
              };
              this.states.set(pair, mappedState);
              EventBus.emit('marketStateUpdated', mappedState);
            }
          }
        )
        .subscribe();

      // 3. Start staleness check
      this.stalenessTimer = setInterval(() => this.checkStaleness(), 5000);

      Logger.info('[MarketState] Realtime subscription active');
    } catch (error) {
      Logger.error('[MarketState] Failed to initialize:', error);
    }
  }

  private checkStaleness(): void {
    const now = Date.now();
    const elapsed = now - this.lastUpdate;

    if (elapsed > STALE_THRESHOLD_MS && !this.isStale) {
      this.isStale = true;
      Logger.warn(`[MarketState] Data is stale! (${(elapsed / 1000).toFixed(1)}s)`);
      EventBus.emit('marketDataTimeout', {
        lastPriceTime: this.lastUpdate,
        disconnectedDuration: elapsed,
        pair: 'ALL',
      });
    }
  }

  async fetchAll(): Promise<void> {
    if (!supabase) return;
    try {
      const { data, error } = await supabase.from('market_state').select('*');
      if (error) throw error;

      (data as Array<Record<string, unknown>> | null)?.forEach(row => {
        const pair = String(row.pair);
        const mappedState: MarketState = {
          pair,
          price: Number(row.price),
          volume: Number(row.volume),
          rsi: Number(row.rsi),
          rsiState: (row.rsi_state as RsiState | null) ?? 'NEUTRAL',
          atr: Number(row.atr),
          atrPercent: Number(row.atr_percent),
          spawnRateMultiplier: Number(row.spawn_rate_multiplier),
          normalizedVolume: Number(row.normalized_volume),
          volumePercentile: Number(row.volume_percentile),
          whaleTier: (row.whale_tier as 0 | 1 | 2 | 3 | null) ?? 0,
          enemyAggroMultiplier: Number(row.enemy_aggro_multiplier_long),
          updatedAt: new Date(String(row.updated_at)),
        };
        this.states.set(pair, mappedState);
      });
      this.lastUpdate = Date.now();
      Logger.info(`[MarketState] Fetched ${data.length} pairs`);
    } catch (error) {
      Logger.error('[MarketState] Fetch failed:', error);
    }
  }

  getState(pair: string = 'BTC-USD'): MarketState | undefined {
    return this.states.get(pair);
  }

  /**
   * Fetch market history for a specific pair with Gap-Filling
   */
  async fetchMarketHistory(
    pair: string,
    limit: number = 300
  ): Promise<Array<{ price: number; volume: number; timestamp: number }>> {
    if (!supabase) return [];

    try {
      // Sort in descending order to get latest 'limit' logs, then reverse to get chronological
      const { data, error } = await supabase
        .from('price_logs')
        .select('price, volume, timestamp')
        .eq('pair', pair)
        .order('timestamp', { ascending: false })
        .limit(limit);

      if (error) throw error;
      if (data.length === 0) return [];

      const rawLogs = data.reverse();
      const filledLogs: Array<{ price: number; volume: number; timestamp: number }> =
        [];

      let lastLog: { price: number; volume: number; timestamp: number } | null = null;

      for (const log of rawLogs) {
        const currentPrice = Number(log.price);
        const currentVolume = Number(log.volume);
        const currentTs = new Date(log.timestamp).getTime();

        if (lastLog) {
          const timeDiff = currentTs - lastLog.timestamp;

          // Gap-Filling: If gap > 1.5s, fill with last known data at 1s intervals
          if (timeDiff > 1500) {
            const gapsToFill = Math.floor(timeDiff / 1000) - 1;
            for (let i = 1; i <= gapsToFill; i++) {
              filledLogs.push({
                price: lastLog.price,
                volume: lastLog.volume,
                timestamp: lastLog.timestamp + i * 1000,
              });
            }
          }
        }

        const currentLog = {
          price: currentPrice,
          volume: currentVolume,
          timestamp: currentTs,
        };
        filledLogs.push(currentLog);
        lastLog = currentLog;
      }

      // Ensure we have at most 'limit' logs in the exact chronological window
      return filledLogs.slice(-limit);
    } catch (error) {
      Logger.error(`[MarketState] History fetch failed for ${pair}:`, error);
      return [];
    }
  }

  getAllStates(): MarketState[] {
    return Array.from(this.states.values());
  }

  cleanup(): void {
    if (this.subscription) {
      void this.subscription.unsubscribe();
      this.subscription = null;
    }
    if (this.stalenessTimer) {
      clearInterval(this.stalenessTimer);
      this.stalenessTimer = null;
    }
  }
}

export const MarketStateService = MarketStateServiceClass.getInstance();
