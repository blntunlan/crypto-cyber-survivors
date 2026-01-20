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
import { EventRecorderService } from './EventRecorderService';
import { InputLogger } from './InputLogger';
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
  createDefaultWavePhaseRecord,
} from '../types/metrics';

// Import modular components for external use
export { MetricsStorage } from './metrics/MetricsStorage';
export { MetricsCompiler } from './metrics/MetricsCompiler';
export { MetricsExporter } from './metrics/MetricsExporter';
export { MetricsAnalyzer } from './metrics/MetricsAnalyzer';

// Import modular components for internal delegation
import { MetricsStorage } from './metrics/MetricsStorage';
import { MetricsCompiler } from './metrics/MetricsCompiler';
import { MetricsAnalyzer } from './metrics/MetricsAnalyzer';
import { MetricsExporter } from './metrics/MetricsExporter';
import { METRICS } from '../constants';

/**
 * MetricsServiceClass - Orchestrates data collection and analysis.
 */
export class MetricsServiceClass {
  private static instance: MetricsServiceClass | null = null;
  private state: MetricsState | null = null;
  private lastSampleTime: number = 0;
  private eventUnsubscribers: Array<() => void> = [];
  private config: MetricsConfig;
  private storage: MetricsStorage;

  private constructor() {
    this.config = getMetricsConfig();
    this.storage = new MetricsStorage(this.config.storage.maxLocalSessions);

    if (this.config.enabled) {
      this.setupEventListeners();
      Logger.info('[Metrics] System initialized', { enabled: true });
    } else {
      Logger.info('[Metrics] System DISABLED by config');
    }
  }

  /**
   * Singleton accessor.
   */
  static getInstance(): MetricsServiceClass {
    return (MetricsServiceClass.instance ??= new MetricsServiceClass());
  }

  // ============= Session Management =============

  /**
   * Initializes a new tracking session with baseline metadata.
   *
   * @param position - Player's market stance (Long/Short)
   * @param entryPrice - BTC price at start
   * @param leverage - Current game multiplier
   * @param pair - Active crypto asset
   * @param serverSessionId - Optional session ID from server
   * @returns Generated session ID
   */
  public startSession(
    position: MarketPosition,
    entryPrice: number,
    leverage: number,
    pair: CryptoPair,
    serverSessionId?: string
  ): string {
    if (!this.config.enabled) {
      return '';
    }

    const sessionId = this.generateSessionId();
    const now = Date.now();

    this.state = {
      sessionId,
      serverSessionId, // Store server-side ID for syncing
      sessionStartTime: now,
      isActive: true,
      lastUpdateTime: now,
      pair,

      // History Tracking
      pnlHistory: [],
      difficultyHistory: [],
      atrHistory: [],
      currentWavePhase: 'warmup',
      wavePhaseStartTime: now,

      // Cumulative Counters
      totalDamageDealt: 0,
      totalDamageTaken: 0,
      totalHealing: 0,
      totalGems: 0,
      totalExp: 0,
      totalCrits: 0,
      totalSuperCrits: 0,
      totalBullets: 0,
      totalSpawns: 0,

      // Performance High-water Marks
      maxEnemiesOnScreen: 0,
      maxPnL: 0,
      minPnL: 0,
      maxDifficulty: 0,
      maxStreak: 0,

      // Categorical Breakdown
      wavePhaseTime: createDefaultWavePhaseRecord(),
      killsByType: {},
      enemyLifetimes: [],
      cardsChosen: [],
      levelUpTimes: [],
      lastLevelUpTime: now,

      // Health Metrics
      nearDeathActivations: 0,
      highDifficultyTime: 0,
      lowDifficultyTime: 0,

      // Engagement Timing
      streakHistory: [],
      comboTimeouts: 0,
      mileStonesReached: [],
      currentComboStartTime: 0,
      longestComboTime: 0,
      totalBonusXp: 0,
      enemyCountSamples: [],
      bulletCountSamples: [],
      particleCountSamples: [],
    };

    // Initial price snapshot
    this.state.pnlHistory.push({ time: now, value: 0 });

    // Start Input Logger
    InputLogger.getInstance().start();

    Logger.info(`[Metrics] Session started: ${sessionId}`, {
      position,
      entryPrice,
      leverage,
      serverSessionId,
    });

    return sessionId;
  }

