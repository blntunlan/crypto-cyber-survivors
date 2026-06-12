import { MarketPosition, type MarketData } from '../../../types';
import { type CryptoPair } from '../../../types/crypto';
import {
  type MarketRunConstants,
  type MarketRuntimeTick,
  type MarketRuntimeSnapshot,
  type RuntimePosition,
  type MarketRuntimeFeedHealth,
  type RuntimeConnectionState,
  type RuntimeFeedSource,
  type RuntimeVersionInfo,
} from '../../../types/marketRuntime';
import { type ConnectionState, type ConnectionStatus } from '../MarketService';

const DEFAULT_RANDOM_SUFFIX = 'runtime';

const normalizeFloat = (value: number, decimals: number): number => {
  return Number(value.toFixed(decimals));
};

const toBasisPoints = (value: number): number => {
  return Math.round(value * 10_000);
};

const normalizeRuntimeSource = (
  source: MarketRuntimeTick['source'] | ConnectionStatus['binance']
): RuntimeFeedSource => {
  return source === 'connected' ||
    source === 'disconnected' ||
    source === 'reconnecting'
    ? 'fallback'
    : source;
};

export const hashStringFNV1a = (input: string): string => {
  let hash = 0x811c9dc5;

  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }

  return (hash >>> 0).toString(16).padStart(8, '0');
};

export const createRuntimeRunId = (
  pair: CryptoPair,
  nowMs: number = Date.now(),
  randomSuffix: string = DEFAULT_RANDOM_SUFFIX
): string => {
  const timePart = nowMs.toString(36);
  const safeSuffix = randomSuffix.replace(/[^a-zA-Z0-9]/g, '').slice(0, 10) || 'seed';
  return `${pair}-${timePart}-${safeSuffix}`;
};

export const toRuntimePosition = (position: MarketPosition): RuntimePosition => {
  return position === MarketPosition.SHORT ? 'SHORT' : 'LONG';
};

const isLiquidated = (
  price: number,
  liquidationPrice: number,
  position: RuntimePosition
): boolean => {
  if (liquidationPrice <= 0 || price <= 0) return false;
  return position === 'LONG' ? price <= liquidationPrice : price >= liquidationPrice;
};

export interface CreateTickInput {
  runId: string;
  seq: number;
  pair: CryptoPair;
  source: RuntimeFeedSource;
  sourceTs: number;
  recvTs: number;
  price: number;
  volume?: number;
  high?: number;
  low?: number;
  prevHash: string;
}

export const createRuntimeTick = (input: CreateTickInput): MarketRuntimeTick => {
  const price = normalizeFloat(input.price, 8);
  const volume = normalizeFloat(input.volume ?? 0, 8);
  const high = normalizeFloat(input.high ?? input.price, 8);
  const low = normalizeFloat(input.low ?? input.price, 8);

  const hashPayload = [
    input.runId,
    input.seq,
    input.pair,
    normalizeRuntimeSource(input.source),
    input.sourceTs,
    input.recvTs,
    price,
    volume,
    high,
    low,
    input.prevHash,
  ].join('|');

  return {
    runId: input.runId,
    seq: input.seq,
    pair: input.pair,
    source: input.source,
    sourceTs: input.sourceTs,
    recvTs: input.recvTs,
    price,
    volume,
    high,
    low,
    prevHash: input.prevHash,
    hash: hashStringFNV1a(hashPayload),
  };
};

export interface CreateSnapshotInput {
  runConstants: MarketRunConstants;
  tick: MarketRuntimeTick;
  marketData: MarketData;
  createdAt: number;
  macd?: number;
}

