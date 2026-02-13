import { describe, expect, it, vi } from 'vitest';
import { MARKET_RUNTIME_VERSION } from '../../../types/marketRuntime';
import { MarketRuntimeController } from '../../../services/market/runtime/MarketRuntimeController';
import {
  createRunConstants,
  createRuntimeTick,
} from '../../../services/market/runtime/RuntimeContractBuilder';

class MockWorker {
  public onmessage: ((event: MessageEvent) => void) | null = null;
  public onerror: ((event: ErrorEvent) => void) | null = null;
  public messages: unknown[] = [];

  postMessage(message: unknown): void {
    this.messages.push(message);
  }

  terminate(): void {
    // noop
  }
}

describe('MarketRuntimeController', () => {
  it('starts worker and sends init', () => {
    const mockWorker = new MockWorker();
    const onSnapshot = vi.fn();
    const onReady = vi.fn();
    const onError = vi.fn();

    const controller = new MarketRuntimeController({
      onSnapshot,
      onReady,
      onError,
      workerFactory: () => mockWorker as unknown as Worker,
    });

    const runConstants = createRunConstants({
      runId: 'run-ctrl',
      pair: 'BTC',
      position: 'LONG',
      leverage: 10,
      entryPrice: 100,
      liquidationPrice: 90,
      startedAt: 1,
      versions: MARKET_RUNTIME_VERSION,
    });

    controller.start(runConstants);
    expect(mockWorker.messages[0]).toEqual({ type: 'init', runConstants });

    mockWorker.onmessage?.({
      data: { type: 'ready', runId: 'run-ctrl' },
    } as MessageEvent);
    expect(onReady).toHaveBeenCalledWith('run-ctrl');
  });

  it('forwards snapshots and tick messages', () => {
    const mockWorker = new MockWorker();
    const onSnapshot = vi.fn();

    const controller = new MarketRuntimeController({
      onSnapshot,
      workerFactory: () => mockWorker as unknown as Worker,
    });

    const runConstants = createRunConstants({
      runId: 'run-ctrl-2',
      pair: 'BTC',
      position: 'LONG',
      leverage: 5,
      entryPrice: 100,
      liquidationPrice: 80,
      startedAt: 1,
      versions: MARKET_RUNTIME_VERSION,
    });
    controller.start(runConstants);

    const tick = createRuntimeTick({
      runId: 'run-ctrl-2',
      seq: 1,
      pair: 'BTC',
      source: 'binance',
      sourceTs: 10,
      recvTs: 10,
      price: 102,
      prevHash: 'seed0000',
    });
    controller.pushTick(tick);
    expect(mockWorker.messages[1]).toEqual({ type: 'tick', tick });

    mockWorker.onmessage?.({
      data: {
        type: 'snapshot',
        snapshot: {
          runId: 'run-ctrl-2',
          seq: 1,
        },
      },
    } as MessageEvent);
    expect(onSnapshot).toHaveBeenCalledWith({ runId: 'run-ctrl-2', seq: 1 });
  });
});
