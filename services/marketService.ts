/**
 * MarketService - Real-time Bitcoin Price WebSocket Client
 *
 * Connects to Binance and Coinbase WebSocket feeds for live BTC/USD prices.
 * Features:
 * - Dual-source price feeds for redundancy
 * - Exponential backoff reconnection
 * - Connection state tracking
 * - Automatic failover
 * - Zod validation for type safety
 */

import { COINBASE_WS_URL, getBinanceWsUrl } from '../constants';
import { Logger } from './Logger';
import { CRYPTO_PAIRS, type CryptoPair, type CryptoConfig } from '../types/crypto';
import {
  parseBinanceData,
  parseCoinbaseData,
  isCoinbaseSubscription,
} from '../schemas/marketSchemas';

export interface MarketUpdate {
  price: number;
  high?: number;
  low?: number;
  source: 'binance' | 'coinbase';
  volume?: number;
  pair: CryptoPair;
}

export interface MarketServiceConfig {
  pair: CryptoPair;
  onData: (update: MarketUpdate) => void;
  onStatusChange?: (status: ConnectionStatus) => void;
  wsFactory?: WebSocketFactory;
}

export type ConnectionState = 'disconnected' | 'connecting' | 'connected' | 'reconnecting';

export interface ConnectionStatus {
  binance: ConnectionState;
  coinbase: ConnectionState;
  lastPriceTime: number | null;
}

// Exponential backoff config
const INITIAL_RECONNECT_DELAY = 1000; // 1 second
const MAX_RECONNECT_DELAY = 30000; // 30 seconds
const RECONNECT_MULTIPLIER = 2;

export type WebSocketFactory = (url: string) => WebSocket;

export class MarketService {
  private binanceSocket: WebSocket | null = null;
  private coinbaseSocket: WebSocket | null = null;
  private onDataCallback: (update: MarketUpdate) => void;
  private wasClosedIntentionally: boolean = false;
  private wsFactory: WebSocketFactory;

  // Connection state tracking
  private binanceState: ConnectionState = 'disconnected';
  private coinbaseState: ConnectionState = 'disconnected';
  private lastPriceTime: number | null = null;

  // Reconnection tracking
  private binanceReconnectDelay: number = INITIAL_RECONNECT_DELAY;
  private coinbaseReconnectDelay: number = INITIAL_RECONNECT_DELAY;
  private binanceReconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private coinbaseReconnectTimer: ReturnType<typeof setTimeout> | null = null;

  // Last known price cache
  private lastKnownPrice: number | null = null;

  // Status change callback
  private onStatusChange?: (status: ConnectionStatus) => void;

  private pair: CryptoPair;
  private config: CryptoConfig;

  // Fallback prices when offline (approximate market prices)
  private static readonly FALLBACK_PRICES: Record<CryptoPair, number> = {
    BTC: 43000,
    ETH: 2300,
    SOL: 100,
  };

  // Visibility change handler reference (for cleanup)
  private visibilityHandler: (() => void) | null = null;

  constructor(config: MarketServiceConfig) {
    this.pair = config.pair;
    this.config = CRYPTO_PAIRS[config.pair];
    this.onDataCallback = config.onData;
    this.onStatusChange = config.onStatusChange;
    this.wsFactory = config.wsFactory ?? ((url: string) => new WebSocket(url));
  }

  /**
   * Connect to price feeds
   * Primary: Binance Futures
   * Fallback: Coinbase (only if Binance fails)
   */
  connect(): void {
    this.wasClosedIntentionally = false;
    this.setupVisibilityHandler();
    // Start with Binance as primary source
    this.connectBinance();
    // Coinbase will be started as fallback if Binance fails
  }

  /**
   * Setup tab visibility handler to pause/resume connections
   */
  private setupVisibilityHandler(): void {
    if (this.visibilityHandler) return; // Already setup

    this.visibilityHandler = () => {
      if (document.hidden) {
        // Tab hidden - disconnect to save resources
        Logger.info('[Market] Tab hidden, pausing connections');
        this.pauseConnections();
      } else {
        // Tab visible - reconnect
        Logger.info('[Market] Tab visible, resuming connections');
        this.resumeConnections();
      }
    };

    document.addEventListener('visibilitychange', this.visibilityHandler);
  }

