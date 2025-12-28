/**
 * MetricsService - Comprehensive Game Analytics System
 *
 * Collects, stores, and analyzes game metrics to understand:
 * - Bitcoin price impact on gameplay
 * - Difficulty balance
 * - Player experience and pain points
 * - Areas for improvement
 */

import { EventBus } from './EventBus';
import { Logger } from './Logger';
import { type MarketPosition } from '../types';
import { type CryptoPair } from '../types/crypto';
import { getMetricsConfig, type MetricsConfig } from '../config/MetricsConfig';
import {
  type MetricsState,
  type SessionMetrics,
  type GameEndReason,
  type WavePhase,
  type GameInsights,
  type BitcoinInsights,
  type DifficultyInsights,
  type PlayerExperienceInsights,
} from '../types/metrics';

// Import modular components for external use
// These provide cleaner APIs for specific use cases
export { MetricsStorage } from './metrics/MetricsStorage';
export { MetricsCompiler } from './metrics/MetricsCompiler';
export { MetricsExporter } from './metrics/MetricsExporter';
export { MetricsAnalyzer } from './metrics/MetricsAnalyzer';

// Import modular components for internal delegation
import { MetricsCompiler } from './metrics/MetricsCompiler';
import { MetricsAnalyzer } from './metrics/MetricsAnalyzer';
import { MetricsExporter } from './metrics/MetricsExporter';

const METRICS_VERSION = '1.0.0';
const STORAGE_KEY = 'crypto_survivors_metrics';

export class MetricsServiceClass {
  private static instance: MetricsServiceClass | null = null;
  private state: MetricsState | null = null;
  private storedSessions: SessionMetrics[] = [];
  private lastSampleTime: number = 0;
  private eventUnsubscribers: Array<() => void> = [];
  private config: MetricsConfig;

  private constructor() {
    this.config = getMetricsConfig();

    if (this.config.enabled) {
      this.loadFromStorage();
      this.setupEventListeners();
      Logger.info('[Metrics] System initialized', { enabled: true });
    } else {
      Logger.info('[Metrics] System DISABLED by config');
    }
  }

  static getInstance(): MetricsServiceClass {
    return (MetricsServiceClass.instance ??= new MetricsServiceClass());
  }

  // ============= Session Management =============

  /**
   * Start a new metrics session
   */
  startSession(
    position: MarketPosition,
    entryPrice: number,
    leverage: number,
    pair: CryptoPair
  ): string {
    // Skip if metrics disabled
    if (!this.config.enabled) return '';

    const sessionId = this.generateSessionId();
    const now = Date.now();

    this.state = {
      sessionId,
      sessionStartTime: now,
      isActive: true,
      lastUpdateTime: now,
      pair,

      // History
      pnlHistory: [],
      difficultyHistory: [],
      atrHistory: [],
      currentWavePhase: 'building',
      wavePhaseStartTime: now,

      // Counters
      totalDamageDealt: 0,
      totalDamageTaken: 0,
      totalHealing: 0,
      totalGems: 0,
      totalExp: 0,
      totalCrits: 0,
      totalSuperCrits: 0,
      totalBullets: 0,
      totalSpawns: 0,

      // High-water marks
      maxEnemiesOnScreen: 0,
      maxPnL: 0,
      minPnL: 0,
      maxDifficulty: 0,
      maxStreak: 0,

      // Wave phase tracking
      wavePhaseTime: {
        calm: 0,
        building: 0,
        intense: 0,
        peak: 0,
      },

      // Near-death tracking
      nearDeathActivations: 0,
      highDifficultyTime: 0,
      lowDifficultyTime: 0,

      // Kill tracking
      killsByType: {},
      enemyLifetimes: [],

      // Card tracking
      cardsChosen: [],
      levelUpTimes: [],
      lastLevelUpTime: now,

      // Combo tracking
      streakHistory: [],
      comboTimeouts: 0,
      mileStonesReached: [],
      currentComboStartTime: 0,
      longestComboTime: 0,
      totalBonusXp: 0,
    };

    // Store initial Bitcoin price
    this.state.pnlHistory.push({ time: now, value: 0 });

    Logger.info(`[Metrics] Session started: ${sessionId}`, {
      position,
      entryPrice,
      leverage,
    });

    return sessionId;
  }

