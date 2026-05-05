/**
 * Service-Level Cache
 *
 * A typed, TTL-based in-memory cache for frequently read data.
 * Designed to sit in front of database queries so hot paths
 * (market state, leaderboard, user stats) avoid redundant round-trips.
 *
 * TTL defaults:
 *   market state   →  5 s  (near-real-time price data)
 *   user stats     → 30 s  (profile / meta progression)
 *   leaderboard    → 60 s  (ranking tables)
 */

import { Logger } from '../utils/logger';

interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

// ── Generic TTL store ────────────────────────────────────────────────────────

class TtlCache<T> {
  private readonly store = new Map<string, CacheEntry<T>>();
  private readonly name: string;
  private hits = 0;
  private misses = 0;

  constructor(name: string) {
    this.name = name;
  }

  get(key: string): T | undefined {
    const entry = this.store.get(key);
    if (!entry) {
      this.misses++;
      return undefined;
    }
    if (entry.expiresAt <= Date.now()) {
      this.store.delete(key);
      this.misses++;
      return undefined;
    }
    this.hits++;
    return entry.value;
  }

  set(key: string, value: T, ttlMs: number): void {
    this.store.set(key, { value, expiresAt: Date.now() + ttlMs });
  }

  delete(key: string): void {
    this.store.delete(key);
  }

  /** Remove all entries whose key starts with `prefix`. */
  invalidatePrefix(prefix: string): void {
    let count = 0;
    for (const k of this.store.keys()) {
      if (k.startsWith(prefix)) {
        this.store.delete(k);
        count++;
      }
    }
    if (count > 0) {
      Logger.debug(`[CacheService:${this.name}] Invalidated ${count} key(s) for prefix "${prefix}"`);
    }
  }

  clear(): void {
    this.store.clear();
  }

  /** Evict all expired entries. */
  evict(): void {
    const now = Date.now();
    for (const [k, entry] of this.store.entries()) {
      if (entry.expiresAt <= now) this.store.delete(k);
    }
  }

  get size(): number {
    this.evict();
    return this.store.size;
  }

  metrics() {
    return {
      name: this.name,
      size: this.size,
      hits: this.hits,
      misses: this.misses,
      hitRate: this.hits + this.misses > 0
        ? Math.round((this.hits / (this.hits + this.misses)) * 100)
        : 0,
    };
  }
}

// ── TTL constants (ms) ───────────────────────────────────────────────────────

export const TTL = {
  MARKET_STATE:  5_000,   //  5 s — live price data
  USER_STATS:   30_000,   // 30 s — profile / meta progression
  LEADERBOARD:  60_000,   // 60 s — ranking tables
  CHALLENGES:   30_000,   // 30 s — daily/weekly challenge definitions
} as const;

// ── Typed cache instances ────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const marketCache    = new TtlCache<any>('market');
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const userCache      = new TtlCache<any>('user');
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const leaderboardCache = new TtlCache<any>('leaderboard');
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const challengeCache = new TtlCache<any>('challenge');

// ── Market state ─────────────────────────────────────────────────────────────

export const MarketCache = {
  get<T>(key: string): T | undefined {
    return marketCache.get(key) as T | undefined;
  },
  set<T>(key: string, value: T): void {
    marketCache.set(key, value, TTL.MARKET_STATE);
  },
  invalidate(key: string): void {
    marketCache.delete(key);
  },
  invalidateAll(): void {
    marketCache.clear();
  },
};

// ── User / profile stats ─────────────────────────────────────────────────────

export const UserCache = {
  get<T>(key: string): T | undefined {
    return userCache.get(key) as T | undefined;
  },
  set<T>(key: string, value: T): void {
    userCache.set(key, value, TTL.USER_STATS);
  },
  invalidate(key: string): void {
    userCache.delete(key);
  },
  /** Invalidate all cache entries for a given profileId. */
  invalidateProfile(profileId: string): void {
    userCache.invalidatePrefix(profileId);
  },
};

// ── Leaderboard ──────────────────────────────────────────────────────────────

export const LeaderboardCache = {
  get<T>(key: string): T | undefined {
    return leaderboardCache.get(key) as T | undefined;
  },
  set<T>(key: string, value: T): void {
    leaderboardCache.set(key, value, TTL.LEADERBOARD);
  },
  invalidate(key: string): void {
    leaderboardCache.delete(key);
  },
  invalidateAll(): void {
    leaderboardCache.clear();
  },
};

// ── Challenges ───────────────────────────────────────────────────────────────

export const ChallengeCache = {
  get<T>(key: string): T | undefined {
    return challengeCache.get(key) as T | undefined;
  },
  set<T>(key: string, value: T): void {
    challengeCache.set(key, value, TTL.CHALLENGES);
  },
  invalidate(key: string): void {
    challengeCache.delete(key);
  },
};

// ── Aggregate metrics ────────────────────────────────────────────────────────

/**
 * Return hit/miss metrics for all cache instances.
 * Exposed via /debug endpoint for production monitoring.
 */
export function getCacheMetrics() {
  return {
    market:      marketCache.metrics(),
    user:        userCache.metrics(),
    leaderboard: leaderboardCache.metrics(),
    challenge:   challengeCache.metrics(),
  };
}

/**
 * Evict expired entries from all caches.
 * Called periodically by the cleanup cron or on demand.
 */
export function evictAllExpired(): void {
  marketCache.evict();
  userCache.evict();
  leaderboardCache.evict();
  challengeCache.evict();
}
