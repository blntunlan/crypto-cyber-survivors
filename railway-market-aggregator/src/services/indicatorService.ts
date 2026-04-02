import { RSICalculator } from '../indicators/RSICalculator';
import { ATRCalculator } from '../indicators/ATRCalculator';
import { VolumeAnalyzer } from '../indicators/VolumeAnalyzer';
import { DatabaseService } from './databaseService';
import { Logger } from '../utils/logger';
import { broadcastMarketData } from '../routes/marketStream';

interface PairIndicators {
  rsi: RSICalculator;
  atr: ATRCalculator;
  volume: VolumeAnalyzer;
}

export class IndicatorService {
  private static instance: IndicatorService | null = null;
  private indicators: Map<string, PairIndicators> = new Map();
  private lastDbUpdate: Map<string, number> = new Map();
  private db: DatabaseService;

  private readonly DB_UPDATE_THROTTLE = 1000;

  private stats = {
    updates: 0,
    lastUpdate: new Date(0),
    errors: 0,
  };

  private constructor() {
    this.db = DatabaseService.getInstance();

    ['BTC', 'ETH', 'SOL'].forEach(pair => {
      this.indicators.set(pair, {
        rsi: new RSICalculator(14),
        atr: new ATRCalculator(14),
        volume: new VolumeAnalyzer(300, 30000),
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

      const rsiResult = ind.rsi.update(data.price);
      const atrResult = ind.atr.update(data.high, data.low, data.price);
      const volumeResult = ind.volume.update(data.volume);

      const spawnRateMultiplier = ind.atr.getSpawnRateMultiplier(atrResult.atrPercent);
      const { long: aggroLong, short: aggroShort } = this.calculateAggroMultipliers(
        rsiResult.rsi
      );

      const now = Date.now();
      const lastUpdate = this.lastDbUpdate.get(data.pair) ?? 0;

      if (now - lastUpdate >= this.DB_UPDATE_THROTTLE) {
        this.lastDbUpdate.set(data.pair, now);

        void this.db
          .updateMarketState({
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
          })
          .catch(err => {
            this.stats.errors++;
            Logger.error(`DB Update Error [${data.pair}]:`, err);
          });
      }

      broadcastMarketData({
        pair: data.pair,
        price: data.price,
        volume: data.volume,
        high: data.high,
        low: data.low,
        rsi: rsiResult.rsi,
        rsiState: rsiResult.state,
        atrPercent: atrResult.atrPercent,
        normalizedVolume: volumeResult.normalized,
        volumePercentile: volumeResult.percentile,
        whaleTier: volumeResult.whaleTier,
        spawnRateMultiplier,
        enemyAggroMultiplierLong: aggroLong,
        enemyAggroMultiplierShort: aggroShort,
        trendStrength: Math.abs((rsiResult.rsi - 50) / 50),
        trendDirection:
          rsiResult.rsi > 55 ? 'UP' : rsiResult.rsi < 45 ? 'DOWN' : 'NEUTRAL',
        timestamp: Date.now(),
      });

      this.stats.updates++;
      this.stats.lastUpdate = new Date();

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

  private calculateAggroMultipliers(rsi: number): { long: number; short: number } {
    const deviation = (rsi - 50) / 50;
    const sensitivity = 0.5;

    const aggroLong = Math.max(0.5, Math.min(2.0, 1.0 - deviation * sensitivity));
    const aggroShort = Math.max(0.5, Math.min(2.0, 1.0 + deviation * sensitivity));

    return { long: Number(aggroLong.toFixed(2)), short: Number(aggroShort.toFixed(2)) };
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
