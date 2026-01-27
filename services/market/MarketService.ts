/**
 * MarketService - Real-time Bitcoin Price WebSocket Client
 *
 * Connects to Binance and Coinbase WebSocket feeds for live BTC/USD prices.
 * Features:
 * - Dual-source price feeds for redundancy (Binance primary, Coinbase fallback)
 * - Exponential backoff reconnection for network resilience
 * - Connection state tracking for UI feedback
 * - Automatic failover and session recovery
 * - Tab visibility management to reduce bandwidth when idle
 */

import { COINBASE_WS_URL, getBinanceWsUrl, MARKET } from '../../constants';
import { Logger } from '../system/Logger';
import { CRYPTO_PAIRS, type CryptoPair, type CryptoConfig } from '../../types/crypto';
import {
  parseBinanceData,
  parseCoinbaseData,
  isCoinbaseSubscription,
} from '../../schemas/marketSchemas';

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

export type ConnectionState =
  | 'disconnected'
  | 'connecting'
  | 'connected'
  | 'reconnecting';

export interface ConnectionStatus {
  binance: ConnectionState;
  coinbase: ConnectionState;
  lastPriceTime: number | null;
}

export type WebSocketFactory = (url: string) => WebSocket;

/**
 * MarketService Class
 *
 * Manages WebSocket connections to major cryptocurrency exchanges.
 * Uses a primary/secondary failover strategy to ensure continuous market data
 * availability for game difficulty calculations.
 */
export class MarketService {
  private binanceSocket: WebSocket | null = null;
  private coinbaseSocket: WebSocket | null = null;
  private onDataCallback: (update: MarketUpdate) => void;
  private wasClosedIntentionally: boolean = false;
  private binanceWasClosedIntentionally: boolean = false;
  private coinbaseWasClosedIntentionally: boolean = false;
  private wsFactory: WebSocketFactory;

  // Connection state tracking
  private binanceState: ConnectionState = 'disconnected';
  private coinbaseState: ConnectionState = 'disconnected';
  private lastPriceTime: number | null = null;

  // Reconnection backoff tracking (O(log N) delay growth)
  private binanceReconnectDelay: number = MARKET.RECONNECT.INITIAL_DELAY;
  private coinbaseReconnectDelay: number = MARKET.RECONNECT.INITIAL_DELAY;
  private binanceReconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private coinbaseReconnectTimer: ReturnType<typeof setTimeout> | null = null;

  // Last known price cache for persistence across reconnects
  private lastKnownPrice: number | null = null;

  // Status change notification hook
  private onStatusChange?: (status: ConnectionStatus) => void;

  private pair: CryptoPair;
  private config: CryptoConfig;

  // Visibility change handler reference (stored for proper event cleanup)
  private visibilityHandler: (() => void) | null = null;

  constructor(config: MarketServiceConfig) {
    this.pair = config.pair;
    this.config = CRYPTO_PAIRS[config.pair];
    this.onDataCallback = config.onData;
    this.onStatusChange = config.onStatusChange;
    this.wsFactory = config.wsFactory ?? ((url: string) => new WebSocket(url));
  }

  /**
   * Initialize connections to market feeds.
   * Starts with Binance as the primary high-frequency source.
   */
  public connect(): void {
    this.wasClosedIntentionally = false;
    this.setupVisibilityHandler();
    this.connectBinance();
  }

  /**
   * Setup tab visibility handler to pause/resume connections.
   * Prevents background tabs from consuming unnecessary resources/bandwidth.
   *
   * @private
   */
  private setupVisibilityHandler(): void {
    if (this.visibilityHandler) {
      return;
    }

    this.visibilityHandler = () => {
      if (document.hidden) {
        Logger.info('[Market] Tab hidden, pausing connections');
        this.pauseConnections();
      } else {
        Logger.info('[Market] Tab visible, resuming connections');
        this.resumeConnections();
      }
    };

    document.addEventListener('visibilitychange', this.visibilityHandler);
  }

