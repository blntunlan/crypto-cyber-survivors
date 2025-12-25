import { BinanceService, type KlineData } from './binanceService';
import { SupabaseService } from './supabaseService';
import { Logger } from '../utils/logger';
import { withRetry } from '../utils/retry';

interface LoggerStats {
  totalLogged: number;
  lastLogTime: Date | null;
  errors: number;
  byPair: Record<string, number>;
}

export class PriceLogger {
  private static instance: PriceLogger;
  private binance: BinanceService;
  private supabase: SupabaseService;
  private stats: LoggerStats = {
    totalLogged: 0,
    lastLogTime: null,
    errors: 0,
    byPair: {},
  };

  private constructor() {
    this.binance = BinanceService.getInstance();
    this.supabase = SupabaseService.getInstance();
  }

  static getInstance(): PriceLogger {
    if (!PriceLogger.instance) {
      PriceLogger.instance = new PriceLogger();
    }
    return PriceLogger.instance;
  }

  async start(): Promise<void> {
    // Connect to Binance
    await this.binance.connect();

    // Listen to kline events
    this.binance.on('kline', (data: KlineData) => {
      void this.handleKlineData(data);
    });

    Logger.info('✅ Price logger started');
  }

  private async handleKlineData(data: KlineData): Promise<void> {
    try {
      // Log to Supabase with retry
      await withRetry(
        () =>
          this.supabase.insertPriceLog({
            pair: data.pair,
            price: data.close,
            high: data.high,
            low: data.low,
            volume: data.volume,
            timestamp: data.timestamp,
          }),
        {
          maxRetries: 3,
          delayMs: 1000,
          backoff: true,
        }
      );

      // Update stats
      this.stats.totalLogged++;
      this.stats.lastLogTime = new Date();
      this.stats.byPair[data.pair] = (this.stats.byPair[data.pair] || 0) + 1;

      // Log every 100 entries to reduce noise
      if (this.stats.totalLogged % 100 === 0) {
        Logger.info(`📊 Logged ${this.stats.totalLogged} price entries`);
      }
    } catch (error) {
      this.stats.errors++;
      Logger.error(`Failed to log ${data.pair} price:`, error);
    }
  }

  async stop(): Promise<void> {
    await this.binance.disconnect();
    Logger.info('Price logger stopped');
  }

  getStats(): LoggerStats {
    return { ...this.stats };
  }
}