  /**
   * End the current session and compile metrics
   */
  endSession(
    reason: GameEndReason,
    finalData: {
      price: number;
      pnl: number;
      level: number;
      hp: number;
      difficulty: number;
      playerStats: {
        damage: number;
        fireRate: number;
        speed: number;
        luck: number;
        critChance: number;
        critDamage: number;
      };
      position: MarketPosition;
      entryPrice: number;
      leverage: number;
      totalKills: number;
      avgFps?: number;
      minFps?: number;
      deviceFingerprint?: string;
    }
  ): SessionMetrics | null {
    // Skip if metrics disabled
    if (!this.config.enabled) return null;

    if (!this.state?.isActive) {
      Logger.warn('[Metrics] No active session to end');
      return null;
    }

    const now = Date.now();
    const survivalTime = now - this.state.sessionStartTime;

    // Compile final metrics using MetricsCompiler
    const session: SessionMetrics = {
      sessionId: this.state.sessionId,
      sessionTimestamp: this.state.sessionStartTime,
      gameEndReason: reason,
      pair: this.state.pair,

      bitcoin: MetricsCompiler.compileBitcoinMetrics(this.state, finalData),
      difficulty: MetricsCompiler.compileDifficultyMetrics(this.state, finalData.difficulty),
      player: MetricsCompiler.compilePlayerMetrics(this.state, finalData, survivalTime),
      combo: MetricsCompiler.compileComboMetrics(this.state),
      card: MetricsCompiler.compileCardMetrics(this.state),
      enemy: MetricsCompiler.compileEnemyMetrics(this.state),
      performance:
        finalData.avgFps !== undefined
          ? MetricsCompiler.compilePerformanceMetrics({
              avgFps: finalData.avgFps,
              minFps: finalData.minFps ?? 0,
              deviceFingerprint: finalData.deviceFingerprint ?? '',
            })
          : undefined,
    };

    // Store session
    this.storeSession(session);

    // Mark session as inactive
    this.state.isActive = false;

    Logger.info(`[Metrics] Session ended: ${session.sessionId}`, {
      reason,
      survivalTime: Math.round(survivalTime / 1000) + 's',
      level: finalData.level,
      kills: finalData.totalKills,
    });

    return session;
  }

  // ============= Real-time Tracking =============

  /**
   * Update metrics during game loop (call every frame)
   */
  update(
    deltaMs: number,
    currentData: {
      pnl: number;
      atr: number;
      difficulty: number;
      wavePhase: WavePhase;
      hpPercent: number;
      enemyCount: number;
    }
  ): void {
    // Skip if metrics disabled - zero performance impact
    if (!this.config.enabled) return;
    if (!this.state?.isActive) return;

    const now = Date.now();

    // Track wave phase time
    this.trackWavePhaseTime(currentData.wavePhase, deltaMs);

    // Track difficulty ranges
    this.trackDifficultyRanges(currentData.difficulty, deltaMs);

    // Track near-death activations
    if (currentData.hpPercent < 20 && currentData.hpPercent > 0) {
      // Near-death activated (one-time per low HP event)
      // We'll track this separately via events
    }

    // Track max enemies on screen
    if (currentData.enemyCount > this.state.maxEnemiesOnScreen) {
      this.state.maxEnemiesOnScreen = currentData.enemyCount;
    }

    // Track max/min PnL and difficulty
    if (currentData.pnl > this.state.maxPnL) {
      this.state.maxPnL = currentData.pnl;
    }
    if (currentData.pnl < this.state.minPnL) {
      this.state.minPnL = currentData.pnl;
    }
    if (currentData.difficulty > this.state.maxDifficulty) {
      this.state.maxDifficulty = currentData.difficulty;
    }

    // Sample PnL and difficulty periodically
    if (now - this.lastSampleTime >= this.config.sampling.intervalMs) {
      this.state.pnlHistory.push({ time: now, value: currentData.pnl });
      this.state.difficultyHistory.push({ time: now, value: currentData.difficulty });
      this.state.atrHistory.push({ time: now, value: currentData.atr });
      this.lastSampleTime = now;
    }

    this.state.lastUpdateTime = now;
  }

  /**
   * Track damage dealt
   */
  trackDamageDealt(amount: number, isCrit: boolean, isSuperCrit: boolean): void {
    if (!this.state?.isActive) return;

    this.state.totalDamageDealt += amount;
    if (isCrit) this.state.totalCrits++;
    if (isSuperCrit) this.state.totalSuperCrits++;
  }

  /**
   * Track damage taken
   */
  trackDamageTaken(amount: number): void {
    if (!this.state?.isActive) return;
    this.state.totalDamageTaken += amount;
  }

  /**
   * Track enemy kill
   */
  trackKill(enemyType: string, lifetime: number): void {
    if (!this.state?.isActive) return;

    this.state.killsByType[enemyType] = (this.state.killsByType[enemyType] ?? 0) + 1;
    this.state.enemyLifetimes.push(lifetime);
  }

