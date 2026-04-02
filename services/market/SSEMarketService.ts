/**
 * SSEMarketService — Receives market data from Railway server via Server-Sent Events.
 *
 * Replaces direct Binance/Coinbase WebSocket connections on the client.
 * Browser EventSource handles auto-reconnect natively.
 */

import { Logger } from '../system/Logger';
import { type CryptoPair } from '../../types/crypto';

export interface SSEMarketUpdate {
  pair: string;
  price: number;
  volume: number;
  high: number;
  low: number;
  rsi: number;
  rsiState: string;
  atrPercent: number;
  normalizedVolume: number;
  volumePercentile: number;
  whaleTier: number;
  spawnRateMultiplier: number;
  enemyAggroMultiplierLong: number;
  enemyAggroMultiplierShort: number;
  trendStrength: number;
  trendDirection: string;
  timestamp: number;
  /** True when this update was generated locally as a fallback during data gaps */
  isSynthetic?: boolean;
}

export type SSEConnectionState = 'disconnected' | 'connecting' | 'connected';

export interface SSEConnectionStatus {
  state: SSEConnectionState;
  lastDataTime: number | null;
  totalDisconnectDuration: number;
  isUsingFallbackData: boolean;
}

export interface SSEMarketServiceConfig {
  pair: CryptoPair;
  onData: (update: SSEMarketUpdate) => void;
  onStatusChange?: (status: SSEConnectionStatus) => void;
}

const FATAL_DISCONNECT_MS = 30_000;
const DATA_GAP_THRESHOLD_MS = 8_000;

export class SSEMarketService {
  private eventSource: EventSource | null = null;
  private onDataCallback: (update: SSEMarketUpdate) => void;
  private onStatusChange?: (status: SSEConnectionStatus) => void;
  private pair: CryptoPair;
  private state: SSEConnectionState = 'disconnected';
  private lastDataTime: number | null = null;
  private lastKnownPrice: number | null = null;
  private wasClosedIntentionally = false;
  private disconnectStartTime: number | null = null;
  private fatalDisconnectEmitted = false;
  private isUsingFallbackData = false;
  private dataGapCheckInterval: ReturnType<typeof setInterval> | null = null;
  private visibilityHandler: (() => void) | null = null;
  private connectionTimeoutTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(config: SSEMarketServiceConfig) {
    this.pair = config.pair;
    this.onDataCallback = config.onData;
    this.onStatusChange = config.onStatusChange;
  }

  public connect(): void {
    this.wasClosedIntentionally = false;
    this.fatalDisconnectEmitted = false;
    this.disconnectStartTime = null;
    this.isUsingFallbackData = false;
    this.setupVisibilityHandler();
    this.startDataGapMonitor();
    this.createEventSource();
  }

  private createEventSource(): void {
    // Use dedicated aggregator URL if set, otherwise fall back to API URL
    const baseUrl = (import.meta.env.VITE_MARKET_AGGREGATOR_URL ??
      import.meta.env.VITE_RAILWAY_API_URL) as string | undefined;
    if (!baseUrl) {
      Logger.error(
        '[SSE] VITE_MARKET_AGGREGATOR_URL / VITE_RAILWAY_API_URL not configured'
      );
      this.updateState('disconnected');
      return;
    }

    this.updateState('connecting');

    const url = `${baseUrl}/api/v1/market/stream?pair=${this.pair}`;
    this.eventSource = new EventSource(url);

    // Connection timeout: if no data in 30s, mark as failed
    this.connectionTimeoutTimer = setTimeout(() => {
      if (this.state === 'connecting') {
        Logger.warn('[SSE] Connection timeout — no data received in 15s');
        this.eventSource?.close();
        this.updateState('disconnected');
      }
    }, FATAL_DISCONNECT_MS);

    this.eventSource.onopen = () => {
      Logger.info(`[SSE] Connected to market stream for ${this.pair}`);
      this.updateState('connected');
      if (this.connectionTimeoutTimer) {
        clearTimeout(this.connectionTimeoutTimer);
        this.connectionTimeoutTimer = null;
      }
    };

    this.eventSource.onmessage = (event: MessageEvent) => {
      try {
        const data = JSON.parse(event.data as string) as SSEMarketUpdate & {
          type?: string;
        };

        // Skip connection confirmation messages
        if (data.type === 'connected') return;

        // Validate pair
        if (data.pair !== this.pair) return;

        this.lastDataTime = Date.now();
        this.lastKnownPrice = data.price;

        if (this.connectionTimeoutTimer) {
          clearTimeout(this.connectionTimeoutTimer);
          this.connectionTimeoutTimer = null;
        }

        this.onDataCallback(data);
      } catch (err) {
        Logger.warn('[SSE] Failed to parse message', {
          error: err instanceof Error ? err.message : String(err),
        });
      }
    };

    this.eventSource.onerror = () => {
      if (this.wasClosedIntentionally) return;

      Logger.warn('[SSE] Connection error, EventSource will auto-reconnect');
      this.updateState('connecting');
    };
  }

