/**
 * MetricsStorage - Handles localStorage persistence for metrics
 *
 * Features:
 * - Load/save sessions to localStorage
 * - Quota exceeded handling with graceful degradation
 * - Session limiting
 * - Cloud sync to Supabase
 */

import { Logger } from '../Logger';
import { type SessionMetrics } from '../../types/metrics';
import { supabase, isSupabaseConfigured } from '../supabase';
import { UserSessionService } from '../auth/UserSessionService';

const METRICS_VERSION = '1.0.0';
const STORAGE_KEY = 'crypto_survivors_metrics';

export class MetricsStorage {
  private sessions: SessionMetrics[] = [];
  private maxSessions: number;

  constructor(maxSessions: number = 100) {
    this.maxSessions = maxSessions;
    this.load();
  }

  /**
   * Load sessions from localStorage
   */
  load(): void {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const data = JSON.parse(stored);
        this.sessions = data.sessions ?? [];
        Logger.debug(`[MetricsStorage] Loaded ${this.sessions.length} sessions`);
      }
    } catch (error) {
      Logger.warn('[MetricsStorage] Failed to load from storage', error);
      this.sessions = [];
    }
  }

  /**
   * Save sessions to localStorage
   */
  private save(): void {
    try {
      const data = {
        version: METRICS_VERSION,
        sessions: this.sessions,
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (error) {
      if (this.isQuotaExceededError(error)) {
        Logger.warn('[MetricsStorage] Quota exceeded, cleaning up...');
        this.handleQuotaExceeded();
      } else {
        Logger.error('[MetricsStorage] Failed to save', error);
      }
    }
  }

  /**
   * Add a session and persist
   */
  addSession(session: SessionMetrics): void {
    this.sessions.push(session);

    // Enforce max limit
    while (this.sessions.length > this.maxSessions) {
      this.sessions.shift();
    }

    this.save();

    // Sync to Supabase (fire and forget)
    void this.syncToSupabase(session);
  }

  /**
   * Sync session to Supabase
   */
  private async syncToSupabase(session: SessionMetrics): Promise<void> {
    // Skip sync if Supabase is not configured
    if (!isSupabaseConfigured() || !supabase) {
      Logger.debug('[MetricsStorage] Supabase not configured, skipping sync');
      return;
    }

    // Check if analytics is enabled via environment variable
    // Set VITE_ENABLE_ANALYTICS=false in .env.local to disable during development
    const analyticsEnabled = import.meta.env.VITE_ENABLE_ANALYTICS !== 'false';

    if (!analyticsEnabled) {
      Logger.debug('[MetricsStorage] Analytics disabled via environment variable');
      return;
    }

    try {
      const playerId = UserSessionService.getPlayerId();
      const isAnonymous = playerId.startsWith('anon-');

      // 1. Insert game session (without FPS - moved to performance_metrics)
      const { data: gameSession, error: sessionError } = await supabase
        .from('game_sessions')
        .insert({
          player_id: isAnonymous ? null : playerId,
          session_timestamp: new Date(session.sessionTimestamp).toISOString(),
          survival_time_ms: session.player.survivalTimeMs,
          end_reason: session.gameEndReason,
          max_level: session.player.maxLevel,
          total_kills: session.player.totalKills,
          crypto_pair: session.pair,
          position: session.bitcoin.positionChosen,
          leverage: session.bitcoin.leverage,
          entry_price: session.bitcoin.priceAtStart,
          exit_price: session.bitcoin.priceAtEnd,
          pnl_percent: session.bitcoin.pnlAtDeath,
          device_fingerprint: session.performance?.deviceFingerprint,
        })
        .select('id')
        .single();

      if (sessionError) {
        throw sessionError;
      }

      Logger.info('[MetricsStorage] Game session synced');

      // 2. Insert performance metrics (if available)
      if (session.performance && gameSession.id) {
        const { error: perfError } = await supabase.from('performance_metrics').insert({
          session_id: gameSession.id,
          avg_fps: session.performance.avgFps,
          min_fps: session.performance.minFps,
          max_fps: session.performance.maxFps ?? session.performance.avgFps,
          fps_samples: session.performance.fpsSamples ?? 1,
          frame_drops: session.performance.frameDrops ?? 0,
          memory_used_mb: session.performance.memoryUsedMb,
          memory_peak_mb: session.performance.memoryPeakMb,
          enemy_count_max: session.performance.enemyCountMax,
          optimization_profile: session.performance.optimizationProfile,
          device_fingerprint: session.performance.deviceFingerprint,
        });

        if (perfError) {
          Logger.warn('[MetricsStorage] Performance metrics sync failed', perfError);
        } else {
          Logger.debug('[MetricsStorage] Performance metrics synced');
        }
      }

      // 3. Update player stats (if not anonymous)
      if (!isAnonymous) {
        await this.updatePlayerStats(playerId, session);
      }
    } catch (err) {
      // Silent fail is okay for metrics, but log warning
      Logger.warn('[MetricsStorage] Supabase sync failed', err);
    }
  }

  /**
   * Update player aggregate stats after game session
   */
  private async updatePlayerStats(playerId: string, session: SessionMetrics): Promise<void> {
    if (!supabase) return;

    try {
      // Get current player stats
      const { data: player, error: fetchError } = await supabase
        .from('players')
        .select('high_score, total_kills, total_playtime_ms, best_pnl_percent')
        .eq('id', playerId)
        .single();

      if (fetchError) return;

      // Calculate updates
      const newHighScore = Math.max(player.high_score, session.player.survivalTimeMs);
      const newTotalKills = player.total_kills + session.player.totalKills;
      const newTotalPlaytime = player.total_playtime_ms + session.player.survivalTimeMs;
      const pnl = session.bitcoin.pnlAtDeath;
      const newBestPnl = pnl > player.best_pnl_percent ? pnl : player.best_pnl_percent;

      // Update player
      const { error: updateError } = await supabase
        .from('players')
        .update({
          high_score: newHighScore,
          total_kills: newTotalKills,
          total_playtime_ms: newTotalPlaytime,
          best_pnl_percent: newBestPnl,
        })
        .eq('id', playerId);

      if (updateError) {
        Logger.warn('[MetricsStorage] Player stats update failed', updateError);
      } else if (newHighScore > player.high_score) {
        Logger.info(`[MetricsStorage] New high score! ${player.high_score} → ${newHighScore}`);
      }
    } catch (err) {
      Logger.warn('[MetricsStorage] Player stats update error', err);
    }
  }

  /**
   * Get all stored sessions
   */
  getSessions(): SessionMetrics[] {
    return [...this.sessions];
  }

  /**
   * Get session count
   */
  getCount(): number {
    return this.sessions.length;
  }

  /**
   * Clear all sessions
   */
  clear(): void {
    this.sessions = [];
    try {
      localStorage.removeItem(STORAGE_KEY);
      Logger.info('[MetricsStorage] All sessions cleared');
    } catch {
      // Ignore
    }
  }

  /**
   * Check if error is a QuotaExceededError
   */
  private isQuotaExceededError(error: unknown): boolean {
    if (error instanceof DOMException) {
      return error.name === 'QuotaExceededError' || error.name === 'NS_ERROR_DOM_QUOTA_REACHED';
    }
    return false;
  }

  /**
   * Handle quota exceeded by removing old sessions
   */
  private handleQuotaExceeded(): void {
    const originalCount = this.sessions.length;

    // Keep only half
    const keepCount = Math.max(10, Math.floor(this.sessions.length / 2));
    this.sessions = this.sessions.slice(-keepCount);

    Logger.info(`[MetricsStorage] Removed ${originalCount - keepCount} old sessions`);

    // Retry save
    try {
      const data = {
        version: METRICS_VERSION,
        sessions: this.sessions,
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
      Logger.info('[MetricsStorage] Saved after cleanup');
    } catch (retryError) {
      if (this.isQuotaExceededError(retryError)) {
        // Keep only last 5
        Logger.warn('[MetricsStorage] Still exceeded, keeping only 5 sessions');
        this.sessions = this.sessions.slice(-5);

        try {
          const data = {
            version: METRICS_VERSION,
            sessions: this.sessions,
          };
          localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
        } catch {
          Logger.error('[MetricsStorage] Cannot save, clearing all');
          this.sessions = [];
          localStorage.removeItem(STORAGE_KEY);
        }
      } else {
        Logger.error('[MetricsStorage] Unexpected retry error', retryError);
      }
    }
  }
}