  /**
   * Track enemy spawn
   */
  trackSpawn(): void {
    if (!this.state?.isActive) return;
    this.state.totalSpawns++;
  }

  /**
   * Track gem collected
   */
  trackGemCollected(value: number): void {
    if (!this.state?.isActive) return;
    this.state.totalGems++;
    this.state.totalExp += value;
  }

  /**
   * Track healing
   */
  trackHealing(amount: number): void {
    if (!this.state?.isActive) return;
    this.state.totalHealing += amount;
  }

  /**
   * Track bullet fired
   */
  trackBulletFired(): void {
    if (!this.state?.isActive) return;
    this.state.totalBullets++;
  }

  /**
   * Track level up
   */
  trackLevelUp(level: number, cardChosen: string, cardTier: string): void {
    if (!this.state?.isActive) return;

    const now = Date.now();
    const timeSinceLastLevelUp = now - this.state.lastLevelUpTime;

    this.state.levelUpTimes.push(timeSinceLastLevelUp);
    this.state.lastLevelUpTime = now;
    this.state.cardsChosen.push({
      card: cardChosen,
      tier: cardTier,
      level,
    });
  }

  /**
   * Track combo update
   */
  trackComboUpdate(streak: number, _multiplier: number): void {
    if (!this.state?.isActive) return;

    if (streak > this.state.maxStreak) {
      this.state.maxStreak = streak;
    }

    // Track combo duration
    if (streak === 1) {
      this.state.currentComboStartTime = Date.now();
    }
  }

  /**
   * Track combo milestone
   */
  trackComboMilestone(milestoneName: string): void {
    if (!this.state?.isActive) return;
    this.state.mileStonesReached.push(milestoneName);
  }

  /**
   * Track combo end
   */
  trackComboEnd(finalStreak: number, bonusXp: number): void {
    if (!this.state?.isActive) return;

    if (finalStreak > 0) {
      this.state.streakHistory.push(finalStreak);
      this.state.totalBonusXp += bonusXp;

      // Track combo duration
      const comboDuration = Date.now() - this.state.currentComboStartTime;
      if (comboDuration > this.state.longestComboTime) {
        this.state.longestComboTime = comboDuration;
      }

      // Check if this was a timeout
      // (combo ends are either timeouts or deaths)
      this.state.comboTimeouts++;
    }
  }

  /**
   * Track near-death activation
   */
  trackNearDeathActivation(): void {
    if (!this.state?.isActive) return;
    this.state.nearDeathActivations++;
  }

  // ============= Private Helpers =============

  private trackWavePhaseTime(phase: WavePhase, deltaMs: number): void {
    if (!this.state) return;

    this.state.wavePhaseTime[phase] += deltaMs;

    if (phase !== this.state.currentWavePhase) {
      this.state.currentWavePhase = phase;
      this.state.wavePhaseStartTime = Date.now();
    }
  }

  private trackDifficultyRanges(difficulty: number, deltaMs: number): void {
    if (!this.state) return;

    if (difficulty > 5) {
      this.state.highDifficultyTime += deltaMs;
    } else if (difficulty < 2) {
      this.state.lowDifficultyTime += deltaMs;
    }
  }

  // ============= Storage =============

