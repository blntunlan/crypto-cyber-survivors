/**
 * LeaderboardService - Singleton service for fetching and caching leaderboard data.
 *
 * Fetches aggregated per-player leaderboard entries from the Railway API.
 * Supports sorting by high_score, max_survival_time, total_kills, total_sessions.
 * Implements TTL-based caching (30s) to avoid unnecessary network requests.
 */

import { Logger } from '../system/Logger';
import { railwayClient } from '../api/RailwayClient';
import { UserSessionService } from '../auth/UserSessionService';
import { type AuthProvider } from '../auth/SupabaseAuthService';

// ============================================================================
// Types
// ============================================================================

export type LeaderboardSortField =
  | 'high_score'
  | 'max_survival_time'
  | 'total_kills'
  | 'total_sessions';

export interface LeaderboardEntry {
  rank: number;
  profileId: string;
  displayName: string;
  avatarUrl: string | null;
  authProvider: AuthProvider | 'email' | 'nickname' | null;
  highScore: number;
  maxSurvivalTime: number;
  totalKills: number;
  totalSessions: number;
  isCurrentPlayer: boolean;
}

export interface LeaderboardResponse {
  entries: LeaderboardEntry[];
  sortedBy: LeaderboardSortField;
  lastUpdated: Date;
}

interface LeaderboardApiResponse {
  data?: RawLeaderboardRow[];
  entries?: RawLeaderboardRow[];
}

interface RawLeaderboardRow {
  profile_id: string | null;
  display_name: string | null;
  avatar_url?: string | null;
  primary_auth_provider?: string | null;
  high_score: number | null;
  max_survival_time: number | null;
  total_kills: number | null;
  total_sessions: number | null;
}

// ============================================================================
// Service
// ============================================================================

const CACHE_TTL_MS = 30_000; // 30 seconds

class LeaderboardServiceClass {
  private static instance: LeaderboardServiceClass | null = null;
  private cache = new Map<string, { data: LeaderboardResponse; timestamp: number }>();

  static getInstance(): LeaderboardServiceClass {
    return (this.instance ??= new LeaderboardServiceClass());
  }

  /**
   * Fetch the leaderboard from the Railway API.
   * Returns cached data if it's still fresh (within TTL).
   */
  async getLeaderboard(
    sort: LeaderboardSortField = 'high_score',
    limit = 50
  ): Promise<LeaderboardResponse> {
    const cacheKey = `${sort}:${limit}`;
    const cached = this.cache.get(cacheKey);

    if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
      Logger.debug('[LeaderboardService] Serving from cache', { sort, limit });
      return cached.data;
    }

    try {
      const response = await railwayClient.get<LeaderboardApiResponse>(
        `/api/v1/leaderboard?limit=${limit}&sort=${sort}`
      );

      const currentProfileId = UserSessionService.getProfileId();
      const currentNickname = UserSessionService.getNickname();
      const rows = response.data ?? response.entries ?? [];

      const entries: LeaderboardEntry[] = rows
        .map((row, index) => {
          const name = (row.display_name ?? 'Anonymous').trim();
          const isCurrentPlayer =
            row.profile_id === currentProfileId ||
            (currentNickname != null && name === currentNickname);

          return {
            rank: index + 1,
            profileId: row.profile_id ?? `entry-${index}`,
            displayName: name,
            avatarUrl: row.avatar_url ?? null,
            authProvider: (row.primary_auth_provider ?? null) as
              | AuthProvider
              | 'email'
              | 'nickname'
              | null,
            highScore: row.high_score ?? 0,
            maxSurvivalTime: row.max_survival_time ?? 0,
            totalKills: row.total_kills ?? 0,
            totalSessions: row.total_sessions ?? 0,
            isCurrentPlayer,
          };
        })
        .filter(e => e.displayName !== '');

      const result: LeaderboardResponse = {
        entries,
        sortedBy: sort,
        lastUpdated: new Date(),
      };

      this.cache.set(cacheKey, { data: result, timestamp: Date.now() });
      Logger.debug('[LeaderboardService] Fetched', { sort, count: entries.length });

      return result;
    } catch (err) {
      Logger.error('[LeaderboardService] Fetch failed', err);

      // Return stale cache if available
      if (cached) {
        Logger.warn('[LeaderboardService] Returning stale cache after error');
        return cached.data;
      }

      return {
        entries: [],
        sortedBy: sort,
        lastUpdated: new Date(),
      };
    }
  }

  /** Invalidate the cache so the next fetch goes to the network. */
  invalidateCache(): void {
    this.cache.clear();
  }

  /** Reset singleton (for tests). */
  static reset(): void {
    this.instance = null;
  }
}

export const LeaderboardService = LeaderboardServiceClass.getInstance();
