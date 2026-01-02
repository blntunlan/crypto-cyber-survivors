import { RSICalculator } from '../indicators/RSICalculator';
import { ATRCalculator } from '../indicators/ATRCalculator';
import { VolumeAnalyzer } from '../indicators/VolumeAnalyzer';
import { SupabaseService } from './supabaseService';
import { Logger } from '../utils/logger';

interface PairIndicators {
  rsi: RSICalculator;
  atr: ATRCalculator;
  volume: VolumeAnalyzer;
}

export class IndicatorService {
  private static instance: IndicatorService | null = null;
  private indicators: Map<string, PairIndicators> = new Map();
  private supabase: SupabaseService;

  // Statistics
  private stats = {
    updates: 0,
    lastUpdate: new Date(0),
    errors: 0,
  };

  private constructor() {
    this.supabase = SupabaseService.getInstance();

    // Initialize indicators for each pair
    // Volume: 300 data points = 5 minutes of 1s candles
    // Whale cooldown: 30 seconds (prevents spam during sustained high volume)
    ['BTC', 'ETH', 'SOL'].forEach(pair => {
      this.indicators.set(pair, {
        rsi: new RSICalculator(7),
        atr: new ATRCalculator(14),
        volume: new VolumeAnalyzer(300, 30000), // 5 min history, 30s cooldown
      });
    });

    Logger.info('✅ IndicatorService initialized (Volume: 5min window, 30s cooldown)');
  }

  static getInstance(): IndicatorService {
    return (IndicatorService.instance ??= new IndicatorService());
  }

  async update(data: {
    pair: string;
    price: number;
    high: number;
    low: number;
    volume: number;
  }): Promise<void> {
    try {
      const ind = this.indicators.get(data.pair);
      if (!ind) {
        Logger.warn(`Unknown pair for indicator update: ${data.pair}`);
        return;
      }

      // Calculate all indicators
      const rsiResult = ind.rsi.update(data.price);
      const atrResult = ind.atr.update(data.high, data.low, data.price);
      const volumeResult = ind.volume.update(data.volume);

      // Calculate derived metrics
      const spawnRateMultiplier = ind.atr.getSpawnRateMultiplier(atrResult.atrPercent);
      const { long: aggroLong, short: aggroShort } = this.calculateAggroMultipliers(
        rsiResult.state
      );

      // Update Supabase
      // Note: This is an upsert, so it's efficient.
      // We might want to throttle this if it causes too much DB load,
      // but "every second" is generally fine for single-row updates.
      await this.supabase.updateMarketState({
        pair: data.pair,
        price: data.price,
        volume: data.volume,
        high: data.high,
        low: data.low,
        rsi: rsiResult.rsi,
        rsi_state: rsiResult.state,
        atr: atrResult.atr,
        atr_percent: atrResult.atrPercent,
        spawn_rate_multiplier: spawnRateMultiplier,
        normalized_volume: volumeResult.normalized,
        volume_percentile: volumeResult.percentile,
        volume_z_score: volumeResult.zScore,
        volume_mean: volumeResult.mean,
        volume_std_dev: volumeResult.stdDev,
        whale_tier: volumeResult.whaleTier,
        volume_history_min: volumeResult.min,
        volume_history_max: volumeResult.max,
        volume_history_count: ind.volume.getHistoryCount(),
        enemy_aggro_multiplier_long: aggroLong,
        enemy_aggro_multiplier_short: aggroShort,
      });

      this.stats.updates++;
      this.stats.lastUpdate = new Date();

      // Log whale spawn events with z-score for better debugging
      if (volumeResult.whaleTier > 0 && ind.volume.canSpawnWhale(Date.now())) {
        const tierNames = ['', 'BABY_WHALE', 'WHALE', 'MEGA_WHALE'];
        Logger.info(
          `🐳 ${tierNames[volumeResult.whaleTier]} [${data.pair}] ` +
            `z-score: ${volumeResult.zScore.toFixed(2)}σ | ` +
            `Vol: ${data.volume.toFixed(0)} (mean: ${volumeResult.mean.toFixed(0)}, σ: ${volumeResult.stdDev.toFixed(0)})`
        );
        this.recordWhaleSpawn(data.pair);
      }
    } catch (error) {
      this.stats.errors++;
      Logger.error(`Failed to update indicators for ${data.pair}:`, error);
    }
  }

  private calculateAggroMultipliers(rsiState: string): { long: number; short: number } {
    switch (rsiState) {
      case 'OVERSOLD':
        return { long: 0.7, short: 1.5 }; // Favors LONG (market expected to bounce up)
      case 'OVERBOUGHT':
        return { long: 1.5, short: 0.7 }; // Favors SHORT (market expected to correct down)
      default:
        return { long: 1.0, short: 1.0 }; // Neutral
    }
  }

  recordWhaleSpawn(pair: string): void {
    const ind = this.indicators.get(pair);
    if (ind) {
      ind.volume.recordWhaleSpawn(Date.now());
    }
  }

  getStats() {
    return {
      ...this.stats,
      pairs: Array.from(this.indicators.entries()).map(([pair, ind]) => ({
        pair,
        historyCounts: {
          volume: ind.volume.getHistoryCount(),
        },
      })),
    };
  }
}
