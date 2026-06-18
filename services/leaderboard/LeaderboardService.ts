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
import { type AuthProvider } from '../auth/RailwayAuthService';

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
// Mock Data (shown when API returns empty / no real players yet)
// ============================================================================

const MOCK_LEADERBOARD_ENTRIES: Omit<LeaderboardEntry, 'rank' | 'isCurrentPlayer'>[] = [
  {
    profileId: 'mock-001',
    displayName: 'SatoshiSlayer',
    avatarUrl: null,
    authProvider: 'twitter',
    highScore: 127_450,
    maxSurvivalTime: 842,
    totalKills: 14_380,
    totalSessions: 67,
  },
  {
    profileId: 'mock-002',
    displayName: 'CryptoVixen',
    avatarUrl: null,
    authProvider: 'discord',
    highScore: 98_200,
    maxSurvivalTime: 726,
    totalKills: 11_250,
    totalSessions: 53,
  },
  {
    profileId: 'mock-003',
    displayName: 'DiamondHands42',
    avatarUrl: null,
    authProvider: 'google',
    highScore: 81_750,
    maxSurvivalTime: 695,
    totalKills: 9_870,
    totalSessions: 41,
  },
  {
    profileId: 'mock-004',
    displayName: 'HODLKing',
    avatarUrl: null,
    authProvider: 'twitter',
    highScore: 64_300,
    maxSurvivalTime: 618,
    totalKills: 7_640,
    totalSessions: 38,
  },
  {
    profileId: 'mock-005',
    displayName: 'BearTrap_',
    avatarUrl: null,
    authProvider: 'github',
    highScore: 51_820,
    maxSurvivalTime: 573,
    totalKills: 6_210,
    totalSessions: 29,
  },
  {
    profileId: 'mock-006',
    displayName: 'LiquidatorX',
    avatarUrl: null,
    authProvider: 'discord',
    highScore: 39_950,
    maxSurvivalTime: 504,
    totalKills: 5_480,
    totalSessions: 24,
  },
  {
    profileId: 'mock-007',
    displayName: 'MoonWalker',
    avatarUrl: null,
    authProvider: 'nickname',
    highScore: 28_600,
    maxSurvivalTime: 441,
    totalKills: 4_120,
    totalSessions: 19,
  },
  {
    profileId: 'mock-008',
    displayName: 'WhaleAlert',
    avatarUrl: null,
    authProvider: 'google',
    highScore: 19_400,
    maxSurvivalTime: 382,
    totalKills: 3_350,
    totalSessions: 15,
  },
  {
    profileId: 'mock-009',
    displayName: 'degen_alpha',
    avatarUrl: null,
    authProvider: 'twitter',
    highScore: 12_150,
    maxSurvivalTime: 310,
    totalKills: 2_280,
    totalSessions: 11,
  },
  {
    profileId: 'mock-010',
    displayName: 'Ngmi_Anon',
    avatarUrl: null,
    authProvider: 'nickname',
    highScore: 8_320,
    maxSurvivalTime: 247,
    totalKills: 1_590,
    totalSessions: 8,
  },
];

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

      // If no real entries exist yet, show mock data so the board looks alive
      if (entries.length === 0) {
        Logger.info('[LeaderboardService] API returned empty, using mock data');
        return this.getMockLeaderboard(sort);
      }

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

      // Fall back to mock data so visitors always see a populated board
      Logger.info('[LeaderboardService] Returning mock leaderboard data');
      return this.getMockLeaderboard(sort);
    }
  }

  /**
   * Build a mock leaderboard response from static seed data.
   * Entries are sorted by the requested field so all tabs look correct.
   */
  private getMockLeaderboard(sort: LeaderboardSortField): LeaderboardResponse {
    const sortKeyMap: Record<
      LeaderboardSortField,
      keyof Omit<
        LeaderboardEntry,
        | 'rank'
        | 'isCurrentPlayer'
        | 'profileId'
        | 'displayName'
        | 'avatarUrl'
        | 'authProvider'
      >
    > = {
      high_score: 'highScore',
      max_survival_time: 'maxSurvivalTime',
      total_kills: 'totalKills',
      total_sessions: 'totalSessions',
    };

    const key = sortKeyMap[sort];

    const sorted = [...MOCK_LEADERBOARD_ENTRIES].sort(
      (a, b) => (b[key] as number) - (a[key] as number)
    );

    const entries: LeaderboardEntry[] = sorted.map((entry, index) => ({
      ...entry,
      rank: index + 1,
      isCurrentPlayer: false,
    }));

    return {
      entries,
      sortedBy: sort,
      lastUpdated: new Date(),
    };
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
