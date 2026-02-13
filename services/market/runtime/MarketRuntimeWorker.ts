import {
  type MarketRunConstants,
  type MarketRuntimeSnapshot,
  type MarketRuntimeTick,
} from '../../../types/marketRuntime';
import {
  computeRuntimeSnapshot,
  createInitialMarketComputeState,
  type MarketComputeState,
} from './MarketCompute';

export type MarketRuntimeWorkerRequest =
  | { type: 'init'; runConstants: MarketRunConstants }
  | { type: 'tick'; tick: MarketRuntimeTick }
  | { type: 'reset' };

export type MarketRuntimeWorkerResponse =
  | { type: 'ready'; runId: string }
  | { type: 'snapshot'; snapshot: MarketRuntimeSnapshot }
  | { type: 'reset-complete' }
  | { type: 'error'; message: string };

class MarketRuntimeWorkerEngine {
  private runConstants: MarketRunConstants | null = null;
  private state: MarketComputeState = createInitialMarketComputeState();
  private previousSnapshot: MarketRuntimeSnapshot | null = null;

  public handle(message: MarketRuntimeWorkerRequest): MarketRuntimeWorkerResponse {
    switch (message.type) {
      case 'init':
        this.runConstants = message.runConstants;
        this.state = createInitialMarketComputeState();
        this.previousSnapshot = null;
        return { type: 'ready', runId: message.runConstants.runId };
      case 'reset':
        this.runConstants = null;
        this.state = createInitialMarketComputeState();
        this.previousSnapshot = null;
        return { type: 'reset-complete' };
      case 'tick': {
        if (!this.runConstants) {
          return { type: 'error', message: 'Runtime worker not initialized' };
        }

        const result = computeRuntimeSnapshot({
          runConstants: this.runConstants,
          tick: message.tick,
          previousSnapshot: this.previousSnapshot,
          previousState: this.state,
        });

        this.state = result.nextState;
        this.previousSnapshot = result.snapshot;
        return { type: 'snapshot', snapshot: result.snapshot };
      }
      default: {
        const unreachable: never = message;
        return {
          type: 'error',
          message: `Unknown worker message: ${JSON.stringify(unreachable)}`,
        };
      }
    }
  }
}

export const createMarketRuntimeWorkerHandler = (
  emit: (response: MarketRuntimeWorkerResponse) => void
) => {
  const engine = new MarketRuntimeWorkerEngine();

  return (message: MarketRuntimeWorkerRequest) => {
    try {
      emit(engine.handle(message));
    } catch (error) {
      emit({
        type: 'error',
        message: error instanceof Error ? error.message : String(error),
      });
    }
  };
};

const isWorkerContext =
  typeof self !== 'undefined' &&
  typeof (self as DedicatedWorkerGlobalScope).postMessage === 'function' &&
  typeof (self as DedicatedWorkerGlobalScope).addEventListener === 'function';

if (isWorkerContext) {
  const workerScope = self as DedicatedWorkerGlobalScope;
  const handle = createMarketRuntimeWorkerHandler(response => {
    workerScope.postMessage(response);
  });

  workerScope.addEventListener('message', event => {
    handle(event.data as MarketRuntimeWorkerRequest);
  });
}
