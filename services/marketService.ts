import { BINANCE_WS_URL, COINBASE_WS_URL } from '../constants';

export interface MarketUpdate {
  price: number;
  high?: number;
  low?: number;
  source: 'binance' | 'coinbase';
  volume?: number;
}

export class MarketService {
  private binanceSocket: WebSocket | null = null;
  private coinbaseSocket: WebSocket | null = null;
  private onDataCallback: (update: MarketUpdate) => void;
  private wasClosedIntentionally: boolean = false;

  constructor(onData: (update: MarketUpdate) => void) {
    this.onDataCallback = onData;
  }

  connect() {
    this.wasClosedIntentionally = false;
    this.connectBinance();
    this.connectCoinbase();
  }

  private connectBinance() {
    try {
      this.binanceSocket = new WebSocket(BINANCE_WS_URL);
      this.binanceSocket.onmessage = event => {
        const data = JSON.parse(event.data);
        // Ticker stream format: { c: close, h: high, l: low, v: volume, ... }
        if (data?.c) {
          this.onDataCallback({
            price: parseFloat(data.c), // Current price (close)
            high: parseFloat(data.h), // 24h high
            low: parseFloat(data.l), // 24h low
            volume: parseFloat(data.v), // 24h volume
            source: 'binance',
          });
        }
      };
      this.binanceSocket.onclose = () => {
        if (!this.wasClosedIntentionally) setTimeout(() => this.connectBinance(), 2000);
      };
      this.binanceSocket.onerror = error => {
        console.warn('Binance WebSocket error:', error);
      };
    } catch (e) {
      console.error('Binance connection failed', e);
    }
  }

  private connectCoinbase() {
    try {
      this.coinbaseSocket = new WebSocket(COINBASE_WS_URL);
      this.coinbaseSocket.onopen = () => {
        this.coinbaseSocket?.send(
          JSON.stringify({
            type: 'subscribe',
            product_ids: ['BTC-USD'],
            channels: ['ticker'],
          })
        );
      };
      this.coinbaseSocket.onmessage = event => {
        const data = JSON.parse(event.data);
        if (data?.type === 'ticker' && data.price) {
          this.onDataCallback({
            price: parseFloat(data.price),
            source: 'coinbase',
          });
        }
      };
      this.coinbaseSocket.onclose = () => {
        if (!this.wasClosedIntentionally) setTimeout(() => this.connectCoinbase(), 2000);
      };
      this.coinbaseSocket.onerror = error => {
        console.warn('Coinbase WebSocket error:', error);
      };
    } catch (e) {
      console.error('Coinbase connection failed', e);
    }
  }

  disconnect() {
    this.wasClosedIntentionally = true;
    this.binanceSocket?.close();
    this.coinbaseSocket?.close();
  }
}