  /**
   * Pause connections without full disconnect (keeps state)
   */
  private pauseConnections(): void {
    // Close sockets but don't mark as intentionally closed
    if (this.binanceSocket) {
      this.binanceSocket.close();
      this.binanceSocket = null;
    }
    if (this.coinbaseSocket) {
      this.coinbaseSocket.close();
      this.coinbaseSocket = null;
    }
    this.updateState('binance', 'disconnected');
    this.updateState('coinbase', 'disconnected');
  }

  /**
   * Resume connections after pause
   */
  private resumeConnections(): void {
    if (!this.wasClosedIntentionally) {
      this.connectBinance();
      this.connectCoinbase();
    }
  }

  /**
   * Get current connection status
   */
  getStatus(): ConnectionStatus {
    return {
      binance: this.binanceState,
      coinbase: this.coinbaseState,
      lastPriceTime: this.lastPriceTime,
    };
  }

  /**
   * Get last known price (for offline fallback)
   */
  getLastKnownPrice(): number | null {
    return this.lastKnownPrice;
  }

  /**
   * Get current price with fallback support
   * Returns last known price, or fallback price if never connected
   */
  getPrice(): number {
    return this.lastKnownPrice ?? MarketService.FALLBACK_PRICES[this.pair];
  }

  /**
   * Check if running in offline mode (using fallback prices)
   */
  isOfflineMode(): boolean {
    return !this.isConnected() && this.lastKnownPrice === null;
  }

  /**
   * Check if any price feed is connected
   */
  isConnected(): boolean {
    return this.binanceState === 'connected' || this.coinbaseState === 'connected';
  }

  private updateState(source: 'binance' | 'coinbase', state: ConnectionState): void {
    if (source === 'binance') {
      this.binanceState = state;
    } else {
      this.coinbaseState = state;
    }

    // Notify status change
    this.onStatusChange?.({
      binance: this.binanceState,
      coinbase: this.coinbaseState,
      lastPriceTime: this.lastPriceTime,
    });
  }

  private connectBinance(): void {
    if (this.wasClosedIntentionally) return;

    try {
      this.updateState('binance', 'connecting');
      Logger.debug(`[Market] Connecting to Binance (${this.pair})...`);

      const wsUrl = getBinanceWsUrl(this.pair);
      this.binanceSocket = this.wsFactory(wsUrl);

      this.binanceSocket.onopen = () => {
        Logger.info('[Market] Binance connected');
        this.updateState('binance', 'connected');
        this.binanceReconnectDelay = INITIAL_RECONNECT_DELAY; // Reset backoff
      };

      this.binanceSocket.onmessage = event => {
        try {
          const rawData = JSON.parse(event.data);
          const update = parseBinanceData(rawData);

          if (update) {
            this.lastKnownPrice = update.price;
            this.lastPriceTime = Date.now();
            this.onDataCallback({ ...update, pair: this.pair });
          }
        } catch {
          Logger.warn('[Market] Failed to parse Binance message');
        }
      };

      this.binanceSocket.onclose = () => {
        if (!this.wasClosedIntentionally) {
          this.updateState('binance', 'reconnecting');
          this.scheduleReconnect('binance');
          // Activate Coinbase as fallback if not already connected
          this.activateFallback();
        } else {
          this.updateState('binance', 'disconnected');
        }
      };

      this.binanceSocket.onerror = error => {
        Logger.warn('[Market] Binance WebSocket error', error);
        // Activate Coinbase as fallback
        this.activateFallback();
      };
    } catch (e) {
      Logger.error('[Market] Binance connection failed', e);
      this.updateState('binance', 'disconnected');
      this.scheduleReconnect('binance');
      // Activate Coinbase as fallback
      this.activateFallback();
    }
  }

  /**
   * Activate Coinbase as fallback when Binance is unavailable
   */
  private activateFallback(): void {
    if (this.coinbaseState === 'disconnected' && !this.wasClosedIntentionally) {
      Logger.info('[Market] Activating Coinbase as fallback...');
      this.connectCoinbase();
    }
  }

