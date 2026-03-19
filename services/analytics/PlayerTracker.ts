/**
 * PlayerTracker - Beta User System Integration
 *
 * Features:
 * - Player registration and session tracking
 * - Device fingerprinting
 * - Last seen updates
 * - Railway API integration
 */

import { Logger } from '../system/Logger';
import { railwayClient } from '../api/RailwayClient';
import { UserSessionService } from '../auth/UserSessionService';

interface PlayerData {
  id: string;
  displayName: string;
  createdAt: string;
  lastSeenAt: string;
  totalSessions: number;
  highScore: number;
}

interface ProfileResponse {
  id: string;
  nickname: string;
  display_name: string;
  created_at: string;
  last_seen_at: string;
  updated_at: string;
}

export class PlayerTracker {
  private static instance: PlayerTracker | null = null;
  private currentPlayer: PlayerData | null = null;

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
    const railwayUrl = import.meta.env.VITE_RAILWAY_API_URL;
    if (!railwayUrl) {
      Logger.debug('[PlayerTracker] Railway API not configured');
      return;
    }

    const profileId = UserSessionService.getProfileId();
    const nickname = UserSessionService.getNickname();

    if (!nickname) {
      Logger.debug('[PlayerTracker] No nickname set yet');
      return;
    }

    // Skip anonymous players
    if (profileId.startsWith('anon_')) {
      Logger.debug('[PlayerTracker] Anonymous player, skipping registration');
      return;
    }

    try {
      // Fetch profile via Railway API (upsert semantics — creates if missing)
      const profile = await railwayClient
        .get<ProfileResponse>('/api/v1/profile')
        .catch(async () => {
          // Profile doesn't exist yet, create it
          return railwayClient.post<ProfileResponse>('/api/v1/profile', { nickname });
        });

      this.currentPlayer = {
        id: profile.id,
        displayName: profile.display_name,
        createdAt: profile.created_at,
        lastSeenAt: profile.last_seen_at,
        totalSessions: 1,
        highScore: 0,
      };

      Logger.info(`[PlayerTracker] Welcome, ${nickname}!`);

      // Start heartbeat for active players
      this.startHeartbeat();
    } catch (err) {
      Logger.error('[PlayerTracker] Failed to initialize player', err);
    }
  }

  private heartbeatTimer: ReturnType<typeof setInterval> | null = null;
  private readonly HEARTBEAT_INTERVAL = 5 * 60 * 1000; // 5 minutes

  /**
   * Periodically update last_seen_at via Railway API
   */
  private startHeartbeat(): void {
    if (this.heartbeatTimer) return;

    this.heartbeatTimer = setInterval(() => {
      void (async () => {
        if (!this.currentPlayer) return;

        try {
          await railwayClient.patch('/api/v1/profile', {});
          Logger.debug('[PlayerTracker] Heartbeat sent');
        } catch (err) {
          Logger.warn('[PlayerTracker] Heartbeat failed', err);
        }
      })();
    }, this.HEARTBEAT_INTERVAL);
  }

  private stopHeartbeat(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  /**
   * Get player's current high score
   */
  getHighScore(): number {
    return this.currentPlayer?.highScore ?? 0;
  }

  /**
   * Update player's high score if new score is higher.
   * Returns true if score was updated, false if not.
   */
  async updateHighScore(newScore: number): Promise<boolean> {
    if (!this.currentPlayer) return false;

    // Only update if new score is higher
    if (newScore <= this.currentPlayer.highScore) {
      return false;
    }

    // Update local cache
    this.currentPlayer.highScore = newScore;
    Logger.debug(`[PlayerTracker] High score updated to ${newScore}`);
    return true;
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
    try {
      await railwayClient.post('/api/v1/telemetry/device-profiles', {
        fingerprint,
        device_type: profile.deviceType,
        browser: profile.browser,
        screen_width: profile.screenWidth,
        screen_height: profile.screenHeight,
        hardware_concurrency: profile.hardwareConcurrency,
        device_memory: profile.deviceMemory,
        recommended_profile: profile.recommendedProfile,
        benchmark_score: profile.benchmarkScore,
      });

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
    this.stopHeartbeat();
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
