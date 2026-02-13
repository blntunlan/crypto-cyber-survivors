import {
  type MarketRunConstants,
  type MarketRuntimeSnapshot,
  type MarketRuntimeTick,
} from '../../../types/marketRuntime';
import {
  type MarketRuntimeWorkerRequest,
  type MarketRuntimeWorkerResponse,
} from './MarketRuntimeWorker';

type WorkerFactory = () => Worker;

export interface MarketRuntimeControllerConfig {
  onSnapshot: (snapshot: MarketRuntimeSnapshot) => void;
  onError?: (message: string) => void;
  onReady?: (runId: string) => void;
  workerFactory?: WorkerFactory;
}

const createDefaultWorker = (): Worker => {
  return new Worker(new URL('./MarketRuntimeWorker.ts', import.meta.url), {
    type: 'module',
  });
};

export class MarketRuntimeController {
  private readonly onSnapshot: (snapshot: MarketRuntimeSnapshot) => void;
  private readonly onError?: (message: string) => void;
  private readonly onReady?: (runId: string) => void;
  private readonly workerFactory: WorkerFactory;
  private worker: Worker | null = null;

  constructor(config: MarketRuntimeControllerConfig) {
    this.onSnapshot = config.onSnapshot;
    this.onError = config.onError;
    this.onReady = config.onReady;
    this.workerFactory = config.workerFactory ?? createDefaultWorker;
  }

  start(runConstants: MarketRunConstants): void {
    if (!this.worker) {
      this.worker = this.workerFactory();
      this.worker.onmessage = event => {
        this.handleWorkerResponse(event.data as MarketRuntimeWorkerResponse);
      };
      this.worker.onerror = event => {
        this.onError?.(event.message || 'Market runtime worker error');
      };
    }

    this.postMessage({ type: 'init', runConstants });
  }

  pushTick(tick: MarketRuntimeTick): void {
    this.postMessage({ type: 'tick', tick });
  }

  reset(): void {
    if (!this.worker) return;
    this.postMessage({ type: 'reset' });
  }

  dispose(): void {
    if (!this.worker) return;
    this.worker.terminate();
    this.worker = null;
  }

  private postMessage(message: MarketRuntimeWorkerRequest): void {
    if (!this.worker) {
      this.onError?.('Market runtime worker is not started');
      return;
    }

    this.worker.postMessage(message);
  }

  private handleWorkerResponse(response: MarketRuntimeWorkerResponse): void {
    if (response.type === 'snapshot') {
      this.onSnapshot(response.snapshot);
      return;
    }

    if (response.type === 'ready') {
      this.onReady?.(response.runId);
      return;
    }

    if (response.type === 'error') {
      this.onError?.(response.message);
    }
  }
}
