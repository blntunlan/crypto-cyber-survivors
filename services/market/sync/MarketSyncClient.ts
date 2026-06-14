import { type MarketSyncRecord } from './MarketSyncStore';
import { RailwayAuthTokenStore } from '../../api/RailwayAuthTokenStore';

export interface MarketSyncClientResult {
  ok: boolean;
  retriable: boolean;
  statusCode?: number;
  error?: string;
}

export interface MarketSyncClientConfig {
  endpoint?: string;
  apiKey?: string;
}

export class MarketSyncClient {
  private readonly endpoint?: string;
  private readonly apiKey?: string;

  constructor(config: MarketSyncClientConfig = {}) {
    this.endpoint = config.endpoint;
    this.apiKey = config.apiKey;
  }

  private async getAuthHeaders(): Promise<Record<string, string>> {
    if (this.apiKey) {
      return { Authorization: `Bearer ${this.apiKey}` };
    }

    const token = RailwayAuthTokenStore.getAccessToken();
    if (token) {
      return { Authorization: `Bearer ${token}` };
    }

    return {};
  }

  async sendBatch(records: MarketSyncRecord[]): Promise<MarketSyncClientResult> {
    if (records.length === 0) {
      return { ok: true, retriable: false };
    }

    const runId = records[0]?.runId;
    if (runId && records.some(record => record.runId !== runId)) {
      return {
        ok: false,
        retriable: false,
        error: 'Mixed runId batch is not allowed',
      };
    }

    if (!this.endpoint) {
      return {
        ok: false,
        retriable: true,
        error: 'Missing market sync endpoint',
      };
    }

    try {
      const authHeaders = await this.getAuthHeaders();

      const response = await fetch(this.endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...authHeaders,
        },
        body: JSON.stringify({
          runId: runId ?? null,
          count: records.length,
          items: records.map(record => ({
            runId: record.runId,
            seq: record.seq,
            runConstants: record.runConstants,
            tick: record.tick,
            snapshot: record.snapshot,
          })),
        }),
      });

      if (response.ok) {
        return { ok: true, retriable: false, statusCode: response.status };
      }

      // 4xx: usually not retriable. 5xx: retriable.
      const retriable = response.status >= 500 || response.status === 429;
      return {
        ok: false,
        retriable,
        statusCode: response.status,
        error: `HTTP ${response.status}`,
      };
    } catch (error) {
      return {
        ok: false,
        retriable: true,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }
}
