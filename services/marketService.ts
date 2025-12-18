/**
 * MarketService - Real-time Bitcoin Price WebSocket Client
 *
 * Connects to Binance and Coinbase WebSocket feeds for live BTC/USD prices.
 * Features:
 * - Dual-source price feeds for redundancy
 * - Exponential backoff reconnection
 * - Connection state tracking
 * - Automatic failover
 */

import { BINANCE_WS_URL, COINBASE_WS_URL } from '../constants';
import { Logger } from './Logger';

export interface MarketUpdate {
  price: number;
  high?: number;
  low?: number;
  source: 'binance' | 'coinbase';
  volume?: number;
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

export class MarketService {
  private binanceSocket: WebSocket | null = null;
  private coinbaseSocket: WebSocket | null = null;
  private onDataCallback: (update: MarketUpdate) => void;
  private wasClosedIntentionally: boolean = false;

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

  constructor(
    onData: (update: MarketUpdate) => void,
    onStatusChange?: (status: ConnectionStatus) => void
  ) {
    this.onDataCallback = onData;
    this.onStatusChange = onStatusChange;
  }

  /**
   * Connect to all price feeds
   */
  connect(): void {
    this.wasClosedIntentionally = false;
    this.connectBinance();
    this.connectCoinbase();
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
      Logger.debug('[Market] Connecting to Binance...');

      this.binanceSocket = new WebSocket(BINANCE_WS_URL);

      this.binanceSocket.onopen = () => {
        Logger.info('[Market] Binance connected');
        this.updateState('binance', 'connected');
        this.binanceReconnectDelay = INITIAL_RECONNECT_DELAY; // Reset backoff
      };

      this.binanceSocket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          // Ticker stream format: { c: close, h: high, l: low, v: volume, ... }
          if (data?.c) {
            const price = parseFloat(data.c);
            this.lastKnownPrice = price;
            this.lastPriceTime = Date.now();

            this.onDataCallback({
              price,
              high: parseFloat(data.h),
              low: parseFloat(data.l),
              volume: parseFloat(data.v),
              source: 'binance',
            });
          }
        } catch {
          Logger.warn('[Market] Failed to parse Binance message');
        }
      };

      this.binanceSocket.onclose = () => {
        if (!this.wasClosedIntentionally) {
          this.updateState('binance', 'reconnecting');
          this.scheduleReconnect('binance');
        } else {
          this.updateState('binance', 'disconnected');
        }
      };

      this.binanceSocket.onerror = (error) => {
        Logger.warn('[Market] Binance WebSocket error', error);
      };
    } catch (e) {
      Logger.error('[Market] Binance connection failed', e);
      this.updateState('binance', 'disconnected');
      this.scheduleReconnect('binance');
    }
  }

  private connectCoinbase(): void {
    if (this.wasClosedIntentionally) return;

    try {
      this.updateState('coinbase', 'connecting');
      Logger.debug('[Market] Connecting to Coinbase...');

      this.coinbaseSocket = new WebSocket(COINBASE_WS_URL);

      this.coinbaseSocket.onopen = () => {
        Logger.info('[Market] Coinbase connected');
        this.coinbaseSocket?.send(
          JSON.stringify({
            type: 'subscribe',
            product_ids: ['BTC-USD'],
            channels: ['ticker'],
          })
        );
        this.updateState('coinbase', 'connected');
        this.coinbaseReconnectDelay = INITIAL_RECONNECT_DELAY; // Reset backoff
      };

      this.coinbaseSocket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data?.type === 'ticker' && data.price) {
            const price = parseFloat(data.price);
            this.lastKnownPrice = price;
            this.lastPriceTime = Date.now();

            this.onDataCallback({
              price,
              source: 'coinbase',
            });
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

      this.coinbaseSocket.onerror = (error) => {
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
}
