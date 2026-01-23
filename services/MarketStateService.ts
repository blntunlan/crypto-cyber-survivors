import { supabase } from './Supabase';
import { Logger } from './Logger';
import { EventBus } from './EventBus';
import { type MarketStateUpdatedEvent } from '../types/events';
import { type RealtimeChannel } from '@supabase/supabase-js';
import { type CryptoPair } from '../types';

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
      Logger.info(`[MarketState] Fetched ${data?.length ?? 0} pairs`);
    } catch (error) {
      Logger.error('[MarketState] Fetch failed:', error);
    }
  }

  getState(pair: string = 'BTC-USD'): MarketState | undefined {
    return this.states.get(pair);
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