export const createRuntimeSnapshot = (
  input: CreateSnapshotInput
): MarketRuntimeSnapshot => {
  const { runConstants, tick, marketData, createdAt } = input;
  const rawPnl = normalizeFloat(marketData.pnl, 8);
  const effectivePnl = normalizeFloat(marketData.effectivePnl, 8);
  const atrPercent = normalizeFloat(marketData.atrPercent ?? 0, 8);
  const rsiState =
    marketData.rsiState === 'OVERSOLD' ||
    marketData.rsiState === 'OVERBOUGHT' ||
    marketData.rsiState === 'NEUTRAL'
      ? marketData.rsiState
      : 'NEUTRAL';
  const normalizedVolume = normalizeFloat(marketData.normalizedVolume ?? 0.5, 8);
  const whaleTier =
    marketData.whaleTier === 1 ||
    marketData.whaleTier === 2 ||
    marketData.whaleTier === 3
      ? marketData.whaleTier
      : 0;

  const snapshotCore = {
    runId: runConstants.runId,
    seq: tick.seq,
    pair: runConstants.pair,
    createdAt,
    price: normalizeFloat(marketData.price, 8),
    volume: normalizeFloat(marketData.volume, 8),
    rawPnl,
    effectivePnl,
    rawPnlBp: toBasisPoints(rawPnl),
    effectivePnlBp: toBasisPoints(effectivePnl),
    leverage: runConstants.leverage,
    position: runConstants.position,
    entryPrice: runConstants.entryPrice,
    liquidationPrice: runConstants.liquidationPrice,
    isLiquidated: isLiquidated(
      marketData.price,
      runConstants.liquidationPrice,
      runConstants.position
    ),
    rsi: normalizeFloat(marketData.rsi, 4),
    rsiState,
    normalizedVolume,
    whaleTier,
    atrPercent,
    atrBp: toBasisPoints(atrPercent),
    macd: normalizeFloat(input.macd ?? 0, 8),
    difficulty: normalizeFloat(marketData.difficulty, 8),
    spawnRateMultiplier: normalizeFloat(marketData.spawnRateMultiplier ?? 1, 8),
    enemyDamage: normalizeFloat(marketData.enemyDamage ?? 1, 8),
    enemySpeed: normalizeFloat(marketData.enemySpeed ?? 1, 8),
    gemValueMultiplier: normalizeFloat(marketData.gemValueMultiplier ?? 1, 8),
    momentum: normalizeFloat(marketData.momentum, 8),
    tickHash: tick.hash,
    algoVersion: runConstants.versions.algoVersion,
    configVersion: runConstants.versions.configVersion,
  };

  const checksum = hashStringFNV1a(
    [
      snapshotCore.runId,
      snapshotCore.seq,
      snapshotCore.price,
      snapshotCore.rawPnlBp,
      snapshotCore.effectivePnlBp,
      snapshotCore.rsi,
      snapshotCore.rsiState,
      snapshotCore.normalizedVolume,
      snapshotCore.whaleTier,
      snapshotCore.atrBp,
      snapshotCore.difficulty,
      snapshotCore.spawnRateMultiplier,
      snapshotCore.enemyDamage,
      snapshotCore.enemySpeed,
      snapshotCore.gemValueMultiplier,
      snapshotCore.tickHash,
      snapshotCore.algoVersion,
      snapshotCore.configVersion,
    ].join('|')
  );

  return {
    ...snapshotCore,
    checksum,
  };
};

export interface CreateRunConstantsInput {
  runId: string;
  pair: CryptoPair;
  position: RuntimePosition;
  leverage: number;
  entryPrice: number;
  liquidationPrice: number;
  startedAt: number;
  versions: RuntimeVersionInfo;
}

export const createRunConstants = (
  input: CreateRunConstantsInput
): MarketRunConstants => {
  return {
    runId: input.runId,
    pair: input.pair,
    position: input.position,
    leverage: input.leverage,
    entryPrice: normalizeFloat(input.entryPrice, 8),
    liquidationPrice: normalizeFloat(input.liquidationPrice, 8),
    startedAt: input.startedAt,
    versions: input.versions,
  };
};

const mapSourceState = (state: ConnectionState): RuntimeConnectionState => {
  if (state === 'connected') return 'connected';
  if (state === 'reconnecting' || state === 'connecting') return 'reconnecting';
  return 'disconnected';
};

const deriveAggregateState = (
  binance: RuntimeConnectionState,
  coinbase: RuntimeConnectionState,
  status: ConnectionStatus
): RuntimeConnectionState => {
  if (status.isUsingFallbackData || status.totalDisconnectDuration > 0) {
    return 'degraded';
  }

  if (binance === 'connected' || coinbase === 'connected') {
    return 'connected';
  }

  if (binance === 'reconnecting' || coinbase === 'reconnecting') {
    return 'reconnecting';
  }

  return 'disconnected';
};

export const createRuntimeFeedHealth = (
  status: ConnectionStatus,
  pair: CryptoPair,
  runId: string | null,
  timestamp: number = Date.now()
): MarketRuntimeFeedHealth => {
  const binance = mapSourceState(status.binance);
  const coinbase = mapSourceState(status.coinbase);

  return {
    runId,
    pair,
    timestamp,
    state: deriveAggregateState(binance, coinbase, status),
    binance,
    coinbase,
    lastPriceTime: status.lastPriceTime,
    totalDisconnectDuration: status.totalDisconnectDuration,
    isUsingFallbackData: status.isUsingFallbackData,
  };
};