  private startDataGapMonitor(): void {
    if (this.dataGapCheckInterval) {
      clearInterval(this.dataGapCheckInterval);
    }

    this.dataGapCheckInterval = setInterval(() => {
      if (this.wasClosedIntentionally) return;

      const now = Date.now();
      const timeSinceLastData = this.lastDataTime ? now - this.lastDataTime : 0;

      if (timeSinceLastData > DATA_GAP_THRESHOLD_MS) {
        if (!this.disconnectStartTime) {
          this.disconnectStartTime = this.lastDataTime ?? now;
          Logger.warn('[SSE] Data gap detected');
        }

        const totalDisconnect = now - this.disconnectStartTime;

        if (totalDisconnect >= FATAL_DISCONNECT_MS && !this.fatalDisconnectEmitted) {
          this.fatalDisconnectEmitted = true;
          Logger.error(
            `[SSE] FATAL DISCONNECT: No data for ${(totalDisconnect / 1000).toFixed(1)}s`
          );
          this.notifyStatusChange();
          return;
        }

        // Use fallback data and emit synthetic updates
        if (!this.isUsingFallbackData && this.lastKnownPrice !== null) {
          this.isUsingFallbackData = true;
          Logger.info(`[SSE] Using fallback price: ${this.lastKnownPrice}`);
        }

        // Emit synthetic update every 1s so UnifiedDirector keeps receiving data
        if (this.isUsingFallbackData && this.lastKnownPrice !== null) {
          this.emitSyntheticUpdate();
        }
      } else {
        if (this.disconnectStartTime) {
          Logger.info('[SSE] Data recovered');
          this.disconnectStartTime = null;
        }
        this.isUsingFallbackData = false;
        this.fatalDisconnectEmitted = false;
      }
    }, 1000);
  }

  private emitSyntheticUpdate(): void {
    if (this.lastKnownPrice === null) return;

    const syntheticUpdate: SSEMarketUpdate = {
      pair: this.pair,
      price: this.lastKnownPrice,
      volume: 0,
      high: this.lastKnownPrice,
      low: this.lastKnownPrice,
      rsi: 50,
      rsiState: 'NEUTRAL',
      atrPercent: 0,
      normalizedVolume: 0,
      volumePercentile: 0,
      whaleTier: 0,
      spawnRateMultiplier: 1,
      enemyAggroMultiplierLong: 1,
      enemyAggroMultiplierShort: 1,
      trendStrength: 0,
      trendDirection: 'SIDEWAYS',
      timestamp: Date.now(),
      isSynthetic: true,
    };

    this.onDataCallback(syntheticUpdate);
  }

  private setupVisibilityHandler(): void {
    if (this.visibilityHandler) return;

    this.visibilityHandler = () => {
      if (document.hidden) {
        // Keep SSE open — EventSource is lightweight
      } else {
        // If disconnected after tab was hidden, reconnect
        if (this.state === 'disconnected' && !this.wasClosedIntentionally) {
          Logger.info('[SSE] Tab visible, reconnecting');
          this.createEventSource();
        }
      }
    };

    document.addEventListener('visibilitychange', this.visibilityHandler);
  }

  private updateState(newState: SSEConnectionState): void {
    this.state = newState;
    this.notifyStatusChange();
  }

  private notifyStatusChange(): void {
    this.onStatusChange?.({
      state: this.state,
      lastDataTime: this.lastDataTime,
      totalDisconnectDuration: this.getTotalDisconnectDuration(),
      isUsingFallbackData: this.isUsingFallbackData,
    });
  }

  public getTotalDisconnectDuration(): number {
    if (!this.disconnectStartTime) return 0;
    return Date.now() - this.disconnectStartTime;
  }

  public isFatallyDisconnected(): boolean {
    return this.fatalDisconnectEmitted;
  }

  public getLastKnownPrice(): number | null {
    return this.lastKnownPrice;
  }

  public isConnected(): boolean {
    return this.state === 'connected';
  }

  public getStatus(): SSEConnectionStatus {
    return {
      state: this.state,
      lastDataTime: this.lastDataTime,
      totalDisconnectDuration: this.getTotalDisconnectDuration(),
      isUsingFallbackData: this.isUsingFallbackData,
    };
  }

  public disconnect(): void {
    this.wasClosedIntentionally = true;

    if (this.connectionTimeoutTimer) {
      clearTimeout(this.connectionTimeoutTimer);
      this.connectionTimeoutTimer = null;
    }

    if (this.dataGapCheckInterval) {
      clearInterval(this.dataGapCheckInterval);
      this.dataGapCheckInterval = null;
    }

    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
    }

    this.updateState('disconnected');
    Logger.info('[SSE] Disconnected');
  }

  public reconnect(): void {
    Logger.info('[SSE] Force reconnecting...');
    this.disconnect();

    setTimeout(() => {
      this.connect();
    }, 500);
  }

  public destroy(): void {
    this.disconnect();

    if (this.visibilityHandler) {
      document.removeEventListener('visibilitychange', this.visibilityHandler);
      this.visibilityHandler = null;
    }

    Logger.info('[SSE] Service destroyed');
  }
}
