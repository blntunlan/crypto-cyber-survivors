import { Logger } from '../system/Logger';

const apiBaseUrl = (import.meta.env.VITE_API_BASE_URL as string | undefined)?.trim();
const railwayBaseUrl = (
  import.meta.env.VITE_RAILWAY_API_URL as string | undefined
)?.trim();
const configuredBaseUrl =
  apiBaseUrl && apiBaseUrl.length > 0 ? apiBaseUrl : railwayBaseUrl;
const BASE_URL = configuredBaseUrl?.replace(/\/$/, '');
const ADMIN_API_SECRET = (
  import.meta.env.VITE_ADMIN_API_SECRET as string | undefined
)?.trim();

export interface MarketHealth {
  status: 'healthy' | 'stale' | 'no_data';
  last_ping: string | null;
  delay_seconds: number | null;
}

export interface ErrorOccurence {
  error_type: string;
  category: string;
  severity: string;
  status: string;
  occurrences: number;
  first_seen: string;
  last_seen: string;
}

export interface AdminDashboardSummary {
  timestamp: string;
  sessions: {
    total24h: number;
    verified24h: number;
    unverified24h: number;
    verificationRate: number;
    verificationFailRate: number;
    avgSurvivalSeconds: number;
  };
  telemetry: {
    errorReports24h: number;
    criticalErrors24h: number;
    cheatAttempts24h: number;
    performanceMetrics24h: number;
    avgFps24h: number;
    activeDeviceProfiles24h: number;
    crashFreeSessions24h: number;
    crashFreeSessionRate24h: number;
    reconnectEvents24h: number;
    deviceTypeBreakdown: Record<string, number>;
    recommendedProfileBreakdown: Record<string, number>;
  };
  product: {
    productEvents24h: number;
    walletConnects24h: number;
    uniqueWallets24h: number;
    seasonParticipants24h: number;
    questCompletions24h: number;
    leaderboardSubmissions24h: number;
    referralJoins24h: number;
  };
}

class AdminAnalyticsService {
  private static instance?: AdminAnalyticsService;

  static getInstance(): AdminAnalyticsService {
    return (this.instance ??= new AdminAnalyticsService());
  }

  async getMarketHealth(): Promise<MarketHealth | null> {
    try {
      // Market health is now monitored via SSE connection status
      // No direct DB RPC needed
      return null;
    } catch (error) {
      Logger.error('[Analytics] Failed to fetch market health:', error);
      return null;
    }
  }

  async getErrorSummary(): Promise<ErrorOccurence[]> {
    try {
      // Error summary not yet exposed via Railway API
      // TODO: Add GET /api/v1/telemetry/error-summary endpoint
      return [];
    } catch (error) {
      Logger.error('[Analytics] Failed to fetch error summary:', error);
      return [];
    }
  }

  async getDashboardSummary(): Promise<AdminDashboardSummary | null> {
    if (!BASE_URL || !ADMIN_API_SECRET) {
      return null;
    }

    try {
      const response = await fetch(`${BASE_URL}/api/v1/admin/dashboard`, {
        headers: {
          Authorization: `Bearer ${ADMIN_API_SECRET}`,
        },
        signal: AbortSignal.timeout(10_000),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      return (await response.json()) as AdminDashboardSummary;
    } catch (error) {
      Logger.error('[Analytics] Failed to fetch admin dashboard summary:', error);
      return null;
    }
  }

  async resolveError(_errorType: string): Promise<boolean> {
    try {
      // Error resolution not yet exposed via Railway API
      // TODO: Add PATCH /api/v1/telemetry/errors/:errorType endpoint
      return false;
    } catch (error) {
      Logger.error('[Analytics] Failed to resolve error:', error);
      return false;
    }
  }
}

export const adminAnalytics = AdminAnalyticsService.getInstance();
