import WebSocket from 'ws';
import { Logger } from '../utils/logger';
import { EventEmitter } from 'events';
import { ErrorReporter } from '../utils/errorReporter';
import { type KlineData } from './binanceService';

interface CoinbaseTicker {
  type: string;
  product_id: string;
  price: string;
  volume_24h: string;
  time: string;
}

export class CoinbaseService extends EventEmitter {
  private static instance: CoinbaseService | null = null;
  private ws: WebSocket | null = null;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private reconnectDelay = 1000;
  private maxReconnectDelay = 30000;
  private isIntentionallyClosed = false;

  private readonly WS_URL = 'wss://ws-feed.exchange.coinbase.com';
  private readonly PAIRS = ['BTC-USD', 'ETH-USD', 'SOL-USD'];

  private constructor() {
    super();
  }

  static getInstance(): CoinbaseService {
    return (CoinbaseService.instance ??= new CoinbaseService());
  }

  async connect(): Promise<void> {
    if (this.ws?.readyState === WebSocket.OPEN) {
      Logger.warn('Already connected to Coinbase');
      return;
    }

    return new Promise((resolve, reject) => {
      Logger.info('🔄 Connecting to Coinbase (Fallback)...');
      this.isIntentionallyClosed = false;

      this.ws = new WebSocket(this.WS_URL);

      this.ws.on('open', () => {
        Logger.info('✅ Connected to Coinbase WebSocket');
        this.reconnectDelay = 1000;
        this.subscribe();
        resolve();
      });

      this.ws.on('message', (data: WebSocket.Data) => {
        try {
          const parsed = JSON.parse(data.toString());

          if (parsed.type === 'ticker') {
            const kline = this.parseTickerData(parsed as CoinbaseTicker);
            this.emit('kline', kline);
          }
        } catch (error) {
          Logger.error('Failed to parse Coinbase message:', error);
          void ErrorReporter.report({
            type: 'CoinbaseParseError',
            message: error instanceof Error ? error.message : String(error),
            severity: 'low',
          });
        }
      });

      this.ws.on('error', error => {
        Logger.error('Coinbase WebSocket error:', error);
        void ErrorReporter.report({
          type: 'CoinbaseWebSocketError',
          message: error.message,
          severity: 'medium',
        });
        reject(error);
      });

      this.ws.on('close', () => {
        Logger.warn('Coinbase WebSocket closed');
        this.ws = null;

        if (!this.isIntentionallyClosed) {
          this.scheduleReconnect();
        }
      });
    });
  }

  private subscribe(): void {
    const subscribeMessage = {
      type: 'subscribe',
      product_ids: this.PAIRS,
      channels: ['ticker'],
    };

    this.ws?.send(JSON.stringify(subscribeMessage));
    Logger.info(`Tracking Coinbase pairs: ${this.PAIRS.join(', ')}`);
  }

  private parseTickerData(data: CoinbaseTicker): KlineData {
    const pair = (data.product_id.split('-')[0] ?? '').toUpperCase();
    const price = parseFloat(data.price);

    return {
      pair,
      timestamp: new Date(data.time),
      open: price,
      high: price,
      low: price,
      close: price,
      volume: 0,
    };
  }

  private scheduleReconnect(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
    }

    Logger.info(`Reconnecting Coinbase in ${this.reconnectDelay}ms...`);

    this.reconnectTimer = setTimeout(() => {
      this.connect().catch(error => {
        Logger.error('Coinbase Reconnect failed:', error);
        this.reconnectDelay = Math.min(this.reconnectDelay * 2, this.maxReconnectDelay);
      });
    }, this.reconnectDelay);
  }

  async disconnect(): Promise<void> {
    this.isIntentionallyClosed = true;

    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }

    Logger.info('Disconnected from Coinbase');
  }

  isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }
}
