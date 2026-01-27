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
      const { supabase } = await import('../core/Supabase');
      if (!supabase) return null;
      const { data, error } = await supabase.rpc('get_market_health_status');

      if (error) throw error;
      return data as MarketHealth;
    } catch (error) {
      Logger.error('[Analytics] Failed to fetch market health:', error);
      return null;
    }
  }

  async getErrorSummary(): Promise<ErrorOccurence[]> {
    try {
      const { supabase } = await import('../core/Supabase');
      if (!supabase) return [];
      const { data, error } = await supabase.from('v_error_summary').select('*');

      if (error) throw error;
      return (data as ErrorOccurence[] | null) ?? [];
    } catch (error) {
      Logger.error('[Analytics] Failed to fetch error summary:', error);
      return [];
    }
  }

  async resolveError(errorType: string): Promise<boolean> {
    try {
      const { supabase } = await import('../core/Supabase');
      if (!supabase) return false;
      const { error } = await supabase
        .from('error_reports')
        .update({ status: 'resolved' })
        .eq('error_type', errorType);

      if (error) throw error;
      return true;
    } catch (error) {
      Logger.error('[Analytics] Failed to resolve error:', error);
      return false;
    }
  }
}

export const adminAnalytics = AdminAnalyticsService.getInstance();
