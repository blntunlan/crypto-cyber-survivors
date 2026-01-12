/**
 * MarketStateService - Subscribes to Supabase market_state
 *
 * Provides indicator data from the server to the client.
 * Uses the server as the source of truth instead of local calculations.
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
  private rawState: Record<string, unknown> | null = null;

  static getInstance(): MarketStateServiceImpl {
    return (this.instance ??= new MarketStateServiceImpl());
  }

  async initialize(
    pair: string,
    position: 'LONG' | 'SHORT'
  ): Promise<MarketState | null> {
    this.currentPair = pair;
    this.currentPosition = position;

    if (!supabase) {
      Logger.warn(
        '[MarketStateService] Supabase not configured. Market state will not update.'
      );
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
        this.rawState = data as Record<string, unknown>;
        this.state = this.transformState(this.rawState);
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
    this.rawState = data;
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

  /**
   * Transform raw Supabase data to MarketState with validation and fallbacks.
   * Handles missing, invalid, or NaN values gracefully.
   */
  private transformState(data: Record<string, unknown>): MarketState {
    // Get aggro multiplier based on position
    const aggroMultiplier =
      this.currentPosition === 'LONG'
        ? this.safeParseFloat(data.enemy_aggro_multiplier_long, 1.0)
        : this.safeParseFloat(data.enemy_aggro_multiplier_short, 1.0);

    // Validate and transform with fallbacks
    const state: MarketState = {
      pair: typeof data.pair === 'string' ? data.pair : this.currentPair,
      price: this.safeParseFloat(data.price, 0),
      volume: this.safeParseFloat(data.volume, 0),
      rsi: this.safeParseFloat(data.rsi, 50), // Neutral RSI fallback
      rsiState: this.safeRsiState(data.rsi_state),
      atr: this.safeParseFloat(data.atr, 0),
      atrPercent: this.safeParseFloat(data.atr_percent, 1.0), // Normal volatility fallback
      spawnRateMultiplier: this.safeParseFloat(data.spawn_rate_multiplier, 1.0),
      normalizedVolume: this.safeParseFloat(data.normalized_volume, 0.5),
      volumePercentile: this.safeParseFloat(data.volume_percentile, 50),
      whaleTier: this.safeWhaleTier(data.whale_tier),
      enemyAggroMultiplier: aggroMultiplier,
      updatedAt: data.updated_at ? new Date(data.updated_at as string) : new Date(),
    };

    // Log warning if critical data is missing
    if (state.price === 0) {
      Logger.warn('[MarketStateService] Price is 0 or missing - using fallback');
    }

    return state;
  }

  /**
   * Safely parses a number with a fallback.
   */
  private safeParseFloat(value: unknown, fallback: number): number {
    if (value === null || value === undefined) return fallback;
    const parsed = typeof value === 'number' ? value : parseFloat(String(value));
    return Number.isFinite(parsed) ? parsed : fallback;
  }

  /**
   * Validates RSI state.
   */
  private safeRsiState(value: unknown): 'OVERSOLD' | 'NEUTRAL' | 'OVERBOUGHT' {
    const validStates = ['OVERSOLD', 'NEUTRAL', 'OVERBOUGHT'] as const;
    if (
      typeof value === 'string' &&
      (validStates as readonly string[]).includes(value)
    ) {
      return value as 'OVERSOLD' | 'NEUTRAL' | 'OVERBOUGHT';
    }
    return 'NEUTRAL';
  }

  /**
   * Validates whale tier.
   */
  private safeWhaleTier(value: unknown): 0 | 1 | 2 | 3 {
    const tier = typeof value === 'number' ? value : parseInt(String(value), 10);
    return tier >= 0 && tier <= 3 && Number.isFinite(tier)
      ? (tier as 0 | 1 | 2 | 3)
      : 0;
  }

  getState(): MarketState | null {
    return this.state;
  }

  /**
   * Updates current position and recalculates aggro multipliers if state is available.
   *
   * @param position 'LONG' | 'SHORT'
   */
  setPosition(position: 'LONG' | 'SHORT'): void {
    this.currentPosition = position;
    if (this.rawState) {
      // Re-transform state with the new position logic applied
      this.state = this.transformState(this.rawState);
      EventBus.emit('marketStateUpdated', this.state);
      Logger.debug(`[MarketStateService] Updated for position: ${position}`);
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
