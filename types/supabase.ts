export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: '14.1';
  };
  public: {
    Tables: {
      achievements: {
        Row: {
          category: string;
          condition_type: string;
          condition_value: number;
          created_at: string | null;
          description: string | null;
          icon_key: string | null;
          id: string;
          is_active: boolean | null;
          name: string;
          reward_gold: number | null;
        };
        Insert: {
          category: string;
          condition_type: string;
          condition_value: number;
          created_at?: string | null;
          description?: string | null;
          icon_key?: string | null;
          id?: string;
          is_active?: boolean | null;
          name: string;
          reward_gold?: number | null;
        };
        Update: {
          category?: string;
          condition_type?: string;
          condition_value?: number;
          created_at?: string | null;
          description?: string | null;
          icon_key?: string | null;
          id?: string;
          is_active?: boolean | null;
          name?: string;
          reward_gold?: number | null;
        };
        Relationships: [];
      };
      device_profiles: {
        Row: {
          benchmark_score: number | null;
          browser: string | null;
          created_at: string | null;
          device_memory: number | null;
          device_type: string | null;
          fingerprint: string;
          first_seen_at: string | null;
          hardware_concurrency: number | null;
          last_seen_at: string | null;
          recommended_profile: string | null;
          screen_height: number | null;
          screen_width: number | null;
        };
        Insert: {
          benchmark_score?: number | null;
          browser?: string | null;
          created_at?: string | null;
          device_memory?: number | null;
          device_type?: string | null;
          fingerprint: string;
          first_seen_at?: string | null;
          hardware_concurrency?: number | null;
          last_seen_at?: string | null;
          recommended_profile?: string | null;
          screen_height?: number | null;
          screen_width?: number | null;
        };
        Update: {
          benchmark_score?: number | null;
          browser?: string | null;
          created_at?: string | null;
          device_memory?: number | null;
          device_type?: string | null;
          fingerprint?: string;
          first_seen_at?: string | null;
          hardware_concurrency?: number | null;
          last_seen_at?: string | null;
          recommended_profile?: string | null;
          screen_height?: number | null;
          screen_width?: number | null;
        };
        Relationships: [];
      };
      error_reports: {
        Row: {
          browser_info: string | null;
          category: string | null;
          context_data: Json | null;
          created_at: string | null;
          device_fingerprint: string | null;
          device_info: Json | null;
          error_type: string;
          fingerprint: string | null;
          id: string;
          message: string;
          page_url: string | null;
          profile_id: string | null;
          session_id: string | null;
          severity: string | null;
          stack_trace: string | null;
          status: string | null;
        };
        Insert: {
          browser_info?: string | null;
          category?: string | null;
          context_data?: Json | null;
          created_at?: string | null;
          device_fingerprint?: string | null;
          device_info?: Json | null;
          error_type: string;
          fingerprint?: string | null;
          id?: string;
          message: string;
          page_url?: string | null;
          profile_id?: string | null;
          session_id?: string | null;
          severity?: string | null;
          stack_trace?: string | null;
          status?: string | null;
        };
        Update: {
          browser_info?: string | null;
          category?: string | null;
          context_data?: Json | null;
          created_at?: string | null;
          device_fingerprint?: string | null;
          device_info?: Json | null;
          error_type?: string;
          fingerprint?: string | null;
          id?: string;
          message?: string;
          page_url?: string | null;
          profile_id?: string | null;
          session_id?: string | null;
          severity?: string | null;
          stack_trace?: string | null;
          status?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'error_reports_profile_id_fkey';
            columns: ['profile_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'error_reports_profile_id_fkey';
            columns: ['profile_id'];
            isOneToOne: false;
            referencedRelation: 'v_leaderboard';
            referencedColumns: ['profile_id'];
          },
        ];
      };
      identities: {
        Row: {
          created_at: string | null;
          id: string;
          identity_data: Json | null;
          last_login_at: string | null;
          profile_id: string | null;
          provider: string;
          provider_id: string;
        };
        Insert: {
          created_at?: string | null;
          id?: string;
          identity_data?: Json | null;
          last_login_at?: string | null;
          profile_id?: string | null;
          provider: string;
          provider_id: string;
        };
        Update: {
          created_at?: string | null;
          id?: string;
          identity_data?: Json | null;
          last_login_at?: string | null;
          profile_id?: string | null;
          provider?: string;
          provider_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'identities_profile_id_fkey';
            columns: ['profile_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'identities_profile_id_fkey';
            columns: ['profile_id'];
            isOneToOne: false;
            referencedRelation: 'v_leaderboard';
            referencedColumns: ['profile_id'];
          },
        ];
      };
      ledger: {
        Row: {
          amount: number;
          balance_after: number;
          created_at: string | null;
          currency: string | null;
          id: string;
          metadata: Json | null;
          profile_id: string | null;
          reference_id: string | null;
          transaction_type: string;
        };
        Insert: {
          amount: number;
          balance_after: number;
          created_at?: string | null;
          currency?: string | null;
          id?: string;
          metadata?: Json | null;
          profile_id?: string | null;
          reference_id?: string | null;
          transaction_type: string;
        };
        Update: {
          amount?: number;
          balance_after?: number;
          created_at?: string | null;
          currency?: string | null;
          id?: string;
          metadata?: Json | null;
          profile_id?: string | null;
          reference_id?: string | null;
          transaction_type?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'ledger_profile_id_fkey';
            columns: ['profile_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'ledger_profile_id_fkey';
            columns: ['profile_id'];
            isOneToOne: false;
            referencedRelation: 'v_leaderboard';
            referencedColumns: ['profile_id'];
          },
        ];
      };
      market_state: {
        Row: {
          atr: number | null;
          atr_percent: number | null;
          enemy_aggro_multiplier_long: number | null;
          enemy_aggro_multiplier_short: number | null;
          high: number | null;
          low: number | null;
          normalized_volume: number | null;
          pair: string;
          price: number;
          rsi: number | null;
          rsi_state: string | null;
          spawn_rate_multiplier: number | null;
          updated_at: string | null;
          volume: number | null;
          volume_history_count: number | null;
          volume_history_max: number | null;
          volume_history_min: number | null;
          volume_mean: number | null;
          volume_percentile: number | null;
          volume_std_dev: number | null;
          volume_z_score: number | null;
          whale_tier: number | null;
        };
        Insert: {
          atr?: number | null;
          atr_percent?: number | null;
          enemy_aggro_multiplier_long?: number | null;
          enemy_aggro_multiplier_short?: number | null;
          high?: number | null;
          low?: number | null;
          normalized_volume?: number | null;
          pair: string;
          price: number;
          rsi?: number | null;
          rsi_state?: string | null;
          spawn_rate_multiplier?: number | null;
          updated_at?: string | null;
          volume?: number | null;
          volume_history_count?: number | null;
          volume_history_max?: number | null;
          volume_history_min?: number | null;
          volume_mean?: number | null;
          volume_percentile?: number | null;
          volume_std_dev?: number | null;
          volume_z_score?: number | null;
          whale_tier?: number | null;
        };
        Update: {
          atr?: number | null;
          atr_percent?: number | null;
          enemy_aggro_multiplier_long?: number | null;
          enemy_aggro_multiplier_short?: number | null;
          high?: number | null;
          low?: number | null;
          normalized_volume?: number | null;
          pair?: string;
          price?: number;
          rsi?: number | null;
          rsi_state?: string | null;
          spawn_rate_multiplier?: number | null;
          updated_at?: string | null;
          volume?: number | null;
          volume_history_count?: number | null;
          volume_history_max?: number | null;
          volume_history_min?: number | null;
          volume_mean?: number | null;
          volume_percentile?: number | null;
          volume_std_dev?: number | null;
          volume_z_score?: number | null;
          whale_tier?: number | null;
        };
        Relationships: [];
      };
      performance_metrics: {
        Row: {
          avg_fps: number | null;
          cpu_cores: number | null;
          created_at: string | null;
          device_model: string | null;
          device_platform: string;
          frame_drops: number | null;
          gpu_info: string | null;
          id: string;
          max_fps: number | null;
          memory_gb: number | null;
          metadata: Json | null;
          min_fps: number | null;
          os_info: string | null;
          profile_id: string | null;
          resolution: string | null;
          session_id: string | null;
        };
        Insert: {
          avg_fps?: number | null;
          cpu_cores?: number | null;
          created_at?: string | null;
          device_model?: string | null;
          device_platform: string;
          frame_drops?: number | null;
          gpu_info?: string | null;
          id?: string;
          max_fps?: number | null;
          memory_gb?: number | null;
          metadata?: Json | null;
          min_fps?: number | null;
          os_info?: string | null;
          profile_id?: string | null;
          resolution?: string | null;
          session_id?: string | null;
        };
        Update: {
          avg_fps?: number | null;
          cpu_cores?: number | null;
          created_at?: string | null;
          device_model?: string | null;
          device_platform?: string;
          frame_drops?: number | null;
          gpu_info?: string | null;
          id?: string;
          max_fps?: number | null;
          memory_gb?: number | null;
          metadata?: Json | null;
          min_fps?: number | null;
          os_info?: string | null;
          profile_id?: string | null;
          resolution?: string | null;
          session_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'performance_metrics_profile_id_fkey';
            columns: ['profile_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'performance_metrics_profile_id_fkey';
            columns: ['profile_id'];
            isOneToOne: false;
            referencedRelation: 'v_leaderboard';
            referencedColumns: ['profile_id'];
          },
        ];
      };
      price_history: {
        Row: {
          id: number;
          metadata: Json | null;
          pair: string;
          price: number;
          timestamp: string;
          volume: number | null;
        };
        Insert: {
          id?: number;
          metadata?: Json | null;
          pair: string;
          price: number;
          timestamp: string;
          volume?: number | null;
        };
        Update: {
          id?: number;
          metadata?: Json | null;
          pair?: string;
          price?: number;
          timestamp?: string;
          volume?: number | null;
        };
        Relationships: [];
      };
      price_logs: {
        Row: {
          id: number;
          metadata: Json | null;
          pair: string;
          price: number;
          timestamp: string | null;
          volume: number | null;
        };
        Insert: {
          id?: number;
          metadata?: Json | null;
          pair: string;
          price: number;
          timestamp?: string | null;
          volume?: number | null;
        };
        Update: {
          id?: number;
          metadata?: Json | null;
          pair?: string;
          price?: number;
          timestamp?: string | null;
          volume?: number | null;
        };
        Relationships: [];
      };
      profile_achievements: {
        Row: {
          achievement_id: string | null;
          id: string;
          profile_id: string | null;
          unlocked_at: string | null;
        };
        Insert: {
          achievement_id?: string | null;
          id?: string;
          profile_id?: string | null;
          unlocked_at?: string | null;
        };
        Update: {
          achievement_id?: string | null;
          id?: string;
          profile_id?: string | null;
          unlocked_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'player_achievements_profile_id_fkey';
            columns: ['profile_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'player_achievements_profile_id_fkey';
            columns: ['profile_id'];
            isOneToOne: false;
            referencedRelation: 'v_leaderboard';
            referencedColumns: ['profile_id'];
          },
          {
            foreignKeyName: 'profile_achievements_achievement_id_fkey';
            columns: ['achievement_id'];
            isOneToOne: false;
            referencedRelation: 'achievements';
            referencedColumns: ['id'];
          },
        ];
      };
      profile_inventory: {
        Row: {
          id: string;
          item_id: string | null;
          profile_id: string | null;
          purchase_count: number | null;
          purchased_at: string | null;
          updated_at: string | null;
        };
        Insert: {
          id?: string;
          item_id?: string | null;
          profile_id?: string | null;
          purchase_count?: number | null;
          purchased_at?: string | null;
          updated_at?: string | null;
        };
        Update: {
          id?: string;
          item_id?: string | null;
          profile_id?: string | null;
          purchase_count?: number | null;
          purchased_at?: string | null;
          updated_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'player_inventory_profile_id_fkey';
            columns: ['profile_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'player_inventory_profile_id_fkey';
            columns: ['profile_id'];
            isOneToOne: false;
            referencedRelation: 'v_leaderboard';
            referencedColumns: ['profile_id'];
          },
          {
            foreignKeyName: 'profile_inventory_item_id_fkey';
            columns: ['item_id'];
            isOneToOne: false;
            referencedRelation: 'shop_items';
            referencedColumns: ['id'];
          },
        ];
      };
      profiles: {
        Row: {
          avatar_url: string | null;
          created_at: string | null;
          display_name: string;
          high_score: number | null;
          id: string;
          is_banned: boolean | null;
          is_tester: boolean | null;
          last_seen_at: string | null;
          level: number | null;
          metadata: Json | null;
          total_sessions: number | null;
          updated_at: string | null;
          xp: number | null;
        };
        Insert: {
          avatar_url?: string | null;
          created_at?: string | null;
          display_name: string;
          high_score?: number | null;
          id?: string;
          is_banned?: boolean | null;
          is_tester?: boolean | null;
          last_seen_at?: string | null;
          level?: number | null;
          metadata?: Json | null;
          total_sessions?: number | null;
          updated_at?: string | null;
          xp?: number | null;
        };
        Update: {
          avatar_url?: string | null;
          created_at?: string | null;
          display_name?: string;
          high_score?: number | null;
          id?: string;
          is_banned?: boolean | null;
          is_tester?: boolean | null;
          last_seen_at?: string | null;
          level?: number | null;
          metadata?: Json | null;
          total_sessions?: number | null;
          updated_at?: string | null;
          xp?: number | null;
        };
        Relationships: [];
      };
      schema_versions: {
        Row: {
          applied_at: string | null;
          description: string | null;
          version: string;
        };
        Insert: {
          applied_at?: string | null;
          description?: string | null;
          version: string;
        };
        Update: {
          applied_at?: string | null;
          description?: string | null;
          version?: string;
        };
        Relationships: [];
      };
      sessions: {
        Row: {
          created_at: string | null;
          crypto_pair: string;
          entry_price: number | null;
          exit_price: number | null;
          id: string;
          is_verified: boolean | null;
          kills: number | null;
          leverage: number | null;
          position_chosen: string;
          profile_id: string | null;
          reward_amount: number | null;
          session_secret: string | null;
          survival_seconds: number | null;
        };
        Insert: {
          created_at?: string | null;
          crypto_pair: string;
          entry_price?: number | null;
          exit_price?: number | null;
          id?: string;
          is_verified?: boolean | null;
          kills?: number | null;
          leverage?: number | null;
          position_chosen: string;
          profile_id?: string | null;
          reward_amount?: number | null;
          session_secret?: string | null;
          survival_seconds?: number | null;
        };
        Update: {
          created_at?: string | null;
          crypto_pair?: string;
          entry_price?: number | null;
          exit_price?: number | null;
          id?: string;
          is_verified?: boolean | null;
          kills?: number | null;
          leverage?: number | null;
          position_chosen?: string;
          profile_id?: string | null;
          reward_amount?: number | null;
          session_secret?: string | null;
          survival_seconds?: number | null;
        };
        Relationships: [
          {
            foreignKeyName: 'sessions_profile_id_fkey';
            columns: ['profile_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'sessions_profile_id_fkey';
            columns: ['profile_id'];
            isOneToOne: false;
            referencedRelation: 'v_leaderboard';
            referencedColumns: ['profile_id'];
          },
        ];
      };
      shop_items: {
        Row: {
          category: string;
          cost_gems: number | null;
          cost_gold: number;
          created_at: string | null;
          description: string | null;
          effect_type: string | null;
          effect_value: number | null;
          icon_key: string | null;
          id: string;
          is_active: boolean | null;
          max_purchases: number | null;
          name: string;
        };
        Insert: {
          category: string;
          cost_gems?: number | null;
          cost_gold: number;
          created_at?: string | null;
          description?: string | null;
          effect_type?: string | null;
          effect_value?: number | null;
          icon_key?: string | null;
          id?: string;
          is_active?: boolean | null;
          max_purchases?: number | null;
          name: string;
        };
        Update: {
          category?: string;
          cost_gems?: number | null;
          cost_gold?: number;
          created_at?: string | null;
          description?: string | null;
          effect_type?: string | null;
          effect_value?: number | null;
          icon_key?: string | null;
          id?: string;
          is_active?: boolean | null;
          max_purchases?: number | null;
          name?: string;
        };
        Relationships: [];
      };
      virtual_accounts: {
        Row: {
          gems_balance: number | null;
          gold_balance: number | null;
          profile_id: string;
          total_earned_gold: number | null;
          total_spent_gold: number | null;
          updated_at: string | null;
        };
        Insert: {
          gems_balance?: number | null;
          gold_balance?: number | null;
          profile_id: string;
          total_earned_gold?: number | null;
          total_spent_gold?: number | null;
          updated_at?: string | null;
        };
        Update: {
          gems_balance?: number | null;
          gold_balance?: number | null;
          profile_id?: string;
          total_earned_gold?: number | null;
          total_spent_gold?: number | null;
          updated_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'virtual_accounts_profile_id_fkey';
            columns: ['profile_id'];
            isOneToOne: true;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'virtual_accounts_profile_id_fkey';
            columns: ['profile_id'];
            isOneToOne: true;
            referencedRelation: 'v_leaderboard';
            referencedColumns: ['profile_id'];
          },
        ];
      };
      wallets: {
        Row: {
          address: string;
          chain: string | null;
          created_at: string | null;
          id: string;
          is_primary: boolean | null;
          profile_id: string | null;
          wallet_type: string | null;
        };
        Insert: {
          address: string;
          chain?: string | null;
          created_at?: string | null;
          id?: string;
          is_primary?: boolean | null;
          profile_id?: string | null;
          wallet_type?: string | null;
        };
        Update: {
          address?: string;
          chain?: string | null;
          created_at?: string | null;
          id?: string;
          is_primary?: boolean | null;
          profile_id?: string | null;
          wallet_type?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'wallets_profile_id_fkey';
            columns: ['profile_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'wallets_profile_id_fkey';
            columns: ['profile_id'];
            isOneToOne: false;
            referencedRelation: 'v_leaderboard';
            referencedColumns: ['profile_id'];
          },
        ];
      };
    };
    Views: {
      v_leaderboard: {
        Row: {
          avatar_url: string | null;
          display_name: string | null;
          high_score: number | null;
          max_survival_time: number | null;
          profile_id: string | null;
          total_kills: number | null;
          total_sessions: number | null;
        };
        Relationships: [];
      };
    };
    Functions: {
      credit_coins: {
        Args: {
          p_amount: number;
          p_metadata?: Json;
          p_profile_id: string;
          p_reference_id?: string;
          p_transaction_type: string;
        };
        Returns: Json;
      };
      get_leaderboard: {
        Args: { p_limit?: number };
        Returns: {
          avatar_url: string;
          display_name: string;
          high_score: number;
          max_survival_time: number;
          profile_id: string;
          total_kills: number;
          total_sessions: number;
        }[];
      };
      purchase_item: {
        Args: { p_item_id: string; p_profile_id: string };
        Returns: Json;
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, 'public'>];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema['Tables'] &
        DefaultSchema['Views'])
    ? (DefaultSchema['Tables'] &
        DefaultSchema['Views'])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema['Tables']
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema['Tables']
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema['Enums']
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums']
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums'][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema['Enums']
    ? DefaultSchema['Enums'][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema['CompositeTypes']
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes']
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes'][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema['CompositeTypes']
    ? DefaultSchema['CompositeTypes'][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {},
  },
} as const;