  /**
   * Finalizes session data and compiles standard metrics report.
   */
  public endSession(
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
      maxFps?: number;
      fps_1_percentile?: number;
      fpsSamples?: number;
      avg_frame_time_ms?: number;
      max_frame_time_ms?: number;
      frameDrops?: number;
      memoryUsedMb?: number;
      memoryPeakMb?: number;
      enemyCountMax?: number;
      enemy_count_avg?: number;
      bullet_count_avg?: number;
      particle_count_avg?: number;
      optimizationProfile?: string;
      deviceFingerprint?: string;
      browser?: string;
      os?: string;
      pixelRatio?: number;
      gpuRenderer?: string;
    }
  ): SessionMetrics | null {
    if (!this.config.enabled) {
      return null;
    }

    if (!this.state?.isActive) {
      Logger.warn('[Metrics] No active session to end');
      return null;
    }

    const now = Date.now();
    const survivalTime = now - this.state.sessionStartTime;
    const survivalTimeMs = survivalTime;

    // 1. Get Replay Data
    const replayResult = EventRecorderService.endSession({
      finalLevel: finalData.level,
      totalKills: finalData.totalKills,
      totalDamageDealt: this.state.totalDamageDealt,
      totalDamageTaken: this.state.totalDamageTaken,
      exitPrice: finalData.price,
      pnlPercent: finalData.pnl,
      survivalTimeMs,
    });

    // Use MetricsCompiler for standardized report generation
    const session: SessionMetrics = {
      sessionId: this.state.sessionId,
      serverSessionId: this.state.serverSessionId,
      serverSigningKey: this.state.serverSigningKey,
      sessionTimestamp: this.state.sessionStartTime,
      gameEndReason: reason,
      pair: this.state.pair,

      bitcoin: MetricsCompiler.compileBitcoinMetrics(this.state, finalData),
      difficulty: MetricsCompiler.compileDifficultyMetrics(
        this.state,
        finalData.difficulty
      ),
      player: MetricsCompiler.compilePlayerMetrics(this.state, finalData, survivalTime),
      combo: MetricsCompiler.compileComboMetrics(this.state),
      card: MetricsCompiler.compileCardMetrics(this.state),
      enemy: MetricsCompiler.compileEnemyMetrics(this.state),
      inputLogs: InputLogger.getInstance().stop(),

      // Replay Data
      replayData: replayResult?.replayData,
      replayMetadata: replayResult?.metadata,

      performance:
        finalData.avgFps !== undefined
          ? MetricsCompiler.compilePerformanceMetrics({
              avgFps: finalData.avgFps,
              minFps: finalData.minFps ?? 0,
              maxFps: finalData.maxFps,
              fps_1_percentile: finalData.fps_1_percentile,
              fpsSamples: finalData.fpsSamples,
              avg_frame_time_ms: finalData.avg_frame_time_ms,
              max_frame_time_ms: finalData.max_frame_time_ms,
              frameDrops: finalData.frameDrops,
              memoryUsedMb: finalData.memoryUsedMb,
              memoryPeakMb: finalData.memoryPeakMb,
              enemyCountMax: finalData.enemyCountMax ?? this.state.maxEnemiesOnScreen,
              enemy_count_avg:
                finalData.enemy_count_avg ??
                (this.state.enemyCountSamples.length > 0
                  ? this.state.enemyCountSamples.reduce((a, b) => a + b, 0) /
                    this.state.enemyCountSamples.length
                  : 0),
              bullet_count_avg:
                finalData.bullet_count_avg ??
                (this.state.bulletCountSamples.length > 0
                  ? this.state.bulletCountSamples.reduce((a, b) => a + b, 0) /
                    this.state.bulletCountSamples.length
                  : 0),
              particle_count_avg:
                finalData.particle_count_avg ??
                (this.state.particleCountSamples.length > 0
                  ? this.state.particleCountSamples.reduce((a, b) => a + b, 0) /
                    this.state.particleCountSamples.length
                  : 0),
              optimizationProfile: finalData.optimizationProfile,
              deviceFingerprint: finalData.deviceFingerprint ?? '',
              browser: finalData.browser,
              os: finalData.os,
              pixelRatio: finalData.pixelRatio,
              gpuRenderer: finalData.gpuRenderer,
            })
          : undefined,
    };

    // Commit to persistent local storage
    this.storage.addSession(session);
    this.state.isActive = false;

    Logger.info(`[Metrics] Session ended: ${session.sessionId}`, {
      reason,
      duration: `${Math.round(survivalTime / 1000)}s`,
      level: finalData.level,
    });

    return session;
  }

  // ============= Real-time Tracking =============

  /**
   * Periodic update (every frame) to track dynamic states.
   */
  public update(
    deltaMs: number,
    pnl: number,
    difficulty: number,
    hpPercent: number,
    enemyCount: number,
    bulletCount: number,
    particleCount: number,
    wavePhase: WavePhase,
    atr: number
  ): void {
    if (!this.config.enabled || !this.state?.isActive) {
      return;
    }

    const now = Date.now();

    // 1. Contextual Time Tracking
    this.trackWavePhaseTime(wavePhase, deltaMs);
    this.trackDifficultyRanges(difficulty, deltaMs);

    // Track near-death activations (if not already triggered in current low-HP state)
    if (hpPercent < METRICS.NEAR_DEATH_HP_THRESHOLD && hpPercent > 0) {
      // NOTE: Actual counting is handled by trackNearDeathActivation() event
    }

    // 2. High-Water Mark Resolution
    if (enemyCount > this.state.maxEnemiesOnScreen) {
      this.state.maxEnemiesOnScreen = enemyCount;
    }

    if (pnl > this.state.maxPnL) {
      this.state.maxPnL = pnl;
    }
    if (pnl < this.state.minPnL) {
      this.state.minPnL = pnl;
    }
    if (difficulty > this.state.maxDifficulty) {
      this.state.maxDifficulty = difficulty;
    }

    // 3. Periodic Sampling (Prevents data bloat)
    if (now - this.lastSampleTime >= this.config.sampling.intervalMs) {
      this.state.pnlHistory.push({ time: now, value: pnl });
      this.state.difficultyHistory.push({ time: now, value: difficulty });
      this.state.atrHistory.push({ time: now, value: atr });
      this.state.enemyCountSamples.push(enemyCount);
      this.state.bulletCountSamples.push(bulletCount);
      this.state.particleCountSamples.push(particleCount);
      this.lastSampleTime = now;
    }

    this.state.lastUpdateTime = now;
  }

  /**
   * Increments damage metrics.
   */
  public trackDamageDealt(
    amount: number,
    isCrit: boolean,
    isSuperCrit: boolean,
    count: number = 1
  ): void {
    if (!this.state?.isActive) {
      return;
    }

    this.state.totalDamageDealt += amount;
    if (isCrit) {
      this.state.totalCrits += count;
    }
    if (isSuperCrit) {
      this.state.totalSuperCrits += count;
    }
  }

  /**
   * Track damage taken from all sources.
   */
  public trackDamageTaken(amount: number): void {
    if (!this.state?.isActive) {
      return;
    }
    this.state.totalDamageTaken += amount;
    InputLogger.getInstance().log('DAMAGE_TAKEN', { amount });
  }

  /**
   * Track specific enemy elimination metrics.
   */
  public trackKill(enemyType: string, lifetime: number): void {
    if (!this.state?.isActive) {
      return;
    }

    this.state.killsByType[enemyType] = (this.state.killsByType[enemyType] ?? 0) + 1;
    this.state.enemyLifetimes.push(lifetime);
  }

  /**
   * Increments spawn counters.
   */
  public trackSpawn(): void {
    if (!this.state?.isActive) {
      return;
    }
    this.state.totalSpawns++;
  }

  /**
   * Tracks progression resource collection.
   */
  public trackGemCollected(value: number): void {
    if (!this.state?.isActive) {
      return;
    }
    this.state.totalGems++;
    this.state.totalExp += value;
  }

  /**
   * Tracks health recovery.
   */
  public trackHealing(amount: number): void {
    if (!this.state?.isActive) {
      return;
    }
    this.state.totalHealing += amount;
  }

  /**
   * Performance monitoring for bullet load.
   */
  public trackBulletFired(): void {
    if (!this.state?.isActive) {
      return;
    }
    this.state.totalBullets++;
  }

  /**
   * Tracks player progression speed.
   */
  public trackLevelUp(level: number, cardChosen: string, cardTier: string): void {
    if (!this.state?.isActive) {
      return;
    }

    const now = Date.now();
    const timeSinceLastLevelUp = now - this.state.lastLevelUpTime;

    this.state.levelUpTimes.push(timeSinceLastLevelUp);
    this.state.lastLevelUpTime = now;
    this.state.cardsChosen.push({
      card: cardChosen,
      tier: cardTier,
      level,
    });
    InputLogger.getInstance().log('LEVEL_UP', {
      level,
      card: cardChosen,
      tier: cardTier,
    });
  }

  /**
   * Tracks combo build momentum.
   */
  public trackComboUpdate(streak: number, _multiplier: number): void {
    if (!this.state?.isActive) {
      return;
    }

    if (streak > this.state.maxStreak) {
      this.state.maxStreak = streak;
    }

    if (streak === 1) {
      this.state.currentComboStartTime = Date.now();
    }
  }

  /**
   * Records achievement milestones.
   */
  public trackComboMilestone(milestoneName: string): void {
    if (!this.state?.isActive) {
      return;
    }
    this.state.mileStonesReached.push(milestoneName);
  }

  /**
   * Finalizes combo metrics on break.
   */
  public trackComboEnd(finalStreak: number, bonusXp: number): void {
    if (!this.state?.isActive) {
      return;
    }

    if (finalStreak > 0) {
      this.state.streakHistory.push(finalStreak);
      this.state.totalBonusXp += bonusXp;

      const comboDuration = Date.now() - this.state.currentComboStartTime;
      if (comboDuration > this.state.longestComboTime) {
        this.state.longestComboTime = comboDuration;
      }

      this.state.comboTimeouts++;
    }
  }

  /**
   * Tracks emergency survival mechanics.
   */
  public trackNearDeathActivation(): void {
    if (!this.state?.isActive) {
      return;
    }
    this.state.nearDeathActivations++;
    InputLogger.getInstance().log('NEAR_DEATH', {});
  }

  // ============= Private Helpers =============

  private trackWavePhaseTime(phase: WavePhase, deltaMs: number): void {
    if (!this.state) {
      return;
    }

    const currentTime = this.state.wavePhaseTime[phase] ?? 0;
    this.state.wavePhaseTime[phase] = currentTime + deltaMs;

    if (phase !== this.state.currentWavePhase) {
      this.state.currentWavePhase = phase;
      this.state.wavePhaseStartTime = Date.now();
    }
  }

  private trackDifficultyRanges(difficulty: number, deltaMs: number): void {
    if (!this.state) {
      return;
    }

    if (difficulty > METRICS.HIGH_DIFFICULTY_THRESHOLD) {
      this.state.highDifficultyTime += deltaMs;
    } else if (difficulty < METRICS.LOW_DIFFICULTY_THRESHOLD) {
      this.state.lowDifficultyTime += deltaMs;
    }
  }

  // ============= Export Functions =============

  /**
   * Export all sessions as JSON.
   */
  public exportAsJSON(): string {
    return MetricsExporter.toJSON(this.storage.getSessions());
  }

  /**
   * Export summary statistics as CSV.
   */
  public exportAsCSV(): string {
    return MetricsExporter.toCSV(this.storage.getSessions());
  }

  /**
   * Retrieves all historically stored sessions.
   */
  public getSessions(): SessionMetrics[] {
    return this.storage.getSessions();
  }

  /**
   * Total persistent session count.
   */
  public getSessionCount(): number {
    return this.storage.getCount();
  }

  /**
   * Purges local metrics history.
   */
  public clearSessions(): void {
    this.storage.clear();
  }

  // ============= Insights & Analysis =============

  /**
   * Generates comprehensive game-wide insights.
   */
  public getInsights(): GameInsights {
    const analyzer = new MetricsAnalyzer(this.storage.getSessions());
    return analyzer.getInsights();
  }

  /**
   * Correlation between BTC action and player performance.
   */
  public getBitcoinInsights(): BitcoinInsights {
    const analyzer = new MetricsAnalyzer(this.storage.getSessions());
    return analyzer.getBitcoinInsights();
  }

  /**
   * Balance analytics for game difficulty.
   */
  public getDifficultyInsights(): DifficultyInsights {
    const analyzer = new MetricsAnalyzer(this.storage.getSessions());
    return analyzer.getDifficultyInsights();
  }

  /**
   * Qualitative analysis of the player journey.
   */
  public getPlayerExperienceInsights(): PlayerExperienceInsights {
    const analyzer = new MetricsAnalyzer(this.storage.getSessions());
    return analyzer.getPlayerExperienceInsights();
  }

  /**
   * Procedural recommendations based on metric trends.
   */
  public generateRecommendations(): string[] {
    const analyzer = new MetricsAnalyzer(this.storage.getSessions());
    return analyzer.generateRecommendations();
  }

  // ============= Utility Functions =============

  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
  }

  /**
   * Retrieves current session raw state.
   */
  public getCurrentState(): MetricsState | null {
    return this.state;
  }

  /**
   * State check for active collection.
   */
  public isSessionActive(): boolean {
    return this.state?.isActive ?? false;
  }

  /**
   * Master configuration switch check.
   */
  public isEnabled(): boolean {
    return this.config.enabled;
  }

  /**
   * Retrieves active configuration.
   */
  public getConfig(): MetricsConfig {
    return { ...this.config };
  }

  /**
   * Destructive reset for testing.
   */
  public resetStateForTesting(): void {
    this.eventUnsubscribers.forEach(unsub => unsub());
    this.eventUnsubscribers = [];
    this.state = null;
    this.storage.clear();
    this.setupEventListeners();
  }

  private setupEventListeners(): void {
    this.eventUnsubscribers.push(
      EventBus.on('enemyKilled', data => {
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
        this.trackDamageDealt(data.damage, true, data.isSuperCrit, data.count ?? 1);
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
        InputLogger.getInstance().log('COMBO_MILESTONE', { name: data.name });
      })
    );

    this.eventUnsubscribers.push(
      EventBus.on('comboEnd', data => {
        this.trackComboEnd(data.finalStreak, data.bonusXp);
        InputLogger.getInstance().log('COMBO_END', {
          streak: data.finalStreak,
          xp: data.bonusXp,
        });
      })
    );
  }
}

// Export singleton
export const MetricsService = MetricsServiceClass.getInstance();
