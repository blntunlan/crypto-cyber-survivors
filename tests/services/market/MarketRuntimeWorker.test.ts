import { describe, expect, it } from 'vitest';
import { MARKET_RUNTIME_VERSION } from '../../../types/marketRuntime';
import {
  createMarketRuntimeWorkerHandler,
  type MarketRuntimeWorkerResponse,
} from '../../../services/market/runtime/MarketRuntimeWorker';
import {
  createRunConstants,
  createRuntimeTick,
} from '../../../services/market/runtime/RuntimeContractBuilder';

describe('MarketRuntimeWorker', () => {
  it('returns error when tick arrives before init', () => {
    const responses: MarketRuntimeWorkerResponse[] = [];
    const handler = createMarketRuntimeWorkerHandler(response => {
      responses.push(response);
    });

    const tick = createRuntimeTick({
      runId: 'run-1',
      seq: 1,
      pair: 'BTC',
      source: 'binance',
      sourceTs: 1,
      recvTs: 1,
      price: 100,
      prevHash: 'seed0000',
    });

    handler({ type: 'tick', tick });

    expect(responses[0]?.type).toBe('error');
  });

  it('initializes and computes snapshot', () => {
    const responses: MarketRuntimeWorkerResponse[] = [];
    const handler = createMarketRuntimeWorkerHandler(response => {
      responses.push(response);
    });

    const runConstants = createRunConstants({
      runId: 'run-2',
      pair: 'BTC',
      position: 'LONG',
      leverage: 10,
      entryPrice: 100,
      liquidationPrice: 90,
      startedAt: 1,
      versions: MARKET_RUNTIME_VERSION,
    });

    handler({ type: 'init', runConstants });

    const tick = createRuntimeTick({
      runId: 'run-2',
      seq: 1,
      pair: 'BTC',
      source: 'binance',
      sourceTs: 100,
      recvTs: 100,
      price: 101,
      volume: 2,
      prevHash: 'seed0000',
    });
    handler({ type: 'tick', tick });

    expect(responses[0]).toEqual({ type: 'ready', runId: 'run-2' });
    expect(responses[1]?.type).toBe('snapshot');
    if (responses[1]?.type === 'snapshot') {
      expect(responses[1].snapshot.seq).toBe(1);
      expect(responses[1].snapshot.runId).toBe('run-2');
    }
  });
});
