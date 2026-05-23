/**
 * RailwayClient — HTTP client for Railway API
 *
 * Auto-attaches Supabase Auth JWT to all requests.
 * Provides typed GET/POST/PATCH/DELETE helpers.
 */

import { supabase, isSupabaseConfigured } from '../supabase/client';
import { Logger } from '../system/Logger';

const BASE_URL = import.meta.env.VITE_RAILWAY_API_URL as string | undefined;

if (!BASE_URL) {
  Logger.warn('[RailwayClient] VITE_RAILWAY_API_URL not set. API calls will fail.');
}

async function getAuthToken(): Promise<string | null> {
  if (!isSupabaseConfigured()) return null;
  try {
    const { data } = await supabase.auth.getSession();
    return data.session?.access_token ?? null;
  } catch {
    return null;
  }
}

/** Force-refresh the Supabase session and return a fresh access token. */
async function refreshAuthToken(): Promise<string | null> {
  if (!isSupabaseConfigured()) return null;
  try {
    const { data, error } = await supabase.auth.refreshSession();
    if (error || !data.session) return null;
    return data.session.access_token;
  } catch {
    return null;
  }
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
    throw new Error('VITE_RAILWAY_API_URL is not configured');
  }

  const url = `${BASE_URL}${path}`;
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const token = await getAuthToken();
      let res = await doFetch(method, url, token, body);

      // On 401, try refreshing the token once and retry
      if (res.status === 401 && token) {
        const freshToken = await refreshAuthToken();
        if (freshToken && freshToken !== token) {
          res = await doFetch(method, url, freshToken, body);
        }
      }

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