  private loadFromStorage(): void {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const data = JSON.parse(stored);
        this.storedSessions = data.sessions ?? [];
        Logger.debug(`[Metrics] Loaded ${this.storedSessions.length} sessions from storage`);
      }
    } catch (error) {
      Logger.warn('[Metrics] Failed to load from storage', error);
      this.storedSessions = [];
    }
  }

  private saveToStorage(): void {
    try {
      const data = {
        version: METRICS_VERSION,
        sessions: this.storedSessions,
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (error) {
      // Check for QuotaExceededError
      if (this.isQuotaExceededError(error)) {
        Logger.warn('[Metrics] localStorage quota exceeded, removing old sessions...');
        this.handleQuotaExceeded();
      } else {
        Logger.error('[Metrics] Failed to save to storage', error);
      }
    }
  }

  /**
   * Check if error is a QuotaExceededError
   */
  private isQuotaExceededError(error: unknown): boolean {
    if (error instanceof DOMException) {
      // Use .name instead of deprecated .code property
      return (
        error.name === 'QuotaExceededError' || error.name === 'NS_ERROR_DOM_QUOTA_REACHED' // Firefox
      );
    }
    return false;
  }

  /**
   * Handle quota exceeded by removing old sessions
   */
  private handleQuotaExceeded(): void {
    const originalCount = this.storedSessions.length;

    // Remove oldest sessions (keep only half)
    const keepCount = Math.max(10, Math.floor(this.storedSessions.length / 2));
    this.storedSessions = this.storedSessions.slice(-keepCount);

    Logger.info(`[Metrics] Removed ${originalCount - keepCount} old sessions, kept ${keepCount}`);

    // Try to save again
    try {
      const data = {
        version: METRICS_VERSION,
        sessions: this.storedSessions,
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
      Logger.info('[Metrics] Successfully saved after cleanup');
    } catch (retryError) {
      // If still failing, remove all but last 5 sessions
      if (this.isQuotaExceededError(retryError)) {
        Logger.warn('[Metrics] Still exceeded quota, keeping only last 5 sessions');
        this.storedSessions = this.storedSessions.slice(-5);

        try {
          const data = {
            version: METRICS_VERSION,
            sessions: this.storedSessions,
          };
          localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
        } catch {
          // Give up - clear all
          Logger.error('[Metrics] Cannot save to localStorage, clearing all sessions');
          this.storedSessions = [];
          localStorage.removeItem(STORAGE_KEY);
        }
      } else {
        Logger.error('[Metrics] Unexpected error during retry', retryError);
      }
    }
  }

  private storeSession(session: SessionMetrics): void {
    this.storedSessions.push(session);

    // Limit stored sessions
    while (this.storedSessions.length > this.config.storage.maxLocalSessions) {
      this.storedSessions.shift();
    }

    this.saveToStorage();

    // Sync to Supabase (fire and forget)
    void this.syncSessionToSupabase(session);
  }

  /**
   * Sync session to Supabase for analytics and leaderboard
   */
  private async syncSessionToSupabase(session: SessionMetrics): Promise<void> {
    const { supabase, isSupabaseConfigured } = await import('./Supabase');
    const { UserSessionService } = await import('./auth/UserSessionService');

    if (!isSupabaseConfigured() || !supabase) {
      Logger.debug('[Metrics] Supabase not configured, skipping sync');
      return;
    }

    try {
      const playerId = UserSessionService.getPlayerId();
      const isAnonymous = playerId.startsWith('anon-');

      // 1. Insert game session with replay attack protection
      // session_id: Client-generated unique ID (prevents duplicate submissions)
      // session_timestamp: Game start time (UNIQUE with player_id)
      const { data: gameSession, error: sessionError } = await supabase
        .from('game_sessions')
        .insert({
          player_id: isAnonymous ? null : playerId,
          session_id: session.sessionId, // Unique client-generated ID for replay protection
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

      // Handle duplicate session error (replay attack protection)
      if (sessionError) {
        // PostgreSQL unique constraint violation code: 23505
        if (sessionError.code === '23505') {
          Logger.warn('[Metrics] Duplicate session detected - replay attack blocked', {
            sessionId: session.sessionId,
            playerId,
          });
          return; // Silently ignore duplicate - this is expected for replay attempts
        }
        throw sessionError;
      }

      Logger.info('[Metrics] Game session synced to Supabase');

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
          Logger.warn('[Metrics] Performance metrics sync failed', perfError);
        }
      }

      // 3. Update player stats (if not anonymous)
      if (!isAnonymous) {
        await this.updatePlayerStats(playerId, session);
      }
    } catch (err) {
      Logger.warn('[Metrics] Supabase sync failed', err);
    }
  }

  /**
   * Update player aggregate stats after game session
   */
  private async updatePlayerStats(playerId: string, session: SessionMetrics): Promise<void> {
    const { supabase } = await import('./Supabase');
    if (!supabase) return;

    try {
      const { data: player, error: fetchError } = await supabase
        .from('players')
        .select('high_score, total_kills, total_playtime_ms, best_pnl_percent')
        .eq('id', playerId)
        .single();

      if (fetchError) return;

      const newHighScore = Math.max(player.high_score, session.player.survivalTimeMs);
      const newTotalKills = player.total_kills + session.player.totalKills;
      const newTotalPlaytime = player.total_playtime_ms + session.player.survivalTimeMs;
      const pnl = session.bitcoin.pnlAtDeath;
      const newBestPnl = pnl > player.best_pnl_percent ? pnl : player.best_pnl_percent;

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
        Logger.warn('[Metrics] Player stats update failed', updateError);
      } else if (newHighScore > player.high_score) {
        Logger.info(`[Metrics] New high score! ${player.high_score} → ${newHighScore}`);
      }
    } catch (err) {
      Logger.warn('[Metrics] Player stats update error', err);
    }
  }

  // ============= Event Listeners =============

  private setupEventListeners(): void {
    this.eventUnsubscribers.push(
      EventBus.on('enemyKilled', data => {
        // We'll get lifetime from the combat system if available
        this.trackKill(data.type ?? 'unknown', 0);
        if (data.isCrit) {
          this.trackDamageDealt(0, true, false);
        }
      })
    );

    this.eventUnsubscribers.push(
      EventBus.on('gemCollected', data => {
        this.trackGemCollected(data.value);
      })
    );

    this.eventUnsubscribers.push(
      EventBus.on('playerHit', data => {
        this.trackDamageTaken(data.damage);
      })
    );

    this.eventUnsubscribers.push(
      EventBus.on('bulletFired', () => {
        this.trackBulletFired();
      })
    );

    this.eventUnsubscribers.push(
      EventBus.on('critHit', data => {
        this.trackDamageDealt(data.damage, true, data.isSuperCrit);
      })
    );

    this.eventUnsubscribers.push(
      EventBus.on('comboUpdate', data => {
        this.trackComboUpdate(data.killStreak, data.multiplier);
      })
    );

    this.eventUnsubscribers.push(
      EventBus.on('comboMilestone', data => {
        this.trackComboMilestone(data.name);
      })
    );

    this.eventUnsubscribers.push(
      EventBus.on('comboEnd', data => {
        this.trackComboEnd(data.finalStreak, data.bonusXp);
      })
    );
  }

  // ============= Export Functions =============
  // Delegated to MetricsExporter for cleaner separation of concerns

  /**
   * Export all sessions as JSON
   */
  exportAsJSON(): string {
    return MetricsExporter.toJSON(this.storedSessions);
  }

  /**
   * Export all sessions as CSV (summary format)
   */
  exportAsCSV(): string {
    return MetricsExporter.toCSV(this.storedSessions);
  }

  /**
   * Get stored sessions
   */
  getSessions(): SessionMetrics[] {
    return [...this.storedSessions];
  }

  /**
   * Get session count
   */
  getSessionCount(): number {
    return this.storedSessions.length;
  }

  /**
   * Clear all stored sessions
   */
  clearSessions(): void {
    this.storedSessions = [];
    this.saveToStorage();
    Logger.info('[Metrics] All sessions cleared');
  }

  // ============= Insights & Analysis =============
  // Delegated to MetricsAnalyzer for cleaner separation of concerns

  /**
   * Get comprehensive game insights
   */
  getInsights(): GameInsights {
    const analyzer = new MetricsAnalyzer(this.storedSessions);
    return analyzer.getInsights();
  }

  /**
   * Get Bitcoin-specific insights
   */
  getBitcoinInsights(): BitcoinInsights {
    const analyzer = new MetricsAnalyzer(this.storedSessions);
    return analyzer.getBitcoinInsights();
  }

  /**
   * Get difficulty-specific insights
   */
  getDifficultyInsights(): DifficultyInsights {
    const analyzer = new MetricsAnalyzer(this.storedSessions);
    return analyzer.getDifficultyInsights();
  }

  /**
   * Get player experience insights
   */
  getPlayerExperienceInsights(): PlayerExperienceInsights {
    const analyzer = new MetricsAnalyzer(this.storedSessions);
    return analyzer.getPlayerExperienceInsights();
  }

  /**
   * Generate improvement recommendations
   * Delegated to MetricsAnalyzer
   */
  generateRecommendations(): string[] {
    const analyzer = new MetricsAnalyzer(this.storedSessions);
    return analyzer.generateRecommendations();
  }

  // ============= Utility Functions =============

  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
  }

  // calculateCorrelation is now delegated to MetricsAnalyzer

  /**
   * Get current session state (for debugging)
   */
  getCurrentState(): MetricsState | null {
    return this.state;
  }

  /**
   * Check if a session is active
   */
  isSessionActive(): boolean {
    return this.state?.isActive ?? false;
  }

  /**
   * Check if metrics collection is enabled
   */
  isEnabled(): boolean {
    return this.config.enabled;
  }

  /**
   * Get current config (for debugging)
   */
  getConfig(): MetricsConfig {
    return { ...this.config };
  }

  /**
   * Reset for testing purposes
   */
  resetStateForTesting(): void {
    this.eventUnsubscribers.forEach(unsub => unsub());
    this.eventUnsubscribers = [];
    this.state = null;
    this.storedSessions = [];
    this.setupEventListeners();
  }
}

// Export singleton
export const MetricsService = MetricsServiceClass.getInstance();