  /**
   * Temporarily suspend connections (e.g. when tab is hidden).
   * Unlike disconnect(), this does not clear the 'wasClosedIntentionally' flag.
   *
   * @private
   */
  private pauseConnections(): void {
    this.wasClosedIntentionally = true; // Prevents onclose from triggering reconnection
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
   * Resumes previously paused connections.
   *
   * @private
   */
  private resumeConnections(): void {
    this.wasClosedIntentionally = false;
    this.connectBinance();
    // Re-activates primary source. Fallback (Coinbase) will be
    // triggered automatically if Binance fails to connect.
  }

  /**
   * Retrieves the current aggregate connection status of all feeds.
   */
  public getStatus(): ConnectionStatus {
    return {
      binance: this.binanceState,
      coinbase: this.coinbaseState,
      lastPriceTime: this.lastPriceTime,
    };
  }

  /**
   * Retrieves the most recent successfully received price point.
   */
  public getLastKnownPrice(): number | null {
    return this.lastKnownPrice;
  }

  /**
   * Returns current price with reliable fallback to static baseline if no data received.
   */
  public getPrice(): number {
    const now = Date.now();
    const isStale =
      this.lastPriceTime && now - this.lastPriceTime > MARKET.STALE_PRICE_THRESHOLD_MS;

    if (isStale) {
      return MARKET.FALLBACK_PRICES[this.pair];
    }

    return this.lastKnownPrice ?? MARKET.FALLBACK_PRICES[this.pair];
  }

  /**
   * Returns true if no successful connection has ever established a price.
   */
  public isOfflineMode(): boolean {
    return !this.isConnected() && this.lastKnownPrice === null;
  }

  /**
   * Returns true if at least one market source is currently connected.
   */
  public isConnected(): boolean {
    return this.binanceState === 'connected' || this.coinbaseState === 'connected';
  }

  /**
   * Updates internal state and notifies subscribers of connectivity changes.
   *
   * @private
   */
  private updateState(source: 'binance' | 'coinbase', state: ConnectionState): void {
    if (source === 'binance') {
      this.binanceState = state;
    } else {
      this.coinbaseState = state;
    }

    this.onStatusChange?.({
      binance: this.binanceState,
      coinbase: this.coinbaseState,
      lastPriceTime: this.lastPriceTime,
    });
  }

  /**
   * Establishes connection to the primary Binance WebSocket feed.
   *
   * @private
   */
  private connectBinance(): void {
    if (this.wasClosedIntentionally) {
      return;
    }

    try {
      this.updateState('binance', 'connecting');
      const wsUrl = getBinanceWsUrl(this.pair);
      this.binanceWasClosedIntentionally = false;
      this.binanceSocket = this.wsFactory(wsUrl);

      this.binanceSocket.onopen = () => {
        Logger.info('[Market] Binance connected');
        this.updateState('binance', 'connected');
        this.binanceReconnectDelay = MARKET.RECONNECT.INITIAL_DELAY;
        // If Binance connects, we can safely disconnect the fallback if it was active
        if (this.coinbaseState === 'connected' || this.coinbaseState === 'connecting') {
          Logger.info(
            '[Market] Primary feed (Binance) recovered, disconnecting fallback (Coinbase)'
          );
          this.disconnectCoinbase();
        }
      };

      this.binanceSocket.onmessage = event => {
        try {
          const rawData = JSON.parse(event.data);

          // Symbol Validation: Detect and ignore messages for misaligned pairs
          const messageSymbol = rawData.s ?? rawData.k?.s;
          const expectedSymbol = this.config.symbol;

          if (
            messageSymbol &&
            messageSymbol.toUpperCase() !== expectedSymbol.toUpperCase()
          ) {
            Logger.debug(`Ignoring Binance message for wrong pair: ${messageSymbol}`);
            return;
          }

          const update = parseBinanceData(rawData);
          if (update) {
            this.lastKnownPrice = update.price;
            this.lastPriceTime = Date.now();
            this.onDataCallback({ ...update, pair: this.pair });
          }
        } catch (err) {
          Logger.warn('[Market] Failed to parse Binance message', {
            error: err instanceof Error ? err.message : String(err),
          });
        }
      };

      this.binanceSocket.onclose = () => {
        if (!this.wasClosedIntentionally && !this.binanceWasClosedIntentionally) {
          this.updateState('binance', 'reconnecting');
          this.scheduleReconnect('binance');
          this.activateFallback();
        } else {
          this.updateState('binance', 'disconnected');
          // If we close intentionally (e.g. destroy or hide), also close fallback
          if (this.wasClosedIntentionally) {
            this.disconnectCoinbase();
          }
        }
      };

      this.binanceSocket.onerror = error => {
        Logger.warn('[Market] Binance WebSocket error', error);
        // Explicitly close on error to ensure onclose/reconnect triggers
        if (
          this.binanceSocket?.readyState === WebSocket.OPEN ||
          this.binanceSocket?.readyState === WebSocket.CONNECTING
        ) {
          this.binanceSocket.close();
        }
        this.activateFallback();
      };
    } catch (e) {
      Logger.error('[Market] Binance connection failed', e);
      this.updateState('binance', 'disconnected');
      this.scheduleReconnect('binance');
      this.activateFallback();
    }
  }

  /**
   * Activates secondary Coinbase feed if primary source enters a failure state.
   *
   * @private
   */
  private activateFallback(): void {
    if (this.coinbaseState === 'disconnected' && !this.wasClosedIntentionally) {
      Logger.info('[Market] Activating Coinbase as fallback...');
      this.connectCoinbase();
    }
  }

  /**
   * Establishes connection to the secondary Coinbase feed.
   *
   * @private
   */
  private connectCoinbase(): void {
    if (this.wasClosedIntentionally) {
      return;
    }

    try {
      this.updateState('coinbase', 'connecting');
      this.coinbaseWasClosedIntentionally = false;
      this.coinbaseSocket = this.wsFactory(COINBASE_WS_URL);

      this.coinbaseSocket.onopen = () => {
        Logger.info('[Market] Coinbase connected');
        if (this.coinbaseSocket?.readyState === WebSocket.OPEN) {
          this.coinbaseSocket.send(
            JSON.stringify({
              type: 'subscribe',
              product_ids: [this.config.coinbaseProductId],
              channels: ['ticker'],
            })
          );
        }
        this.updateState('coinbase', 'connected');
        this.coinbaseReconnectDelay = MARKET.RECONNECT.INITIAL_DELAY;
      };

      this.coinbaseSocket.onmessage = event => {
        try {
          const rawData = JSON.parse(event.data);
          if (isCoinbaseSubscription(rawData)) {
            return;
          }

          if (
            rawData.product_id &&
            rawData.product_id !== this.config.coinbaseProductId
          ) {
            Logger.debug(
              `Ignoring Coinbase message for wrong pair: ${rawData.product_id}`
            );
            return;
          }

          const update = parseCoinbaseData(rawData);
          if (update) {
            this.lastKnownPrice = update.price;
            this.lastPriceTime = Date.now();
            this.onDataCallback({ ...update, pair: this.pair });
          }
        } catch (err) {
          Logger.warn('[Market] Failed to parse Coinbase message', {
            error: err instanceof Error ? err.message : String(err),
          });
        }
      };

      this.coinbaseSocket.onclose = () => {
        if (!this.wasClosedIntentionally && !this.coinbaseWasClosedIntentionally) {
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
   * Implements exponential backoff strategy for socket reconnection.
   *
   * @private
   */
  private scheduleReconnect(source: 'binance' | 'coinbase'): void {
    if (this.wasClosedIntentionally) {
      return;
    }

    const delay =
      source === 'binance' ? this.binanceReconnectDelay : this.coinbaseReconnectDelay;
    Logger.info(`[Market] Scheduling ${source} reconnect in ${delay}ms`);

    if (source === 'binance' && this.binanceReconnectTimer) {
      clearTimeout(this.binanceReconnectTimer);
    } else if (source === 'coinbase' && this.coinbaseReconnectTimer) {
      clearTimeout(this.coinbaseReconnectTimer);
    }

    const timer = setTimeout(() => {
      if (source === 'binance') {
        this.binanceReconnectDelay = Math.min(
          this.binanceReconnectDelay * MARKET.RECONNECT.MULTIPLIER,
          MARKET.RECONNECT.MAX_DELAY
        );
        this.connectBinance();
      } else {
        this.coinbaseReconnectDelay = Math.min(
          this.coinbaseReconnectDelay * MARKET.RECONNECT.MULTIPLIER,
          MARKET.RECONNECT.MAX_DELAY
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
   * Explicitly closes Coinbase fallback connection.
   *
   * @private
   */
  private disconnectCoinbase(): void {
    this.coinbaseWasClosedIntentionally = true;
    if (this.coinbaseReconnectTimer) {
      clearTimeout(this.coinbaseReconnectTimer);
      this.coinbaseReconnectTimer = null;
    }

    if (this.coinbaseSocket) {
      this.coinbaseSocket.close();
      this.coinbaseSocket = null;
    }

    this.updateState('coinbase', 'disconnected');
  }

  /**
   * Explicitly closes all open WebSocket connections and cancels pending retries.
   */
  public disconnect(): void {
    this.wasClosedIntentionally = true;

    if (this.binanceReconnectTimer) {
      clearTimeout(this.binanceReconnectTimer);
      this.binanceReconnectTimer = null;
    }

    if (this.binanceSocket) {
      this.binanceSocket.close();
      this.binanceSocket = null;
    }

    this.disconnectCoinbase();

    this.updateState('binance', 'disconnected');
    Logger.info('[Market] Disconnected from all feeds');
  }

  /**
   * High-level force reset of all market connections.
   */
  public reconnect(): void {
    Logger.info('[Market] Force reconnecting...');
    this.disconnect();

    this.binanceReconnectDelay = MARKET.RECONNECT.INITIAL_DELAY;
    this.coinbaseReconnectDelay = MARKET.RECONNECT.INITIAL_DELAY;

    setTimeout(() => {
      this.connect();
    }, MARKET.RECONNECT.FORCE_RECONNECT_DELAY);
  }

  /**
   * Fully releases external event listeners and disconnects feeds.
   */
  public destroy(): void {
    this.disconnect();

    if (this.visibilityHandler) {
      document.removeEventListener('visibilitychange', this.visibilityHandler);
      this.visibilityHandler = null;
    }

    Logger.info('[Market] Service destroyed');
  }
}
