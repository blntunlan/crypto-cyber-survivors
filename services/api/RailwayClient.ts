/**
 * RailwayClient — HTTP client for Railway API
 *
 * Auto-attaches Railway-native JWT when present.
 * Provides typed GET/POST/PATCH/DELETE helpers.
 */

import { RailwayAuthTokenStore } from './RailwayAuthTokenStore';

const apiBaseUrl = (import.meta.env.VITE_API_BASE_URL as string | undefined)?.trim();
const railwayBaseUrl = (
  import.meta.env.VITE_RAILWAY_API_URL as string | undefined
)?.trim();
const configuredBaseUrl =
  apiBaseUrl && apiBaseUrl.length > 0 ? apiBaseUrl : railwayBaseUrl;

const BASE_URL = configuredBaseUrl?.replace(/\/$/, '');

if (!BASE_URL) {
  // eslint-disable-next-line no-console
  console.warn(
    '[RailwayClient] VITE_API_BASE_URL / VITE_RAILWAY_API_URL not set. API calls will fail.'
  );
}

export function isRailwayApiConfigured(): boolean {
  return Boolean(BASE_URL);
}

async function getAuthToken(): Promise<string | null> {
  return RailwayAuthTokenStore.getAccessToken();
}

async function doFetch(
  method: string,
  url: string,
  token: string | null,
  body?: unknown
): Promise<Response> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  return fetch(url, {
    method,
    headers,
    body: body != null ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(10_000),
  });
}

const RETRYABLE_STATUSES = new Set([502, 503, 504]);
const MAX_RETRIES = 2;

async function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  if (!BASE_URL) {
    throw new Error('VITE_API_BASE_URL / VITE_RAILWAY_API_URL is not configured');
  }

  const url = `${BASE_URL}${path}`;
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const token = await getAuthToken();
      const res = await doFetch(method, url, token, body);

      // Retry on transient server errors
      if (RETRYABLE_STATUSES.has(res.status) && attempt < MAX_RETRIES) {
        const backoff = Math.min(1000 * 2 ** attempt, 4000);
        await delay(backoff);
        continue;
      }

      if (!res.ok) {
        let errorMsg = `HTTP ${res.status}`;
        try {
          const errorBody = await res.json();
          errorMsg = (errorBody as { error?: string }).error ?? errorMsg;
        } catch {
          // ignore parse error
        }
        throw new Error(errorMsg);
      }

      return (await res.json()) as T;
    } catch (error) {
      lastError = error as Error;
      // Retry on network errors (TypeError from fetch), not on application errors
      if (error instanceof TypeError && attempt < MAX_RETRIES) {
        const backoff = Math.min(1000 * 2 ** attempt, 4000);
        await delay(backoff);
        continue;
      }
      throw error;
    }
  }

  throw lastError ?? new Error('Request failed after retries');
}

export const railwayClient = {
  get<T>(path: string): Promise<T> {
    return request<T>('GET', path);
  },
  post<T>(path: string, body?: unknown): Promise<T> {
    return request<T>('POST', path, body);
  },
  patch<T>(path: string, body?: unknown): Promise<T> {
    return request<T>('PATCH', path, body);
  },
  del<T = void>(path: string): Promise<T> {
    return request<T>('DELETE', path);
  },
};
