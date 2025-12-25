import WebSocket from 'ws';
import { Logger } from '../utils/logger';
import { EventEmitter } from 'events';

export interface KlineData {
  pair: string;
  timestamp: Date;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

interface KlinePayload {
  e: string;
  s: string;
  k: {
    t: number;
    o: string;
    h: string;
    l: string;
    c: string;
    v: string;
    s: string;
  };
}

export class BinanceService extends EventEmitter {
  private static instance: BinanceService;
  private ws: WebSocket | null = null;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private reconnectDelay = 1000;
  private maxReconnectDelay = 30000;
  private isIntentionallyClosed = false;

  private readonly WS_URL = 'wss://stream.binance.com:9443/stream';
  private readonly PAIRS = ['btcusdt', 'ethusdt', 'solusdt'];

  private constructor() {
    super();
  }

  static getInstance(): BinanceService {
    if (!BinanceService.instance) {
      BinanceService.instance = new BinanceService();
    }
    return BinanceService.instance;
  }

  async connect(): Promise<void> {
    if (this.ws?.readyState === WebSocket.OPEN) {
      Logger.warn('Already connected to Binance');
      return;
    }

    return new Promise((resolve, reject) => {
      Logger.info('🔄 Connecting to Binance streams...');
      this.isIntentionallyClosed = false;

      this.ws = new WebSocket(this.WS_URL);

      this.ws.on('open', () => {
        Logger.info('✅ Connected to Binance WebSocket');
        this.reconnectDelay = 1000;
        this.subscribe();
        resolve();
      });

      this.ws.on('message', (data: WebSocket.Data) => {
        try {
          const parsed = JSON.parse(data.toString());

          if (parsed.data?.e === 'kline') {
            const kline = this.parseKlineData(parsed.data as KlinePayload);
            this.emit('kline', kline);
          }
        } catch (error) {
          Logger.error('Failed to parse Binance message:', error);
        }
      });

      this.ws.on('error', error => {
        Logger.error('Binance WebSocket error:', error);
        reject(error);
      });

      this.ws.on('close', () => {
        Logger.warn('Binance WebSocket closed');
        this.ws = null;

        if (!this.isIntentionallyClosed) {
          this.scheduleReconnect();
        }
      });

      this.ws.on('ping', () => {
        this.ws?.pong();
      });
    });
  }

  private subscribe(): void {
    const streams = this.PAIRS.map(pair => `${pair}@kline_1s`);

    const subscribeMessage = {
      method: 'SUBSCRIBE',
      params: streams,
      id: Date.now(),
    };

    this.ws?.send(JSON.stringify(subscribeMessage));
    Logger.info(`Tracking pairs: ${this.PAIRS.join(', ')}`);
  }

  private parseKlineData(data: KlinePayload): KlineData {
    const k = data.k;

    return {
      pair: k.s.replace('USDT', '').toUpperCase(),
      timestamp: new Date(k.t),
      open: parseFloat(k.o),
      high: parseFloat(k.h),
      low: parseFloat(k.l),
      close: parseFloat(k.c),
      volume: parseFloat(k.v),
    };
  }

  private scheduleReconnect(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
    }

    Logger.info(`Reconnecting in ${this.reconnectDelay}ms...`);

    this.reconnectTimer = setTimeout(() => {
      this.connect().catch(error => {
        Logger.error('Reconnect failed:', error);

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

    Logger.info('Disconnected from Binance');
  }

  isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }
}
