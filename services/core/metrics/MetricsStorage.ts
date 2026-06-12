/**
 * MetricsStorage - Handles localStorage persistence for metrics
 *
 * Features:
 * - Load/save sessions to localStorage
 * - Quota exceeded handling with graceful degradation
 * - Session limiting
 * - Railway session and telemetry sync with retry logic
 */

import { Logger } from '../../system/Logger';
import { type SessionMetrics } from '../../../types/metrics';
import { railwayClient } from '../../api/RailwayClient';
import { UserSessionService } from '../../auth/UserSessionService';
import { RuntimeDiagnosticsService } from '../../system/RuntimeDiagnosticsService';
import { EventBus } from '../EventBus';

const METRICS_VERSION = '1.0.0';
const STORAGE_KEY = 'crypto_survivors_metrics';

// Retry configuration
const MAX_SYNC_RETRIES = 3;
const INITIAL_RETRY_DELAY_MS = 1000;
const RETRY_BACKOFF_MULTIPLIER = 2;

// PostgreSQL error interface
interface PostgresError extends Error {
  code?: string;
}

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
        let sessions: SessionMetrics[] = data.sessions ?? [];

        // Trim logs from old sessions to keep heap small
        // Keep logs only for the most recent 3 sessions
        sessions = sessions.map((s, idx) => {
          if (idx < sessions.length - 3 && s.inputLogs && s.inputLogs.length > 0) {
            return { ...s, inputLogs: [] };
          }
          return s;
        });

        this.sessions = sessions;
        Logger.debug(
          `[MetricsStorage] Loaded ${this.sessions.length} sessions (trimmed old logs)`
        );
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
    // Before adding, trim logs of old sessions in memory
    if (this.sessions.length >= 3) {
      const olderSession = this.sessions[this.sessions.length - 3];
      if (olderSession?.inputLogs) {
        olderSession.inputLogs = []; // Free memory from old session logs
      }
    }

    this.sessions.push(session);

    // Enforce max limit
    while (this.sessions.length > this.maxSessions) {
      this.sessions.shift();
    }

    this.save();

    // Sync to Railway session and telemetry endpoints (fire and forget)
    void this.syncToSupabase(session);
  }

  /**
   * Sync session to Railway with retry logic.
   * Legacy method name retained because tests and bridges still call syncToSupabase().
   * Uses UPSERT logic: if serverSessionId exists, update the existing record.
   * Otherwise, insert a new record.
   */
  private async syncToSupabase(session: SessionMetrics, retryCount = 0): Promise<void> {
    // Skip sync if Railway API is not configured
    const railwayUrl = import.meta.env.VITE_RAILWAY_API_URL;
    if (!railwayUrl) {
      Logger.debug('[MetricsStorage] Railway API not configured, skipping sync');
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
      const profileId = UserSessionService.getProfileId();
      const nickname = UserSessionService.getNickname();
      const isAnonymous = profileId.startsWith('anon_');
      const serverSessionId = session.serverSessionId;
      const hasValidServerUuid =
        !!serverSessionId && !serverSessionId.startsWith('local-');

      if (isAnonymous) {
        Logger.debug('[MetricsStorage] Skipping Railway sync for anonymous session');
        return;
      }

      if (!hasValidServerUuid) {
        Logger.debug(
          '[MetricsStorage] Skipping Railway sync without server session UUID',
          {
            sessionId: session.sessionId,
            serverSessionId: serverSessionId ?? 'none',
          }
        );
        return;
      }

      // Log detailed state for debugging
      Logger.info('[MetricsStorage] Attempting sync with player state', {
        profileId: profileId.substring(0, 8) + '...',
        hasNickname: !!nickname,
        isAnonymous: false,
        sessionId: session.sessionId,
        survivalTimeMs: session.player.survivalTimeMs,
        totalKills: session.player.totalKills,
      });

      // Runtime-only session data; immutable trade terms are bound at /sessions/start.
      const sessionData: Record<string, unknown> = {
        entry_price: session.bitcoin.priceAtStart,
        exit_price: session.bitcoin.priceAtEnd,
        survival_seconds: Math.floor(session.player.survivalTimeMs / 1000),
        kills: session.player.totalKills,
      };

      let gameSession: { id: string } | null = null;
      let sessionError: Error | null = null;

      try {
        Logger.debug('[MetricsStorage] Syncing session to Railway', {
          serverSessionId,
        });

        const result = await railwayClient.post<{ id: string }>(
          '/api/v1/sessions/sync',
          {
            sessionId: serverSessionId,
            sessionData,
          }
        );

        gameSession = result;
      } catch (error) {
        sessionError = error as Error;
      }

      if (sessionError) {
        if (this.isVerifiedSessionMutationError(sessionError)) {
          Logger.debug(
            '[MetricsStorage] Session already verified; skipping mutable sync',
            {
              sessionId: session.sessionId,
              serverSessionId,
            }
          );
          gameSession = { id: serverSessionId };
        } else {
          // PostgreSQL unique constraint violation code: 23505 (Replay Attack Protection)
          const pgError = sessionError as PostgresError;
          if (pgError.code === '23505') {
            Logger.warn(
              '[MetricsStorage] Duplicate session detected - replay attack blocked',
              {
                sessionId: session.sessionId,
                profileId,
              }
            );
            return; // Silently ignore duplicate
          }
          throw sessionError;
        }
      }

      // Get the actual session ID (from server or local)
      const actualSessionId = gameSession?.id ?? serverSessionId;

      Logger.debug(
        '[MetricsStorage] Legacy Supabase reward verification skipped; Railway submitSession is authoritative',
        { sessionId: actualSessionId }
      );

      Logger.info('[MetricsStorage] Game session synced', {
        sessionId: actualSessionId,
        retryCount,
      });

      // Emit success event
      EventBus.emit('sessionSynced', {
        sessionId: actualSessionId,
        profileId,
      });

      // 2. Insert performance metrics (if available)
      if (session.performance && actualSessionId) {
        try {
          const runtimeDiagnostics = RuntimeDiagnosticsService.getTelemetryContext();

          await railwayClient.post('/api/v1/telemetry/performance-metrics', {
            session_id: actualSessionId,
            profile_id: profileId,
            avg_fps: session.performance.avgFps,
            min_fps: session.performance.minFps,
            max_fps: session.performance.maxFps ?? session.performance.avgFps,
            frame_drops: session.performance.frameDrops ?? 0,
            device_platform: window.innerWidth < 768 ? 'mobile' : 'desktop',
            metadata: {
              fps_samples: session.performance.fpsSamples ?? 1,
              memory_used_mb: session.performance.memoryUsedMb,
              memory_peak_mb: session.performance.memoryPeakMb,
              enemy_count_max: session.performance.enemyCountMax,
              fps_1_percentile: session.performance.fps_1_percentile,
              avg_frame_time_ms: session.performance.avg_frame_time_ms,
              max_frame_time_ms: session.performance.max_frame_time_ms,
              enemy_count_avg: session.performance.enemy_count_avg,
              bullet_count_avg: session.performance.bullet_count_avg,
              particle_count_avg: session.performance.particle_count_avg,
              optimization_profile: session.performance.optimizationProfile,
              device_fingerprint: session.performance.deviceFingerprint,
              runtime_diagnostics: runtimeDiagnostics,
              p95_frame_time_ms: runtimeDiagnostics.summary.p95FrameMs,
              p99_frame_time_ms: runtimeDiagnostics.summary.p99FrameMs,
              stutter_frames: runtimeDiagnostics.summary.stutterFrames,
              hitch_frames: runtimeDiagnostics.summary.hitchFrames,
              diagnostics_issue_counts: runtimeDiagnostics.summary.issueCountsByCode,
            },
          });
          Logger.debug('[MetricsStorage] Performance metrics synced');
        } catch (perfError) {
          Logger.warn('[MetricsStorage] Performance metrics sync failed', perfError);
        }
      }

      // 3. Upsert device profile
      if (session.performance?.deviceFingerprint) {
        try {
          await railwayClient.post('/api/v1/telemetry/device-profiles', {
            fingerprint: session.performance.deviceFingerprint,
            browser: session.performance.browser,
            device_type: window.innerWidth < 768 ? 'mobile' : 'desktop',
            screen_width: window.innerWidth,
            screen_height: window.innerHeight,
          });
        } catch (deviceError) {
          Logger.warn('[MetricsStorage] Device profile sync failed', deviceError);
        }
      }

      // 3. Upsert device profile (Already implemented)
      // ... (device profile code)

      // 4. Upload Replay Logs (if significant session)
      if (
        session.inputLogs &&
        session.inputLogs.length > 0 &&
        session.player.survivalTimeMs > 60000 // Only upload logs for runs > 1 minute
      ) {
        // Replay upload temporarily disabled during Railway migration
        // TODO: Implement replay upload via Railway API when storage is available
        Logger.debug('[MetricsStorage] Replay upload skipped (Railway migration)');
      }

      // 5. Player stats are updated automatically on the Railway backend
      // when the session row has been persisted.
    } catch (err) {
      // Don't retry on 402 (quota exhausted) — it won't help
      const errMsg = err instanceof Error ? err.message : String(err);
      const isQuotaExhausted =
        errMsg.includes('402') ||
        (err !== null &&
          typeof err === 'object' &&
          'code' in err &&
          (err as { code: string }).code === '402');
      if (isQuotaExhausted) {
        Logger.warn(
          '[MetricsStorage] Railway sync quota exhausted (402), skipping retries'
        );
        EventBus.emit('sessionSyncFailed', {
          sessionId: session.sessionId,
          error: 'Railway sync quota exhausted (402)',
          retryCount,
        });
        return;
      }

      // Retry logic with exponential backoff
      if (retryCount < MAX_SYNC_RETRIES) {
        const delay =
          INITIAL_RETRY_DELAY_MS * Math.pow(RETRY_BACKOFF_MULTIPLIER, retryCount);
        Logger.warn(
          `[MetricsStorage] Sync failed, retrying in ${delay}ms (attempt ${retryCount + 1}/${MAX_SYNC_RETRIES})`,
          err
        );

        await this.sleep(delay);
        return this.syncToSupabase(session, retryCount + 1);
      }

      // Max retries exceeded
      Logger.error(
        `[MetricsStorage] Railway sync failed after ${MAX_SYNC_RETRIES} retries`,
        err
      );

      // Emit failure event for monitoring
      EventBus.emit('sessionSyncFailed', {
        sessionId: session.sessionId,
        error: err instanceof Error ? err.message : String(err),
        retryCount,
      });
    }
  }

  /**
   * Sleep utility for retry delays
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private isVerifiedSessionMutationError(error: Error): boolean {
    const message = error.message.toLowerCase();
    return (
      message.includes('409') ||
      (message.includes('verified') &&
        (message.includes('mutated') || message.includes('mutation')))
    );
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
      return (
        error.name === 'QuotaExceededError' ||
        error.name === 'NS_ERROR_DOM_QUOTA_REACHED'
      );
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
