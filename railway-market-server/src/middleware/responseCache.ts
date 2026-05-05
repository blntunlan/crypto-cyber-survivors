/**
 * HTTP Response Caching Middleware
 *
 * Caches GET responses in-memory keyed by URL + query string.
 * Adds Cache-Control and X-Cache headers so clients and CDNs
 * can participate in caching.
 *
 * Cache is automatically invalidated for any route prefix that
 * receives a mutating request (POST / PUT / PATCH / DELETE).
 */

import { type Request, type Response, type NextFunction } from 'express';
import { Logger } from '../utils/logger';

interface CacheEntry {
  body: unknown;
  statusCode: number;
  /** Absolute expiry timestamp (ms since epoch) */
  expiresAt: number;
  /** ISO timestamp of when the entry was created — used for Last-Modified */
  createdAt: string;
  /** ETag derived from a hash of the serialised body */
  etag: string;
}

// ── In-memory store ──────────────────────────────────────────────────────────

const store = new Map<string, CacheEntry>();

/** Derive a simple ETag from the body string (FNV-1a 32-bit). */
function computeEtag(body: string): string {
  let hash = 0x811c9dc5;
  for (let i = 0; i < body.length; i++) {
    hash ^= body.charCodeAt(i);
    hash = (hash * 0x01000193) >>> 0;
  }
  return `"${hash.toString(16)}"`;
}

/** Remove all entries whose key starts with the given prefix. */
function invalidatePrefix(prefix: string): void {
  let count = 0;
  for (const key of store.keys()) {
    if (key.startsWith(prefix)) {
      store.delete(key);
      count++;
    }
  }
  if (count > 0) {
    Logger.debug(`[Cache] Invalidated ${count} entr${count === 1 ? 'y' : 'ies'} for prefix "${prefix}"`);
  }
}

/** Evict all expired entries (called lazily on each GET). */
function evictExpired(): void {
  const now = Date.now();
  for (const [key, entry] of store.entries()) {
    if (entry.expiresAt <= now) {
      store.delete(key);
    }
  }
}

// ── Public API ───────────────────────────────────────────────────────────────

/**
 * Build a cache key from the request path + sorted query string so that
 * `?pair=BTC&limit=50` and `?limit=50&pair=BTC` resolve to the same entry.
 */
export function buildCacheKey(req: Request): string {
  const params = new URLSearchParams(req.query as Record<string, string>);
  params.sort();
  const qs = params.toString();
  return qs ? `${req.path}?${qs}` : req.path;
}

/**
 * Factory that returns an Express middleware which caches GET responses
 * for `ttlSeconds` seconds.
 *
 * @param ttlSeconds  How long to cache the response (default: 10 s)
 */
export function cacheMiddleware(ttlSeconds = 10) {
  return function responseCacheHandler(
    req: Request,
    res: Response,
    next: NextFunction
  ): void {
    // Only cache GET requests
    if (req.method !== 'GET') {
      next();
      return;
    }

    evictExpired();

    const key = buildCacheKey(req);
    const cached = store.get(key);

    if (cached && cached.expiresAt > Date.now()) {
      // ── Cache HIT ──────────────────────────────────────────────────────────

      // Conditional request: If-None-Match
      const ifNoneMatch = req.headers['if-none-match'];
      if (ifNoneMatch && ifNoneMatch === cached.etag) {
        res.status(304).end();
        return;
      }

      // Conditional request: If-Modified-Since
      const ifModifiedSince = req.headers['if-modified-since'];
      if (ifModifiedSince) {
        const since = new Date(ifModifiedSince).getTime();
        const created = new Date(cached.createdAt).getTime();
        if (!isNaN(since) && created <= since) {
          res.status(304).end();
          return;
        }
      }

      const maxAge = Math.max(0, Math.round((cached.expiresAt - Date.now()) / 1000));
      res
        .set('X-Cache', 'HIT')
        .set('Cache-Control', `public, max-age=${maxAge}`)
        .set('ETag', cached.etag)
        .set('Last-Modified', cached.createdAt)
        .status(cached.statusCode)
        .json(cached.body);
      return;
    }

    // ── Cache MISS — intercept res.json to store the response ─────────────
    res.set('X-Cache', 'MISS');

    const originalJson = res.json.bind(res);
    res.json = function cachedJson(body: unknown): Response {
      // Only cache successful responses
      if (res.statusCode >= 200 && res.statusCode < 300) {
        const serialised = JSON.stringify(body);
        const etag = computeEtag(serialised);
        const createdAt = new Date().toISOString();

        store.set(key, {
          body,
          statusCode: res.statusCode,
          expiresAt: Date.now() + ttlSeconds * 1000,
          createdAt,
          etag,
        });

        res
          .set('Cache-Control', `public, max-age=${ttlSeconds}`)
          .set('ETag', etag)
          .set('Last-Modified', createdAt);
      }
      return originalJson(body);
    };

    next();
  };
}

/**
 * Middleware that invalidates cached GET responses for the current route
 * prefix whenever a mutating method (POST / PUT / PATCH / DELETE) succeeds.
 *
 * Mount this on the same router as the GET handlers you want to invalidate.
 */
export function cacheInvalidator(req: Request, _res: Response, next: NextFunction): void {
  const mutating = ['POST', 'PUT', 'PATCH', 'DELETE'];
  if (mutating.includes(req.method)) {
    // Derive the base path prefix (strip trailing slash)
    const prefix = req.baseUrl || req.path;
    // Invalidate after the response is sent so the write completes first
    _res.on('finish', () => {
      if (_res.statusCode >= 200 && _res.statusCode < 300) {
        invalidatePrefix(prefix);
      }
    });
  }
  next();
}

/**
 * Manually invalidate all cache entries whose key starts with `prefix`.
 * Useful for programmatic invalidation from service code.
 */
export function invalidateCache(prefix: string): void {
  invalidatePrefix(prefix);
}

/** Return current cache size (number of live entries). */
export function getCacheSize(): number {
  evictExpired();
  return store.size;
}
