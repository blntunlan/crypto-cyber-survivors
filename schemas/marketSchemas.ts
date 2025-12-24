/**
 * Market Data Validation Schemas
 *
 * Uses Zod for runtime validation of WebSocket data.
 * Ensures type safety for external API responses.
 */

import { z } from 'zod';

// ============================================
// Binance WebSocket Schemas
// ============================================

/**
 * Binance 24hr Ticker Stream (SPOT - legacy)
 * wss://stream.binance.com:9443/ws/btcusdt@ticker
 */
export const BinanceTickerSchema = z.object({
  e: z.literal('24hrTicker').optional(), // Event type
  E: z.number().optional(), // Event time
  s: z.string().optional(), // Symbol
  c: z.string(), // Close price (current price)
  h: z.string(), // High price
  l: z.string(), // Low price
  v: z.string(), // Total traded base asset volume
  q: z.string().optional(), // Total traded quote asset volume
});

export type BinanceTickerData = z.infer<typeof BinanceTickerSchema>;

/**
 * Binance Futures Kline (Candlestick) Stream
 * wss://fstream.binance.com/ws/btcusdt@kline_1s
 */
export const BinanceFuturesKlineSchema = z.object({
  e: z.literal('kline'), // Event type
  E: z.number(), // Event time
  s: z.string(), // Symbol
  k: z.object({
    t: z.number(), // Kline start time
    T: z.number(), // Kline close time
    s: z.string(), // Symbol
    i: z.string(), // Interval
    o: z.string(), // Open price
    c: z.string(), // Close price
    h: z.string(), // High price
    l: z.string(), // Low price
    v: z.string(), // Base asset volume
    n: z.number(), // Number of trades
    x: z.boolean(), // Is this kline closed?
    q: z.string(), // Quote asset volume
  }),
});

export type BinanceFuturesKlineData = z.infer<typeof BinanceFuturesKlineSchema>;

// ============================================
// Coinbase WebSocket Schema
// ============================================

/**
 * Coinbase Ticker Channel
 * wss://ws-feed.exchange.coinbase.com
 */
export const CoinbaseTickerSchema = z.object({
  type: z.literal('ticker'),
  product_id: z.string(),
  price: z.string(),
  time: z.string().optional(),
  trade_id: z.number().optional(),
  last_size: z.string().optional(),
  best_bid: z.string().optional(),
  best_ask: z.string().optional(),
  side: z.enum(['buy', 'sell']).optional(),
});

export type CoinbaseTickerData = z.infer<typeof CoinbaseTickerSchema>;

// Coinbase subscription responses
export const CoinbaseSubscriptionSchema = z.object({
  type: z.enum(['subscriptions', 'error']),
  channels: z
    .array(
      z.object({
        name: z.string(),
        product_ids: z.array(z.string()),
      })
    )
    .optional(),
  message: z.string().optional(),
});

// ============================================
// Normalized Market Update
// ============================================

export const MarketUpdateSchema = z.object({
  price: z.number().positive(),
  high: z.number().positive().optional(),
  low: z.number().positive().optional(),
  volume: z.number().nonnegative().optional(),
  source: z.enum(['binance', 'coinbase']),
  timestamp: z.number().optional(),
});

export type MarketUpdate = z.infer<typeof MarketUpdateSchema>;

// ============================================
// Validation Helpers
// ============================================

/**
 * Parse and validate Binance data (Futures kline or legacy ticker)
 */
export function parseBinanceData(data: unknown): MarketUpdate | null {
  // Try Futures kline format first (primary)
  const klineResult = BinanceFuturesKlineSchema.safeParse(data);

  if (klineResult.success) {
    const { k } = klineResult.data;
    return {
      price: parseFloat(k.c), // Close price
      high: parseFloat(k.h),
      low: parseFloat(k.l),
      volume: parseFloat(k.v),
      source: 'binance',
      timestamp: Date.now(),
    };
  }

  // Fallback to legacy Spot ticker format
  const tickerResult = BinanceTickerSchema.safeParse(data);

  if (tickerResult.success) {
    const { c, h, l, v } = tickerResult.data;
    return {
      price: parseFloat(c),
      high: parseFloat(h),
      low: parseFloat(l),
      volume: parseFloat(v),
      source: 'binance',
      timestamp: Date.now(),
    };
  }

  return null;
}

/**
 * Parse and validate Coinbase ticker data
 */
export function parseCoinbaseData(data: unknown): MarketUpdate | null {
  const result = CoinbaseTickerSchema.safeParse(data);

  if (!result.success) {
    return null;
  }

  return {
    price: parseFloat(result.data.price),
    source: 'coinbase',
    timestamp: Date.now(),
  };
}

/**
 * Check if data is a Coinbase subscription response (not ticker data)
 */
export function isCoinbaseSubscription(data: unknown): boolean {
  const result = CoinbaseSubscriptionSchema.safeParse(data);
  return result.success;
}

// ============================================
// Config Schemas
// ============================================

export const MetricsConfigSchema = z.object({
  enabled: z.boolean(),
  showDebugPanel: z.boolean(),
  collection: z.object({
    sampleIntervalMs: z.number().positive(),
    maxSamplesPerSession: z.number().positive(),
    trackBitcoin: z.boolean(),
    trackDifficulty: z.boolean(),
    trackPlayer: z.boolean(),
    trackCombos: z.boolean(),
    trackCards: z.boolean(),
    trackEnemies: z.boolean(),
  }),
  storage: z.object({
    type: z.enum(['local', 'remote']),
    maxLocalSessions: z.number().positive(),
    remoteEndpoint: z.string().optional(),
    apiKey: z.string().optional(),
  }),
});

export type MetricsConfigType = z.infer<typeof MetricsConfigSchema>;

// ============================================
// Game State Schemas (for save/load)
// ============================================

export const SavedGameStateSchema = z.object({
  version: z.string(),
  timestamp: z.number(),
  player: z.object({
    level: z.number().int().nonnegative(),
    exp: z.number().nonnegative(),
    hp: z.number(),
    maxHp: z.number().positive(),
  }),
  stats: z.object({
    kills: z.number().int().nonnegative(),
    survivalTime: z.number().nonnegative(),
    cardsChosen: z.array(z.string()),
  }),
});

export type SavedGameState = z.infer<typeof SavedGameStateSchema>;
