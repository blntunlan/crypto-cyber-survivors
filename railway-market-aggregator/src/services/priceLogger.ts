import { BinanceService, type KlineData } from './binanceService';
import { CoinbaseService } from './coinbaseService';
import { DatabaseService } from './databaseService';
import { Logger } from '../utils/logger';
import { withRetry } from '../utils/retry';
import { IndicatorService } from './indicatorService';

interface LoggerStats {
  totalLogged: number;
  lastLogTime: Date | null;
  errors: number;
  byPair: Record<string, number>;
}

export class PriceLogger {
  private static instance: PriceLogger | null = null;
  private binance: BinanceService;
  private db: DatabaseService;
  private stats: LoggerStats = {
    totalLogged: 0,
    lastLogTime: null,
    errors: 0,
    byPair: {},
  };

  private activeSource: 'BINANCE' | 'COINBASE' = 'BINANCE';
  private coinbase: CoinbaseService;
  private lastDataTime: number = Date.now();
  private watchdogTimer: NodeJS.Timeout | null = null;
  private recoveryTimer: NodeJS.Timeout | null = null;
  private readonly STALE_THRESHOLD = 15000;
  private readonly RECOVERY_INTERVAL = 60000;
  private readonly LOG_INTERVAL = 10000;
  private lastLogTimes: Map<string, number> = new Map();

  private constructor() {
    this.binance = BinanceService.getInstance();
    this.coinbase = CoinbaseService.getInstance();
    this.db = DatabaseService.getInstance();
  }

  static getInstance(): PriceLogger {
    return (PriceLogger.instance ??= new PriceLogger());
  }

  async start(): Promise<void> {
    this.binance.on('kline', (data: KlineData) => {
      if (this.activeSource === 'BINANCE') {
        this.lastDataTime = Date.now();
        void this.handleKlineData(data);
      }
    });

    this.coinbase.on('kline', (data: KlineData) => {
      if (this.activeSource === 'COINBASE') {
        this.lastDataTime = Date.now();
        void this.handleKlineData(data);
      }
    });

    await this.switchToPrimary();
    this.startWatchdog();

    Logger.info('✅ Price logger started');
  }

  private startWatchdog(): void {
    if (this.watchdogTimer) clearInterval(this.watchdogTimer);
    if (this.recoveryTimer) clearInterval(this.recoveryTimer);

    this.watchdogTimer = setInterval(() => {
      const elapsed = Date.now() - this.lastDataTime;

      if (this.activeSource === 'BINANCE' && elapsed > this.STALE_THRESHOLD) {
        Logger.warn(`⚠️ Binance data stale (${elapsed}ms). Switching to Fallback...`);
        void this.switchToFallback();
      }
    }, 5000);

    this.recoveryTimer = setInterval(() => {
      if (this.activeSource === 'COINBASE') {
        Logger.info('🔄 Attempting to restore Primary feed...');
        void this.switchToPrimary();
      }
    }, this.RECOVERY_INTERVAL);
  }

  private async switchToPrimary(): Promise<void> {
    try {
      if (this.coinbase.isConnected()) await this.coinbase.disconnect();

      this.activeSource = 'BINANCE';
      this.lastDataTime = Date.now();

      await this.binance.connect();
      Logger.info('🌐 Switched to Primary Feed (Binance)');
    } catch (error) {
      Logger.error('Failed to switch to Primary:', error);
      void this.switchToFallback();
    }
  }

  private async switchToFallback(): Promise<void> {
    try {
      if (this.binance.isConnected()) await this.binance.disconnect();

      this.activeSource = 'COINBASE';
      this.lastDataTime = Date.now();

      await this.coinbase.connect();
      Logger.info('🛡️ Switched to Fallback Feed (Coinbase)');
    } catch (error) {
      Logger.error('Failed to switch to Fallback:', error);
    }
  }

  private async handleKlineData(data: KlineData): Promise<void> {
    try {
      const now = Date.now();
      const lastLog = this.lastLogTimes.get(data.pair) ?? 0;

      if (now - lastLog >= this.LOG_INTERVAL) {
        await withRetry(
          () =>
            this.db.insertPriceLog({
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
        this.lastLogTimes.set(data.pair, now);
      }

      void IndicatorService.getInstance().update({
        pair: data.pair,
        price: data.close,
        high: data.high,
        low: data.low,
        volume: data.volume,
      });

      this.stats.totalLogged++;
      this.stats.lastLogTime = new Date();
      this.stats.byPair[data.pair] = (this.stats.byPair[data.pair] || 0) + 1;

      if (this.stats.totalLogged % 100 === 0) {
        Logger.info(`📊 Logged ${this.stats.totalLogged} price entries`);
      }
    } catch (error) {
      this.stats.errors++;
      Logger.error(`Failed to log ${data.pair} price:`, error);
    }
  }

  async stop(): Promise<void> {
    if (this.watchdogTimer) {
      clearInterval(this.watchdogTimer);
      this.watchdogTimer = null;
    }
    if (this.recoveryTimer) {
      clearInterval(this.recoveryTimer);
      this.recoveryTimer = null;
    }
    await this.binance.disconnect();
    if (this.coinbase.isConnected()) await this.coinbase.disconnect();
    Logger.info('Price logger stopped');
  }

  getStats(): LoggerStats {
    return { ...this.stats };
  }
}
