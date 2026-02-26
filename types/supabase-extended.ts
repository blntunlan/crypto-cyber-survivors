import { type Database } from './supabase';

export type ExtendedDatabase = Database & {
  public: {
    Tables: Database['public']['Tables'];
    Enums: Database['public']['Enums'];
    CompositeTypes: Database['public']['CompositeTypes'];
    Views: Database['public']['Views'] & {
      v_analytics_sessions: {
        Row: {
          date: string;
          total_sessions: number;
          avg_survival_seconds: number;
          avg_max_level: number;
          avg_fps: number;
        };
      };
      v_analytics_top_errors: {
        Row: {
          error_type: string;
          error_message: string;
          occurrence_count: number;
          affected_players: number;
          last_seen: string;
        };
      };
      v_analytics_performance_by_device: {
        Row: {
          device_type: string;
          optimization_profile: string;
          session_count: number;
          avg_fps: number;
          avg_survival_seconds: number;
        };
      };
      v_error_summary: {
        Row: {
          error_type: string;
          category: string;
          severity: string;
          status: string;
          occurrences: number;
          first_seen: string;
          last_seen: string;
        };
      };
    };
    Functions: Database['public']['Functions'] & {
      get_dashboard_summary: {
        Args: Record<string, never>;
        Returns: {
          total_players: number;
          active_players_24h: number;
          active_players_7d: number;
          total_sessions: number;
          sessions_today: number;
          avg_session_time_seconds: number;
          total_errors_24h: number;
          error_rate: number;
        }[];
      };
      get_market_health_status: {
        Args: Record<string, never>;
        Returns: {
          status: 'healthy' | 'stale' | 'no_data';
          last_ping: string | null;
          delay_seconds: number | null;
        };
      };
    };
  };
};
