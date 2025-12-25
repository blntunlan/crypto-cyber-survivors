/**
 * PlayerTracker - Beta User System Integration
 *
 * Features:
 * - Player registration and session tracking
 * - Device fingerprinting
 * - Last seen updates
 * - Supabase integration
 */

import { Logger } from '../Logger';
import { supabase, isSupabaseConfigured } from '../supabase';
import { UserSessionService } from '../auth/UserSessionService';

interface PlayerData {
  id: string;
  displayName: string;
  createdAt: string;
  lastSeenAt: string;
  totalSessions: number;
  highScore: number;
}

export class PlayerTracker {
  private static instance: PlayerTracker | null = null;
  private currentPlayer: PlayerData | null = null;
  private updateInterval: NodeJS.Timeout | null = null;

  private constructor() {
    // Initialize player on construction
    void this.initializePlayer();
  }

  static getInstance(): PlayerTracker {
    PlayerTracker.instance ??= new PlayerTracker();
    return PlayerTracker.instance;
  }

  /**
   * Initialize or restore player
   */
  private async initializePlayer(): Promise<void> {
    if (!isSupabaseConfigured() || !supabase) {
      Logger.debug('[PlayerTracker] Supabase not configured');
      return;
    }

    const playerId = UserSessionService.getPlayerId();
    const nickname = UserSessionService.getNickname();

    if (!nickname) {
      Logger.debug('[PlayerTracker] No nickname set yet');
      return;
    }

    // Skip anonymous players
    if (playerId.startsWith('anon-')) {
      Logger.debug('[PlayerTracker] Anonymous player, skipping registration');
      return;
    }

    try {
      // Check if player exists
      const { data: existing, error: fetchError } = await supabase
        .from('players')
        .select('*')
        .eq('id', playerId)
        .maybeSingle();

      if (fetchError && fetchError.code !== 'PGRST116') {
        throw fetchError;
      }

      if (existing) {
        // Update existing player
        const { error: updateError } = await supabase
          .from('players')
          .update({
            last_seen_at: new Date().toISOString(),
            total_sessions: existing.total_sessions + 1,
          })
          .eq('id', playerId);

        if (updateError) throw updateError;

        this.currentPlayer = {
          id: existing.id,
          displayName: existing.display_name,
          createdAt: existing.created_at,
          lastSeenAt: new Date().toISOString(),
          totalSessions: existing.total_sessions + 1,
          highScore: existing.high_score ?? 0,
        };

        Logger.info(`[PlayerTracker] Welcome back, ${nickname}!`);
      } else {
        // Create new player
        const { data: newPlayer, error: insertError } = await supabase
          .from('players')
          .insert({
            id: playerId,
            display_name: nickname,
            created_at: new Date().toISOString(),
            last_seen_at: new Date().toISOString(),
            total_sessions: 1,
          })
          .select()
          .single();

        if (insertError) throw insertError;

        this.currentPlayer = {
          id: newPlayer.id,
          displayName: newPlayer.display_name,
          createdAt: newPlayer.created_at,
          lastSeenAt: newPlayer.last_seen_at,
          totalSessions: 1,
          highScore: 0,
        };

        Logger.info(`[PlayerTracker] New player registered: ${nickname}`);
      }

      // Start periodic heartbeat
      this.startHeartbeat();
    } catch (err) {
      Logger.error('[PlayerTracker] Failed to initialize player', err);
    }
  }

  /**
   * Start periodic "last seen" updates
   */
  private startHeartbeat(): void {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
    }

    // Update every 5 minutes
    this.updateInterval = setInterval(
      () => {
        void this.updateLastSeen();
      },
      5 * 60 * 1000
    );

    Logger.debug('[PlayerTracker] Heartbeat started');
  }

  /**
   * Update last seen timestamp
   */
  private async updateLastSeen(): Promise<void> {
    if (!this.currentPlayer || !isSupabaseConfigured() || !supabase) {
      return;
    }

    try {
      const { error } = await supabase
        .from('players')
        .update({
          last_seen_at: new Date().toISOString(),
        })
        .eq('id', this.currentPlayer.id);

      if (error) throw error;

      this.currentPlayer.lastSeenAt = new Date().toISOString();
      Logger.debug('[PlayerTracker] Last seen updated');
    } catch (err) {
      Logger.warn('[PlayerTracker] Failed to update last seen', err);
    }
  }

  /**
   * Update high score if new score is higher
   * @returns true if high score was updated, false otherwise
   */
  async updateHighScore(newScore: number): Promise<boolean> {
    if (!this.currentPlayer || !isSupabaseConfigured() || !supabase) {
      return false;
    }

    // Only update if new score is higher
    if (newScore <= this.currentPlayer.highScore) {
      Logger.debug(
        `[PlayerTracker] Score ${newScore} not higher than high score ${this.currentPlayer.highScore}`
      );
      return false;
    }

    try {
      const { error } = await supabase
        .from('players')
        .update({
          high_score: newScore,
        })
        .eq('id', this.currentPlayer.id);

      if (error) throw error;

      const oldScore = this.currentPlayer.highScore;
      this.currentPlayer.highScore = newScore;
      Logger.info(`[PlayerTracker] New high score! ${oldScore} → ${newScore}`);
      return true;
    } catch (err) {
      Logger.warn('[PlayerTracker] Failed to update high score', err);
      return false;
    }
  }

  /**
   * Get player's current high score
   */
  getHighScore(): number {
    return this.currentPlayer?.highScore ?? 0;
  }

  /**
   * Track device profile
   */
  async trackDeviceProfile(
    fingerprint: string,
    profile: {
      deviceType: string;
      browser: string;
      screenWidth: number;
      screenHeight: number;
      hardwareConcurrency: number;
      deviceMemory?: number;
      recommendedProfile: string;
      benchmarkScore?: number;
    }
  ): Promise<void> {
    if (!isSupabaseConfigured() || !supabase) {
      return;
    }

    try {
      const { error } = await supabase.from('device_profiles').upsert(
        {
          fingerprint,
          device_type: profile.deviceType,
          browser: profile.browser,
          screen_width: profile.screenWidth,
          screen_height: profile.screenHeight,
          hardware_concurrency: profile.hardwareConcurrency,
          device_memory: profile.deviceMemory,
          recommended_profile: profile.recommendedProfile,
          benchmark_score: profile.benchmarkScore,
          first_seen_at: new Date().toISOString(),
          last_seen_at: new Date().toISOString(),
        },
        {
          onConflict: 'fingerprint',
        }
      );

      if (error) throw error;

      Logger.debug('[PlayerTracker] Device profile tracked');
    } catch (err) {
      Logger.warn('[PlayerTracker] Failed to track device profile', err);
    }
  }

  /**
   * Get current player data
   */
  getCurrentPlayer(): PlayerData | null {
    return this.currentPlayer;
  }

  /**
   * Re-initialize player (call after login/nickname change)
   */
  async refresh(): Promise<void> {
    this.currentPlayer = null;
    await this.initializePlayer();
  }

  /**
   * Stop heartbeat on logout
   */
  stop(): void {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
    }
    this.currentPlayer = null;
    Logger.info('[PlayerTracker] Stopped');
  }

  /**
   * Reset instance for testing
   */
  static resetForTesting(): void {
    if (PlayerTracker.instance) {
      PlayerTracker.instance.stop();
      PlayerTracker.instance = null;
    }
  }
}

// Auto-initialize on import
const playerTracker = PlayerTracker.getInstance();
export default playerTracker;
