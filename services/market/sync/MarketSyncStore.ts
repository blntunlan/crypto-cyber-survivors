import {
  type MarketRunConstants,
  type MarketRuntimeSnapshot,
  type MarketRuntimeTick,
} from '../../../types/marketRuntime';
import { Logger } from '../../system/Logger';

export type MarketSyncStatus = 'pending' | 'inflight';

export interface MarketSyncRecord {
  id: string;
  runId: string;
  seq: number;
  runConstants: MarketRunConstants;
  tick: MarketRuntimeTick;
  snapshot: MarketRuntimeSnapshot;
  status: MarketSyncStatus;
  retryCount: number;
  nextRetryAt: number;
  createdAt: number;
  updatedAt: number;
}

export interface CreateMarketSyncRecordInput {
  runConstants: MarketRunConstants;
  tick: MarketRuntimeTick;
  snapshot: MarketRuntimeSnapshot;
  createdAt?: number;
}

const STORE_NAME = 'market_sync_queue';
const DB_NAME = 'crypto_survivors_market_sync';
const DB_VERSION = 1;

const buildRecordId = (runId: string, seq: number): string => {
  return `${runId}:${seq}`;
};

export class MarketSyncStore {
  private readonly memory = new Map<string, MarketSyncRecord>();
  private dbPromise: Promise<IDBDatabase | null> | null = null;
  private hydrated = false;

  async enqueue(input: CreateMarketSyncRecordInput): Promise<MarketSyncRecord> {
    const now = input.createdAt ?? Date.now();
    const id = buildRecordId(input.runConstants.runId, input.tick.seq);

    const existing = this.memory.get(id);
    const nextRecord: MarketSyncRecord = {
      id,
      runId: input.runConstants.runId,
      seq: input.tick.seq,
      runConstants: input.runConstants,
      tick: input.tick,
      snapshot: input.snapshot,
      status: existing?.status ?? 'pending',
      retryCount: existing?.retryCount ?? 0,
      nextRetryAt: existing?.nextRetryAt ?? now,
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
    };

    this.memory.set(id, nextRecord);
    await this.putToDb(nextRecord);
    return nextRecord;
  }

  async getFlushableBatch(
    limit: number,
    nowMs: number = Date.now()
  ): Promise<MarketSyncRecord[]> {
    await this.hydrateFromDbIfNeeded();

    return [...this.memory.values()]
      .filter(record => record.status === 'pending' && record.nextRetryAt <= nowMs)
      .sort((a, b) => {
        if (a.createdAt === b.createdAt) return a.seq - b.seq;
        return a.createdAt - b.createdAt;
      })
      .slice(0, limit);
  }

  async requeueInflight(maxAgeMs: number, nowMs: number = Date.now()): Promise<number> {
    await this.hydrateFromDbIfNeeded();

    const recovered: MarketSyncRecord[] = [];
    for (const record of this.memory.values()) {
      if (record.status !== 'inflight') continue;

      const age = nowMs - record.updatedAt;
      if (age < maxAgeMs) continue;

      recovered.push({
        ...record,
        status: 'pending',
        nextRetryAt: nowMs,
        updatedAt: nowMs,
      });
    }

    if (recovered.length === 0) {
      return 0;
    }

    await this.updateRecords(recovered);
    return recovered.length;
  }

  async updateRecords(records: MarketSyncRecord[]): Promise<void> {
    for (const record of records) {
      this.memory.set(record.id, record);
      await this.putToDb(record);
    }
  }

  async acknowledge(ids: string[]): Promise<void> {
    for (const id of ids) {
      this.memory.delete(id);
      await this.deleteFromDb(id);
    }
  }

  async size(): Promise<number> {
    await this.hydrateFromDbIfNeeded();
    return this.memory.size;
  }

  async getStats(): Promise<{
    total: number;
    pending: number;
    inflight: number;
  }> {
    await this.hydrateFromDbIfNeeded();
    let pending = 0;
    let inflight = 0;

    for (const record of this.memory.values()) {
      if (record.status === 'pending') pending++;
      if (record.status === 'inflight') inflight++;
    }

    return {
      total: this.memory.size,
      pending,
      inflight,
    };
  }

  private async hydrateFromDbIfNeeded(): Promise<void> {
    if (this.hydrated) return;
    this.hydrated = true;

    const db = await this.getDb();
    if (!db) return;

    const records = await this.readAllFromDb(db);
    for (const record of records) {
      this.memory.set(record.id, record);
    }
  }

  private async getDb(): Promise<IDBDatabase | null> {
    if (typeof indexedDB === 'undefined') {
      return null;
    }

    if (this.dbPromise) {
      return this.dbPromise;
    }

    this.dbPromise = new Promise(resolve => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        }
      };

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => {
        Logger.warn('[MarketSyncStore] IndexedDB unavailable, using memory-only mode');
        resolve(null);
      };
    });

    return this.dbPromise;
  }

  private readAllFromDb(db: IDBDatabase): Promise<MarketSyncRecord[]> {
    return new Promise(resolve => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const request = store.getAll();

      request.onsuccess = () => {
        resolve(request.result as MarketSyncRecord[]);
      };

      request.onerror = () => {
        resolve([]);
      };
    });
  }

  private async putToDb(record: MarketSyncRecord): Promise<void> {
    const db = await this.getDb();
    if (!db) return;

    await new Promise<void>(resolve => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      tx.objectStore(STORE_NAME).put(record);
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    });
  }

  private async deleteFromDb(id: string): Promise<void> {
    const db = await this.getDb();
    if (!db) return;

    await new Promise<void>(resolve => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      tx.objectStore(STORE_NAME).delete(id);
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    });
  }
}

export const createMarketSyncRecord = (
  input: CreateMarketSyncRecordInput
): MarketSyncRecord => {
  const now = input.createdAt ?? Date.now();

  return {
    id: buildRecordId(input.runConstants.runId, input.tick.seq),
    runId: input.runConstants.runId,
    seq: input.tick.seq,
    runConstants: input.runConstants,
    tick: input.tick,
    snapshot: input.snapshot,
    status: 'pending',
    retryCount: 0,
    nextRetryAt: now,
    createdAt: now,
    updatedAt: now,
  };
};
