import { type CryptoPair } from './crypto';

export type RuntimePosition = 'LONG' | 'SHORT';
export type RuntimeFeedSource =
  | 'binance'
  | 'coinbase'
  | 'sse'
  | 'fallback'
  | 'connecting';
export type RuntimeConnectionState =
  | 'connected'
  | 'degraded'
  | 'disconnected'
  | 'reconnecting';

export interface RuntimeVersionInfo {
  algoVersion: string;
  configVersion: string;
}

// Phase-0 defaults. Later phases can bump these from runtime worker/controller.
export const MARKET_RUNTIME_VERSION: RuntimeVersionInfo = {
  algoVersion: 'runtime-shadow-v0',
  configVersion: 'runtime-config-v1',
};

export interface MarketRunConstants {
  runId: string;
  pair: CryptoPair;
  position: RuntimePosition;
  leverage: number;
  entryPrice: number;
  liquidationPrice: number;
  startedAt: number;
  versions: RuntimeVersionInfo;
}

export interface MarketRuntimeTick {
  runId: string;
  seq: number;
  pair: CryptoPair;
  source: RuntimeFeedSource;
  sourceTs: number;
  recvTs: number;
  price: number;
  volume: number;
  high: number;
  low: number;
  hash: string;
  prevHash: string;
}

export interface MarketRuntimeSnapshot {
  runId: string;
  seq: number;
  pair: CryptoPair;
  createdAt: number;
  price: number;
  volume: number;
  rawPnl: number;
  effectivePnl: number;
  rawPnlBp: number;
  effectivePnlBp: number;
  leverage: number;
  position: RuntimePosition;
  entryPrice: number;
  liquidationPrice: number;
  isLiquidated: boolean;
  rsi: number;
  rsiState: 'OVERSOLD' | 'NEUTRAL' | 'OVERBOUGHT';
  normalizedVolume: number;
  whaleTier: 0 | 1 | 2 | 3;
  atrPercent: number;
  atrBp: number;
  macd: number;
  difficulty: number;
  spawnRateMultiplier: number;
  enemyDamage: number;
  enemySpeed: number;
  gemValueMultiplier: number;
  momentum: number;
  tickHash: string;
  checksum: string;
  algoVersion: string;
  configVersion: string;
}

export interface MarketRuntimeFeedHealth {
  runId: string | null;
  pair: CryptoPair;
  timestamp: number;
  state: RuntimeConnectionState;
  binance: RuntimeConnectionState;
  coinbase: RuntimeConnectionState;
  lastPriceTime: number | null;
  totalDisconnectDuration: number;
  isUsingFallbackData: boolean;
}

export interface MarketRuntimeUpdatePayload {
  runConstants: MarketRunConstants;
  tick: MarketRuntimeTick;
  snapshot: MarketRuntimeSnapshot;
}
