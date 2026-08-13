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

    const authHeaders = await this.getAuthHeaders();
    if (!authHeaders['Authorization']) {
      // Anonymous / not-yet-signed-in play. Posting anyway is a guaranteed 401
      // on every market tick, so keep the evidence queued until a token exists.
      return {
        ok: false,
        retriable: true,
        error: 'Missing auth token',
      };
    }

    try {
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

      // 5xx and 429 are transient. 401/403 (token not issued yet) and 404
      // (profile row not created yet) resolve themselves once the session
      // finishes syncing, so they are transient too. Only a genuinely rejected
      // payload (400/413/422) is permanent.
      const retriable =
        response.status >= 500 ||
        response.status === 429 ||
        response.status === 401 ||
        response.status === 403 ||
        response.status === 404;
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
