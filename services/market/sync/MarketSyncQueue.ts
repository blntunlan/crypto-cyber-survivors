import { Logger } from '../../system/Logger';
import { MarketSyncClient } from './MarketSyncClient';
import {
  MarketSyncStore,
  createMarketSyncRecord,
  type CreateMarketSyncRecordInput,
  type MarketSyncRecord,
} from './MarketSyncStore';

interface MarketSyncQueueConfig {
  batchSize: number;
  maxBackoffMs: number;
  baseBackoffMs: number;
  flushIntervalMs: number;
  inflightRecoveryMs: number;
  maxFlushAllBatches: number;
}

const DEFAULT_QUEUE_CONFIG: MarketSyncQueueConfig = {
  batchSize: 100,
  maxBackoffMs: 60_000,
  baseBackoffMs: 1_000,
  flushIntervalMs: 5_000,
  inflightRecoveryMs: 30_000,
  maxFlushAllBatches: 200,
};

type FlushReason = 'in_progress' | 'empty' | 'success' | 'retry_scheduled';

interface MarketSyncFlushResult {
  reason: FlushReason;
  processed: number;
  acked: number;
  retried: number;
  runId: string | null;
}

interface MarketSyncFlushAllResult {
  batches: number;
  acked: number;
  retried: number;
  remaining: number;
}

const wait = (ms: number): Promise<void> => {
  return new Promise(resolve => {
    setTimeout(resolve, ms);
  });
};

const resolveSyncEndpoint = (): string | undefined => {
  const endpoint = import.meta.env.VITE_MARKET_SYNC_ENDPOINT;
  if (typeof endpoint === 'string' && endpoint.length > 0) {
    return endpoint;
  }

  const apiBaseUrl = import.meta.env.VITE_API_BASE_URL;
  const railwayApiUrl = import.meta.env.VITE_RAILWAY_API_URL;
  const configuredBaseUrl =
    typeof apiBaseUrl === 'string' && apiBaseUrl.length > 0
      ? apiBaseUrl
      : railwayApiUrl;

  if (typeof configuredBaseUrl === 'string' && configuredBaseUrl.length > 0) {
    return `${configuredBaseUrl.replace(/\/$/, '')}/api/v1/market/runtime-batch`;
  }

  return undefined;
};

export class MarketSyncQueue {
  private readonly store: MarketSyncStore;
  private readonly client: MarketSyncClient;
  private readonly config: MarketSyncQueueConfig;
  private flushInProgress = false;
  private autoFlushTimer: ReturnType<typeof setInterval> | null = null;

  constructor(
    store = new MarketSyncStore(),
    client = new MarketSyncClient({ endpoint: resolveSyncEndpoint() }),
    config: Partial<MarketSyncQueueConfig> = {}
  ) {
    this.store = store;
    this.client = client;
    this.config = { ...DEFAULT_QUEUE_CONFIG, ...config };
  }

  async enqueue(input: CreateMarketSyncRecordInput): Promise<void> {
    await this.store.enqueue(input);
    this.startAutoFlush();
    void this.flush();
  }

  async flush(): Promise<MarketSyncFlushResult> {
    if (this.flushInProgress) {
      return {
        reason: 'in_progress',
        processed: 0,
        acked: 0,
        retried: 0,
        runId: null,
      };
    }

    this.flushInProgress = true;

    try {
      const recovered = await this.store.requeueInflight(
        this.config.inflightRecoveryMs
      );
      if (recovered > 0) {
        Logger.warn('[MarketSyncQueue] Recovered stale inflight records', {
          recovered,
        });
      }

      const batch = await this.store.getFlushableBatch(this.config.batchSize);
      if (batch.length === 0) {
        return {
          reason: 'empty',
          processed: 0,
          acked: 0,
          retried: 0,
          runId: null,
        };
      }

      const runId = batch[0]?.runId ?? null;
      const scopedBatch =
        runId === null ? batch : batch.filter(record => record.runId === runId);

      const inflight = scopedBatch.map(record => ({
        ...record,
        status: 'inflight' as const,
        updatedAt: Date.now(),
      }));
      await this.store.updateRecords(inflight);

      const result = await this.client.sendBatch(inflight);
      if (result.ok) {
        await this.store.acknowledge(inflight.map(record => record.id));
        return {
          reason: 'success',
          processed: inflight.length,
          acked: inflight.length,
          retried: 0,
          runId,
        };
      }

      const retriable = result.retriable;
      if (!retriable) {
        Logger.error('[MarketSyncQueue] Non-retriable sync failure', undefined, {
          error: result.error,
          statusCode: result.statusCode,
        });
      }

      const now = Date.now();
      const retryRecords = inflight.map(record =>
        this.prepareRetry(record, now, retriable)
      );
      await this.store.updateRecords(retryRecords);
      return {
        reason: 'retry_scheduled',
        processed: inflight.length,
        acked: 0,
        retried: retryRecords.length,
        runId,
      };
    } finally {
      this.flushInProgress = false;
    }
  }

  async flushAll(
    maxBatches = this.config.maxFlushAllBatches
  ): Promise<MarketSyncFlushAllResult> {
    let batches = 0;
    let acked = 0;
    let retried = 0;
    let inProgressSpins = 0;

    while (batches < maxBatches) {
      const result = await this.flush();
      if (result.reason === 'in_progress') {
        inProgressSpins += 1;
        if (inProgressSpins > 20) {
          break;
        }
        await wait(25);
        continue;
      }

      inProgressSpins = 0;
      if (result.reason === 'empty') {
        break;
      }

      batches += 1;
      acked += result.acked;
      retried += result.retried;

      if (result.reason === 'retry_scheduled') {
        break;
      }
    }

    const stats = await this.store.getStats();
    return {
      batches,
      acked,
      retried,
      remaining: stats.pending + stats.inflight,
    };
  }

  async getStats(): Promise<{
    total: number;
    pending: number;
    inflight: number;
  }> {
    return this.store.getStats();
  }

  stopAutoFlush(): void {
    if (!this.autoFlushTimer) return;
    clearInterval(this.autoFlushTimer);
    this.autoFlushTimer = null;
  }

  private startAutoFlush(): void {
    if (this.autoFlushTimer) return;

    this.autoFlushTimer = setInterval(() => {
      void this.flush();
    }, this.config.flushIntervalMs);
  }

  private prepareRetry(
    record: MarketSyncRecord,
    now: number,
    retriable: boolean
  ): MarketSyncRecord {
    if (!retriable) {
      // Keep record for audit/debug, but push retry far in future.
      return {
        ...record,
        status: 'pending',
        retryCount: record.retryCount + 1,
        nextRetryAt: now + this.config.maxBackoffMs,
        updatedAt: now,
      };
    }

    const retryCount = record.retryCount + 1;
    const backoff = Math.min(
      this.config.baseBackoffMs * 2 ** (retryCount - 1),
      this.config.maxBackoffMs
    );

    return {
      ...record,
      status: 'pending',
      retryCount,
      nextRetryAt: now + backoff,
      updatedAt: now,
    };
  }
}

let singletonQueue: MarketSyncQueue | null = null;

export const getMarketSyncQueue = (): MarketSyncQueue => {
  singletonQueue ??= new MarketSyncQueue();
  return singletonQueue;
};

export const createQueueRecordInput = (
  input: CreateMarketSyncRecordInput
): CreateMarketSyncRecordInput => {
  const record = createMarketSyncRecord(input);
  return {
    runConstants: record.runConstants,
    tick: record.tick,
    snapshot: record.snapshot,
    createdAt: record.createdAt,
  };
};
