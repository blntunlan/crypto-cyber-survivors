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
    return data?.session?.access_token ?? null;
  } catch {
    return null;
  }
}

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  if (!BASE_URL) {
    throw new Error('VITE_RAILWAY_API_URL is not configured');
  }

  const url = `${BASE_URL}${path}`;
  const token = await getAuthToken();

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(url, {
    method,
    headers,
    body: body != null ? JSON.stringify(body) : undefined,
  });

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
