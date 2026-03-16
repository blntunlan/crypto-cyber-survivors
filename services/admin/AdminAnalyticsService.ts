import { Logger } from '../system/Logger';

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
