/**
 * AdminPriceFeedService - Background price feed for Admin Dashboard
 *
 * Creates MarketService instances for ALL crypto pairs (BTC, ETH, SOL)
 * so the Admin Dashboard can show live data for all pairs, not just
 * the currently selected game pair.
 *
 * This runs only in development mode to conserve resources.
 */

import { MarketService, type MarketUpdate } from '../MarketService';
import { priceAnalyzer } from './PriceAnalyzerService';
import { Logger } from '../Logger';
import type { CryptoPair } from '../../types/crypto';

class AdminPriceFeedServiceClass {
  private static instance: AdminPriceFeedServiceClass | null = null;

  private services: Map<CryptoPair, MarketService> = new Map();
  private isRunning: boolean = false;

  // All pairs we want to track
  private readonly ALL_PAIRS: CryptoPair[] = ['BTC', 'ETH', 'SOL'];

  private constructor() {}

  static getInstance(): AdminPriceFeedServiceClass {
    return (AdminPriceFeedServiceClass.instance ??= new AdminPriceFeedServiceClass());
  }

  /**
   * Start background price feeds for all pairs
   * Call this when Admin Dashboard is opened
   */
  start(): void {
    if (this.isRunning) {
      Logger.debug('[AdminPriceFeed] Already running');
      return;
    }

    Logger.info('[AdminPriceFeed] Starting background price feeds for all pairs');

    for (const pair of this.ALL_PAIRS) {
      if (this.services.has(pair)) continue;

      const service = new MarketService({
        pair,
        onData: (update: MarketUpdate) => {
          // Feed data to PriceAnalyzerService
          priceAnalyzer.addPrice(update.pair, update.price, update.source);
        },
      });

      this.services.set(pair, service);
      service.connect();

      Logger.debug(`[AdminPriceFeed] Started feed for ${pair}`);
    }

    this.isRunning = true;
  }

  /**
   * Stop all background price feeds
   * Call this when Admin Dashboard is closed
   */
  stop(): void {
    if (!this.isRunning) return;

    Logger.info('[AdminPriceFeed] Stopping background price feeds');

    for (const [pair, service] of this.services) {
      service.destroy();
      Logger.debug(`[AdminPriceFeed] Stopped feed for ${pair}`);
    }

    this.services.clear();
    this.isRunning = false;
  }

  /**
   * Check if feeds are running
   */
  isActive(): boolean {
    return this.isRunning;
  }

  /**
   * Get status of all feeds
   */
  getStatus(): Record<CryptoPair, boolean> {
    const status: Record<CryptoPair, boolean> = {
      BTC: false,
      ETH: false,
      SOL: false,
    };

    for (const pair of this.ALL_PAIRS) {
      const service = this.services.get(pair);
      status[pair] = service?.isConnected() ?? false;
    }

    return status;
  }
}

export const adminPriceFeed = AdminPriceFeedServiceClass.getInstance();
