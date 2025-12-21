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
import { MarketPosition } from '../types';
import { type CryptoPair } from '../types/crypto';
import { getMetricsConfig, type MetricsConfig } from '../config/MetricsConfig';
import {
  type MetricsState,
  type SessionMetrics,
  type GameEndReason,
  type WavePhase,
  type MetricsExport,
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

// Import MetricsCompiler for internal use
import { MetricsCompiler } from './metrics/MetricsCompiler';

const METRICS_VERSION = '1.0.0';
const STORAGE_KEY = 'crypto_survivors_metrics';

class MetricsServiceClass {
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
      // Most browsers
      return (
        error.code === 22 || // Legacy code
        error.name === 'QuotaExceededError' ||
        error.name === 'NS_ERROR_DOM_QUOTA_REACHED' // Firefox
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

  /**
   * Export all sessions as JSON
   */
  exportAsJSON(): string {
    const exportData: MetricsExport = {
      version: METRICS_VERSION,
      exportDate: new Date().toISOString(),
      totalSessions: this.storedSessions.length,
      sessions: this.storedSessions,
    };
    return JSON.stringify(exportData, null, 2);
  }

  /**
   * Export all sessions as CSV (summary format)
   */
  exportAsCSV(): string {
    const headers = [
      'Session ID',
      'Date',
      'Position',
      'Survival Time (s)',
      'Max Level',
      'Total Kills',
      'Entry Price',
      'Exit Price',
      'PnL at Death (%)',
      'Avg Difficulty',
      'Max Difficulty',
      'Max Streak',
      'Cards Picked',
    ];

    const rows = this.storedSessions.map(s => [
      s.sessionId,
      new Date(s.sessionTimestamp).toISOString(),
      s.bitcoin.positionChosen,
      Math.round(s.player.survivalTimeMs / 1000),
      s.player.maxLevel,
      s.player.totalKills,
      s.bitcoin.priceAtStart.toFixed(2),
      s.bitcoin.priceAtEnd.toFixed(2),
      (s.bitcoin.pnlAtDeath * 100).toFixed(2),
      s.difficulty.averageDifficulty.toFixed(2),
      s.difficulty.maxDifficulty.toFixed(2),
      s.combo.maxStreak,
      s.card.levelUpCount,
    ]);

    return [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
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

  /**
   * Get comprehensive game insights
   */
  getInsights(): GameInsights {
    return {
      bitcoin: this.getBitcoinInsights(),
      difficulty: this.getDifficultyInsights(),
      playerExperience: this.getPlayerExperienceInsights(),
      recommendations: this.generateRecommendations(),
    };
  }

  /**
   * Get Bitcoin-specific insights
   */
  getBitcoinInsights(): BitcoinInsights {
    const sessions = this.storedSessions;

    // Position success rate
    const positionStats: Record<
      MarketPosition,
      { totalSurvival: number; totalLevel: number; count: number }
    > = {
      [MarketPosition.LONG]: { totalSurvival: 0, totalLevel: 0, count: 0 },
      [MarketPosition.SHORT]: { totalSurvival: 0, totalLevel: 0, count: 0 },
    };

    for (const s of sessions) {
      const pos = s.bitcoin.positionChosen;
      positionStats[pos].totalSurvival += s.player.survivalTimeMs;
      positionStats[pos].totalLevel += s.player.maxLevel;
      positionStats[pos].count++;
    }

    // Survival by PnL ranges
    const pnlRanges = [
      { min: -Infinity, max: -0.1, label: '< -10%' },
      { min: -0.1, max: -0.05, label: '-10% to -5%' },
      { min: -0.05, max: 0, label: '-5% to 0%' },
      { min: 0, max: 0.05, label: '0% to 5%' },
      { min: 0.05, max: 0.1, label: '5% to 10%' },
      { min: 0.1, max: Infinity, label: '> 10%' },
    ];

    const survivalByPnL = pnlRanges.map(range => {
      const matching = sessions.filter(
        s => s.bitcoin.pnlAtDeath >= range.min && s.bitcoin.pnlAtDeath < range.max
      );
      return {
        pnlRange: range.label,
        avgSurvival:
          matching.length > 0
            ? matching.reduce((a, b) => a + b.player.survivalTimeMs, 0) / matching.length / 1000
            : 0,
        avgLevel:
          matching.length > 0
            ? matching.reduce((a, b) => a + b.player.maxLevel, 0) / matching.length
            : 0,
        count: matching.length,
      };
    });

    // Volatility impact
    const lowVol = sessions.filter(s => s.bitcoin.volatilityScore < 0.01);
    const medVol = sessions.filter(
      s => s.bitcoin.volatilityScore >= 0.01 && s.bitcoin.volatilityScore < 0.02
    );
    const highVol = sessions.filter(s => s.bitcoin.volatilityScore >= 0.02);

    const calcAvg = (arr: SessionMetrics[]) => ({
      avgSurvival:
        arr.length > 0
          ? arr.reduce((a, b) => a + b.player.survivalTimeMs, 0) / arr.length / 1000
          : 0,
      avgLevel: arr.length > 0 ? arr.reduce((a, b) => a + b.player.maxLevel, 0) / arr.length : 0,
      count: arr.length,
    });

    // PnL-Difficulty correlation
    let pnlDiffCorrelation = 0;
    if (sessions.length > 0) {
      const pnlValues = sessions.map(s => s.bitcoin.averagePnL);
      const diffValues = sessions.map(s => s.difficulty.averageDifficulty);
      pnlDiffCorrelation = this.calculateCorrelation(pnlValues, diffValues);
    }

    return {
      positionSuccessRate: {
        [MarketPosition.LONG]: {
          avgSurvival:
            positionStats[MarketPosition.LONG].count > 0
              ? positionStats[MarketPosition.LONG].totalSurvival /
                positionStats[MarketPosition.LONG].count /
                1000
              : 0,
          avgLevel:
            positionStats[MarketPosition.LONG].count > 0
              ? positionStats[MarketPosition.LONG].totalLevel /
                positionStats[MarketPosition.LONG].count
              : 0,
          gamesPlayed: positionStats[MarketPosition.LONG].count,
        },
        [MarketPosition.SHORT]: {
          avgSurvival:
            positionStats[MarketPosition.SHORT].count > 0
              ? positionStats[MarketPosition.SHORT].totalSurvival /
                positionStats[MarketPosition.SHORT].count /
                1000
              : 0,
          avgLevel:
            positionStats[MarketPosition.SHORT].count > 0
              ? positionStats[MarketPosition.SHORT].totalLevel /
                positionStats[MarketPosition.SHORT].count
              : 0,
          gamesPlayed: positionStats[MarketPosition.SHORT].count,
        },
      },
      survivalByPnL,
      volatilityImpact: {
        lowVolatility: calcAvg(lowVol),
        mediumVolatility: calcAvg(medVol),
        highVolatility: calcAvg(highVol),
      },
      pnlDifficultyCorrelation: pnlDiffCorrelation,
    };
  }

  /**
   * Get difficulty-specific insights
   */
  getDifficultyInsights(): DifficultyInsights {
    const sessions = this.storedSessions;

    // Deaths by difficulty range
    const diffRanges = [
      { min: 0, max: 2, label: '0-2 (Easy)' },
      { min: 2, max: 4, label: '2-4 (Medium)' },
      { min: 4, max: 6, label: '4-6 (Hard)' },
      { min: 6, max: 8, label: '6-8 (Extreme)' },
    ];

    const deathsByDifficultyRange: Record<string, number> = {};
    for (const range of diffRanges) {
      deathsByDifficultyRange[range.label] = sessions.filter(
        s =>
          s.difficulty.difficultyAtDeath >= range.min && s.difficulty.difficultyAtDeath < range.max
      ).length;
    }

    // Near-death usage
    const totalActivations = sessions.reduce((a, b) => a + b.difficulty.nearDeathActivations, 0);

    // Wave phase stats
    const wavePhaseStats: Record<WavePhase, { avgTime: number; deathRate: number }> = {
      calm: { avgTime: 0, deathRate: 0 },
      building: { avgTime: 0, deathRate: 0 },
      intense: { avgTime: 0, deathRate: 0 },
      peak: { avgTime: 0, deathRate: 0 },
    };

    for (const phase of ['calm', 'building', 'intense', 'peak'] as WavePhase[]) {
      const times = sessions.map(s => s.difficulty.timeInEachWavePhase[phase]);
      wavePhaseStats[phase].avgTime =
        times.length > 0 ? times.reduce((a, b) => a + b, 0) / times.length / 1000 : 0;
    }

    // Optimal difficulty range (where survival is highest)
    let optimalRange = { min: 2, max: 4, avgSurvival: 0 };
    for (const range of diffRanges) {
      const matching = sessions.filter(
        s =>
          s.difficulty.averageDifficulty >= range.min && s.difficulty.averageDifficulty < range.max
      );
      if (matching.length > 0) {
        const avgSurvival =
          matching.reduce((a, b) => a + b.player.survivalTimeMs, 0) / matching.length / 1000;
        if (avgSurvival > optimalRange.avgSurvival) {
          optimalRange = {
            min: range.min,
            max: range.max,
            avgSurvival,
          };
        }
      }
    }

    return {
      deathsByDifficultyRange,
      nearDeathUsage: {
        totalActivations,
        avgPerGame: sessions.length > 0 ? totalActivations / sessions.length : 0,
        survivalRateAfter: 0, // Would need more tracking
      },
      wavePhaseStats,
      optimalDifficultyRange: optimalRange,
    };
  }

  /**
   * Get player experience insights
   */
  getPlayerExperienceInsights(): PlayerExperienceInsights {
    const sessions = this.storedSessions;

    // Average and median game duration
    const durations = sessions.map(s => s.player.survivalTimeMs / 1000);
    const avgDuration =
      durations.length > 0 ? durations.reduce((a, b) => a + b, 0) / durations.length : 0;
    const sortedDurations = [...durations].sort((a, b) => a - b);
    const medianDuration =
      sortedDurations.length > 0
        ? (sortedDurations[Math.floor(sortedDurations.length / 2)] ?? 0)
        : 0;

    // Deaths by level
    const deathsByLevel: Record<number, number> = {};
    for (const s of sessions) {
      deathsByLevel[s.player.maxLevel] = (deathsByLevel[s.player.maxLevel] ?? 0) + 1;
    }

    // Card popularity
    const cardCounts: Record<string, { count: number; tier: string }> = {};
    for (const s of sessions) {
      for (const card of s.card.cardsChosen) {
        if (!cardCounts[card.card]) {
          cardCounts[card.card] = { count: 0, tier: card.tier };
        }
        const cardCount = cardCounts[card.card];
        if (cardCount) {
          cardCount.count++;
        }
      }
    }
    const totalCardPicks = Object.values(cardCounts).reduce((a, b) => a + b.count, 0);
    const cardPopularity = Object.entries(cardCounts)
      .map(([card, data]) => ({
        card,
        tier: data.tier,
        pickRate: totalCardPicks > 0 ? data.count / totalCardPicks : 0,
        winRateImpact: 0, // Would need win tracking
      }))
      .sort((a, b) => b.pickRate - a.pickRate);

    // Combo engagement
    const avgMaxStreak =
      sessions.length > 0
        ? sessions.reduce((a, b) => a + b.combo.maxStreak, 0) / sessions.length
        : 0;
    const avgMilestones =
      sessions.length > 0
        ? sessions.reduce((a, b) => a + b.combo.milestonesReached.length, 0) / sessions.length
        : 0;
    const avgBonusXp =
      sessions.length > 0
        ? sessions.reduce((a, b) => a + b.combo.totalBonusXp, 0) / sessions.length
        : 0;

    // Progression speed
    const avgLevelsPerMinute =
      avgDuration > 0
        ? sessions.reduce((a, b) => a + b.player.maxLevel, 0) / sessions.length / (avgDuration / 60)
        : 0;
    const avgKillsPerLevel =
      sessions.reduce((a, b) => a + b.player.maxLevel, 0) > 0
        ? sessions.reduce((a, b) => a + b.player.totalKills, 0) /
          sessions.reduce((a, b) => a + b.player.maxLevel, 0)
        : 0;

    return {
      averageGameDuration: avgDuration,
      medianGameDuration: medianDuration,
      deathsByLevel,
      cardPopularity,
      comboEngagement: {
        averageMaxStreak: avgMaxStreak,
        milestonesPerGame: avgMilestones,
        bonusXpPerGame: avgBonusXp,
      },
      progressionSpeed: {
        avgLevelsPerMinute,
        avgKillsPerLevel,
      },
    };
  }

  /**
   * Generate improvement recommendations
   */
  private generateRecommendations(): string[] {
    const recommendations: string[] = [];
    const sessions = this.storedSessions;

    if (sessions.length < 5) {
      recommendations.push('Daha fazla oyun verisi topla (en az 5 oturum önerilir)');
      return recommendations;
    }

    const insights = {
      bitcoin: this.getBitcoinInsights(),
      difficulty: this.getDifficultyInsights(),
      player: this.getPlayerExperienceInsights(),
    };

    // Bitcoin balance
    const longSuccess = insights.bitcoin.positionSuccessRate[MarketPosition.LONG];
    const shortSuccess = insights.bitcoin.positionSuccessRate[MarketPosition.SHORT];
    if (
      longSuccess.gamesPlayed > 3 &&
      shortSuccess.gamesPlayed > 3 &&
      Math.abs(longSuccess.avgSurvival - shortSuccess.avgSurvival) > 30
    ) {
      const better = longSuccess.avgSurvival > shortSuccess.avgSurvival ? 'LONG' : 'SHORT';
      recommendations.push(`${better} pozisyon önemli ölçüde daha kolay. Dengeyi kontrol et.`);
    }

    // Difficulty balance
    const deathsInExtreme = insights.difficulty.deathsByDifficultyRange['6-8 (Extreme)'] ?? 0;
    const totalDeaths = Object.values(insights.difficulty.deathsByDifficultyRange).reduce(
      (a, b) => a + b,
      0
    );
    if (totalDeaths > 0 && deathsInExtreme / totalDeaths > 0.5) {
      recommendations.push('Çoğu ölüm aşırı zorlukta gerçekleşiyor. Max zorluğu azaltmayı düşün.');
    }

    // Game duration
    if (insights.player.averageGameDuration < 60) {
      recommendations.push('Ortalama oyun süresi çok kısa (< 1 dk). Erken oyun zorluğunu azalt.');
    }
    if (insights.player.averageGameDuration > 600) {
      recommendations.push('Ortalama oyun süresi çok uzun (> 10 dk). Geç oyun zorluğunu artır.');
    }

    // Near-death usage
    if (insights.difficulty.nearDeathUsage.avgPerGame < 0.5) {
      recommendations.push(
        'Near-death mercy sistemi nadiren kullanılıyor. Eşiği yükseltmeyi düşün.'
      );
    }

    // Combo engagement
    if (insights.player.comboEngagement.averageMaxStreak < 5) {
      recommendations.push('Combo sistemi yeterince kullanılmıyor. Ödülleri artırmayı düşün.');
    }

    // PnL-Difficulty correlation
    if (Math.abs(insights.bitcoin.pnlDifficultyCorrelation) < 0.3) {
      recommendations.push(
        'Bitcoin fiyatının zorluk üzerinde etkisi düşük. PnL faktörünü güçlendir.'
      );
    }

    return recommendations;
  }

  // ============= Utility Functions =============

  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
  }

  private calculateCorrelation(x: number[], y: number[]): number {
    if (x.length !== y.length || x.length === 0) return 0;

    const n = x.length;
    const sumX = x.reduce((a, b) => a + b, 0);
    const sumY = y.reduce((a, b) => a + b, 0);
    const sumXY = x.reduce((total, xi, i) => total + xi * (y[i] ?? 0), 0);
    const sumX2 = x.reduce((total, xi) => total + xi * xi, 0);
    const sumY2 = y.reduce((total, yi) => total + yi * yi, 0);

    const numerator = n * sumXY - sumX * sumY;
    const denominator = Math.sqrt((n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY));

    return denominator !== 0 ? numerator / denominator : 0;
  }

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
}

// Export singleton
export const MetricsService = MetricsServiceClass.getInstance();