  private connectCoinbase(): void {
    if (this.wasClosedIntentionally) return;

    try {
      this.updateState('coinbase', 'connecting');
      Logger.debug('[Market] Connecting to Coinbase...');

      this.coinbaseSocket = this.wsFactory(COINBASE_WS_URL);

      this.coinbaseSocket.onopen = () => {
        Logger.info('[Market] Coinbase connected');
        this.coinbaseSocket?.send(
          JSON.stringify({
            type: 'subscribe',
            product_ids: [this.config.coinbaseProductId],
            channels: ['ticker'],
          })
        );
        this.updateState('coinbase', 'connected');
        this.coinbaseReconnectDelay = INITIAL_RECONNECT_DELAY; // Reset backoff
      };

      this.coinbaseSocket.onmessage = event => {
        try {
          const rawData = JSON.parse(event.data);

          // Skip subscription confirmation messages
          if (isCoinbaseSubscription(rawData)) {
            return;
          }

          const update = parseCoinbaseData(rawData);

          if (update) {
            this.lastKnownPrice = update.price;
            this.lastPriceTime = Date.now();
            this.onDataCallback({ ...update, pair: this.pair });
          }
        } catch {
          Logger.warn('[Market] Failed to parse Coinbase message');
        }
      };

      this.coinbaseSocket.onclose = () => {
        if (!this.wasClosedIntentionally) {
          this.updateState('coinbase', 'reconnecting');
          this.scheduleReconnect('coinbase');
        } else {
          this.updateState('coinbase', 'disconnected');
        }
      };

      this.coinbaseSocket.onerror = error => {
        Logger.warn('[Market] Coinbase WebSocket error', error);
      };
    } catch (e) {
      Logger.error('[Market] Coinbase connection failed', e);
      this.updateState('coinbase', 'disconnected');
      this.scheduleReconnect('coinbase');
    }
  }

  /**
   * Schedule reconnection with exponential backoff
   */
  private scheduleReconnect(source: 'binance' | 'coinbase'): void {
    if (this.wasClosedIntentionally) return;

    const delay = source === 'binance' ? this.binanceReconnectDelay : this.coinbaseReconnectDelay;

    Logger.info(`[Market] Scheduling ${source} reconnect in ${delay}ms`);

    const timer = setTimeout(() => {
      if (source === 'binance') {
        this.binanceReconnectDelay = Math.min(
          this.binanceReconnectDelay * RECONNECT_MULTIPLIER,
          MAX_RECONNECT_DELAY
        );
        this.connectBinance();
      } else {
        this.coinbaseReconnectDelay = Math.min(
          this.coinbaseReconnectDelay * RECONNECT_MULTIPLIER,
          MAX_RECONNECT_DELAY
        );
        this.connectCoinbase();
      }
    }, delay);

    if (source === 'binance') {
      this.binanceReconnectTimer = timer;
    } else {
      this.coinbaseReconnectTimer = timer;
    }
  }

  /**
   * Disconnect from all price feeds
   */
  disconnect(): void {
    this.wasClosedIntentionally = true;

    // Clear pending reconnect timers
    if (this.binanceReconnectTimer) {
      clearTimeout(this.binanceReconnectTimer);
      this.binanceReconnectTimer = null;
    }
    if (this.coinbaseReconnectTimer) {
      clearTimeout(this.coinbaseReconnectTimer);
      this.coinbaseReconnectTimer = null;
    }

    // Close sockets
    if (this.binanceSocket) {
      this.binanceSocket.close();
      this.binanceSocket = null;
    }
    if (this.coinbaseSocket) {
      this.coinbaseSocket.close();
      this.coinbaseSocket = null;
    }

    this.updateState('binance', 'disconnected');
    this.updateState('coinbase', 'disconnected');

    Logger.info('[Market] Disconnected from all feeds');
  }

  /**
   * Force reconnect to all feeds
   */
  reconnect(): void {
    Logger.info('[Market] Force reconnecting...');
    this.disconnect();

    // Reset backoff delays
    this.binanceReconnectDelay = INITIAL_RECONNECT_DELAY;
    this.coinbaseReconnectDelay = INITIAL_RECONNECT_DELAY;

    // Short delay before reconnecting
    setTimeout(() => {
      this.connect();
    }, 500);
  }

  /**
   * Cleanup all resources (call on unmount)
   */
  destroy(): void {
    this.disconnect();

    // Remove visibility handler
    if (this.visibilityHandler) {
      document.removeEventListener('visibilitychange', this.visibilityHandler);
      this.visibilityHandler = null;
    }

    Logger.info('[Market] Service destroyed');
  }
}
