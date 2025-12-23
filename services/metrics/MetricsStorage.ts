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
      const { data: sessionData, error } = await supabase
        .from('game_sessions')
        .insert({
          player_id: UserSessionService.getPlayerId().startsWith('anon-')
            ? null
            : UserSessionService.getPlayerId(),
          session_timestamp: new Date(session.sessionTimestamp).toISOString(),
          survival_time_ms: session.player.survivalTimeMs,
          end_reason: session.gameEndReason,
          max_level: session.player.maxLevel,
          total_kills: session.player.totalKills,
          metrics: session, // Store full JSON

          // New columns
          crypto_pair: session.pair,
          position: session.bitcoin.positionChosen,
          leverage: session.bitcoin.leverage,
          entry_price: session.bitcoin.priceAtStart,
          exit_price: session.bitcoin.priceAtEnd,
          pnl_percent: session.bitcoin.pnlAtDeath,
          device_fingerprint: session.performance?.deviceFingerprint,
          avg_fps: session.performance?.avgFps,
          min_fps: session.performance?.minFps,
        })
        .select('id')
        .single();

      if (error) {
        throw error;
      }

      // Sync performance details if available
      if (session.performance) {
        await supabase.from('performance_metrics').insert({
          session_id: sessionData.id,
          player_id: UserSessionService.getPlayerId(),
          avg_fps: session.performance.avgFps,
          min_fps: session.performance.minFps,
          max_fps: session.performance.avgFps, // Estimate
          fps_samples: 1, // Summary sample
          device_type: window.innerWidth < 768 ? 'mobile' : 'desktop',
        });
      }

      Logger.info('[MetricsStorage] Synced to Supabase');

      // Update leaderboard if good run (>1 min)
      if (session.player.survivalTimeMs > 60000) {
        const score = Math.floor(
          session.player.totalKills * 100 + session.player.survivalTimeMs / 1000
        );
        const nickname =
          UserSessionService.getNickname() ?? `Survivor-${session.sessionId.substring(0, 4)}`;

        await supabase.from('leaderboard').insert({
          player_name: nickname,
          score,
          survival_time_ms: session.player.survivalTimeMs,
        });
      }
    } catch (err) {
      // Silent fail is okay for metrics, but log warning
      Logger.warn('[MetricsStorage] Supabase sync failed', err);
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
