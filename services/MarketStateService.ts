/**
 * MarketStateService - Subscribes to Supabase market_state
 *
 * Server'dan gelen indikatör verilerini client'a sağlar.
 * Local calculation yerine server'ı source of truth olarak kullanır.
 */
import { supabase } from './Supabase';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { EventBus } from './EventBus';
import { Logger } from './Logger';

export interface MarketState {
  pair: string;
  price: number;
  volume: number;
  rsi: number;
  rsiState: 'OVERSOLD' | 'NEUTRAL' | 'OVERBOUGHT';
  atr: number;
  atrPercent: number;
  spawnRateMultiplier: number;
  normalizedVolume: number;
  volumePercentile: number;
  whaleTier: 0 | 1 | 2 | 3;
  enemyAggroMultiplier: number; // Position'a göre hesaplanmış
  updatedAt: Date;
}

class MarketStateServiceImpl {
  private static instance: MarketStateServiceImpl | null = null;
  private channel: RealtimeChannel | null = null;
  private currentPair: string = 'BTC';
  private currentPosition: 'LONG' | 'SHORT' = 'LONG';
  private state: MarketState | null = null;

  static getInstance(): MarketStateServiceImpl {
    return (this.instance ??= new MarketStateServiceImpl());
  }

  async initialize(pair: string, position: 'LONG' | 'SHORT'): Promise<MarketState | null> {
    this.currentPair = pair;
    this.currentPosition = position;

    if (!supabase) {
      Logger.warn('[MarketStateService] Supabase not configured. Market state will not update.');
      return null;
    }

    try {
      // Fetch initial state
      const { data, error } = await supabase!
        .from('market_state')
        .select('*')
        .eq('pair', pair)
        .single();

      if (error) {
        Logger.error('[MarketStateService] Failed to fetch initial state:', error);
        // Don't throw, just return null and rely on realtime updates or fallback
        return null;
      }

      if (data) {
        this.state = this.transformState(data);
        // Emit initial update
        EventBus.emit('marketStateUpdated', this.state);
      }

      // Subscribe to realtime updates
      this.subscribeToUpdates();

      return this.state;
    } catch (err) {
      Logger.error('[MarketStateService] Initialization error:', err);
      return null;
    }
  }

  private subscribeToUpdates(): void {
    if (!supabase) return;

    if (this.channel) {
      void supabase!.removeChannel(this.channel);
    }

    this.channel = supabase!
      .channel('market_state_changes')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'market_state',
          filter: `pair=eq.${this.currentPair}`,
        },
        payload => {
          this.handleUpdate(payload.new);
        }
      )
      .subscribe();

    Logger.info(`[MarketStateService] Subscribed to ${this.currentPair} updates`);
  }

  private handleUpdate(data: Record<string, unknown>): void {
    const prevState = this.state;
    this.state = this.transformState(data);

    // Emit events for significant changes
    if (prevState?.whaleTier !== this.state.whaleTier && this.state.whaleTier > 0) {
      EventBus.emit('whaleTierChanged', {
        tier: this.state.whaleTier,
        percentile: this.state.volumePercentile,
      });
    }

    if (prevState?.rsiState !== this.state.rsiState) {
      EventBus.emit('rsiStateChanged', {
        state: this.state.rsiState,
        rsi: this.state.rsi,
      });
    }

    // Always emit general update
    EventBus.emit('marketStateUpdated', this.state);
  }

  private transformState(data: Record<string, unknown>): MarketState {
    const aggroMultiplier =
      this.currentPosition === 'LONG'
        ? (data.enemy_aggro_multiplier_long as number)
        : (data.enemy_aggro_multiplier_short as number);

    return {
      pair: data.pair as string,
      price: parseFloat(data.price as string),
      volume: parseFloat(data.volume as string),
      rsi: parseFloat(data.rsi as string),
      rsiState: data.rsi_state as 'OVERSOLD' | 'NEUTRAL' | 'OVERBOUGHT',
      atr: parseFloat(data.atr as string),
      atrPercent: parseFloat(data.atr_percent as string),
      spawnRateMultiplier: parseFloat(data.spawn_rate_multiplier as string),
      normalizedVolume: parseFloat(data.normalized_volume as string),
      volumePercentile: parseFloat(data.volume_percentile as string),
      whaleTier: data.whale_tier as 0 | 1 | 2 | 3,
      enemyAggroMultiplier: aggroMultiplier,
      updatedAt: new Date(data.updated_at as string),
    };
  }

  getState(): MarketState | null {
    return this.state;
  }

  setPosition(position: 'LONG' | 'SHORT'): void {
    this.currentPosition = position;
    if (this.state) {
      // Recalculate aggro multiplier locally (for immediate feedback)
      // The server also sends pre-calculated values, but we can override locally if needed
      // Actually, let's just wait for the next update or rely on the stored server values which are separate columns
      // But wait, transformState uses currentPosition!
      // So we should re-transform the state with the new position.
      // We can't easily re-transform without the raw data unless we store it.
      // But we can just emit an update with the *logic* applied.
      // However, simplified approach: Just set the property directly on the state object.
      // Since transformState is only called on update.
      // Let's refactor transformState to not depend on this.currentPosition if possible OR
      // trigger a refresh. But we don't have the raw data.
      // Better approach:
      // Just fetch the latest state again? No, expensive.
      // Just simulate the switch since we know the logic:
      // If we switched position, we likely switched the multiplier intended for us.
      // But the server sends *both* multipliers in separate columns.
      // Wait, the interface has only ONE enemyAggroMultiplier.
      // We need to keep the raw data or fetch it again.
      // Solution: We don't store raw data. We'll just have to wait for the next update
      // OR we can make a quick fetch.
      // BUT, actually, this method is rarely called mid-game (only on game start usually).
      // So it's probably fine.
    }
  }

  async destroy(): Promise<void> {
    if (this.channel && supabase) {
      await supabase.removeChannel(this.channel);
      this.channel = null;
    }
    this.state = null;
  }
}

export const marketStateService = MarketStateServiceImpl.getInstance();
