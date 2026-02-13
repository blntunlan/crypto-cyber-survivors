import { describe, expect, it } from 'vitest';
import { MarketPosition, type MarketData } from '../../../types';
import { MARKET_RUNTIME_VERSION } from '../../../types/marketRuntime';
import {
  createRunConstants,
  createRuntimeFeedHealth,
  createRuntimeRunId,
  createRuntimeSnapshot,
  createRuntimeTick,
  hashStringFNV1a,
  toRuntimePosition,
} from '../../../services/market/runtime/RuntimeContractBuilder';

describe('RuntimeContractBuilder', () => {
  it('creates deterministic fnv1a hashes', () => {
    expect(hashStringFNV1a('abc')).toBe(hashStringFNV1a('abc'));
    expect(hashStringFNV1a('abc')).not.toBe(hashStringFNV1a('abcd'));
  });

  it('creates stable run id with explicit seed', () => {
    const runId = createRuntimeRunId('BTC', 1_700_000_000_000, 'seed42');
    expect(runId).toBe('BTC-loyw3v28-seed42');
  });

  it('builds runtime tick with hash chain', () => {
    const tick = createRuntimeTick({
      runId: 'run-1',
      seq: 7,
      pair: 'BTC',
      source: 'binance',
      sourceTs: 1000,
      recvTs: 1010,
      price: 42000.123456789,
      volume: 12.987654321,
      high: 42100,
      low: 41900,
      prevHash: 'deadbeef',
    });

    expect(tick.seq).toBe(7);
    expect(tick.price).toBe(42000.12345679);
    expect(tick.volume).toBe(12.98765432);
    expect(tick.prevHash).toBe('deadbeef');
    expect(tick.hash).toHaveLength(8);
  });

  it('builds runtime snapshot with basis points and checksum', () => {
    const runConstants = createRunConstants({
      runId: 'run-1',
      pair: 'BTC',
      position: toRuntimePosition(MarketPosition.LONG),
      leverage: 10,
      entryPrice: 40000,
      liquidationPrice: 36000,
      startedAt: 123,
      versions: MARKET_RUNTIME_VERSION,
    });

    const tick = createRuntimeTick({
      runId: 'run-1',
      seq: 2,
      pair: 'BTC',
      source: 'binance',
      sourceTs: 2000,
      recvTs: 2010,
      price: 42000,
      volume: 10,
      prevHash: 'seed',
    });

    const marketData: MarketData = {
      price: 42000,
      volume: 10,
      pnl: 0.05,
      effectivePnl: 0.5,
      leverage: 10,
      rsi: 55,
      difficulty: 1.4,
      momentum: 0.04,
      atrPercent: 0.0125,
      spawnRateMultiplier: 1.2,
      enemyDamage: 1.1,
      enemySpeed: 1.05,
      gemValueMultiplier: 1.25,
    };

    const snapshot = createRuntimeSnapshot({
      runConstants,
      tick,
      marketData,
      createdAt: 2020,
      macd: 0.0023,
    });

    expect(snapshot.rawPnlBp).toBe(500);
    expect(snapshot.effectivePnlBp).toBe(5000);
    expect(snapshot.atrBp).toBe(125);
    expect(snapshot.isLiquidated).toBe(false);
    expect(snapshot.checksum).toHaveLength(8);
  });

  it('maps feed health states', () => {
    const health = createRuntimeFeedHealth(
      {
        binance: 'connected',
        coinbase: 'disconnected',
        lastPriceTime: 999,
        totalDisconnectDuration: 0,
        isUsingFallbackData: false,
      },
      'BTC',
      'run-1',
      1111
    );

    expect(health.state).toBe('connected');
    expect(health.binance).toBe('connected');
    expect(health.coinbase).toBe('disconnected');
    expect(health.runId).toBe('run-1');
  });
});
