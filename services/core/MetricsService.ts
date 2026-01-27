/**
 * MetricsService - Comprehensive Game Analytics System
 */

import { EventBus } from './EventBus';
import { Logger } from '../system/Logger';
import { type MarketPosition } from '../../types';
import { type CryptoPair } from '../../types/crypto';
import { TimeService } from './TimeService';
import { EventRecorderService } from './EventRecorderService';
import { InputLogger } from '../system/InputLogger';
import { getMetricsConfig, type MetricsConfig } from '../../config/MetricsConfig';
import {
  type MetricsState,
  type SessionMetrics,
  type GameEndReason,
  type WavePhase,
  type GameInsights,
  createDefaultWavePhaseRecord,
} from '../../types/metrics';

// Import modular components
import { MetricsStorage } from './metrics/MetricsStorage';
import { MetricsCompiler } from './metrics/MetricsCompiler';
import { MetricsAnalyzer } from './metrics/MetricsAnalyzer';
import { MetricsExporter } from './metrics/MetricsExporter';
import { METRICS } from '../../constants';
import { type PlayerFinalData, type BitcoinFinalData } from './metrics/MetricsCompiler';

/**
 * Interface for session end data
 */
export interface SessionEndData extends PlayerFinalData, BitcoinFinalData {
  difficulty: number;
  avgFps?: number;
  minFps?: number;
  maxFps?: number;
  fps_1_percentile?: number;
  fpsSamples?: number;
  deviceFingerprint: string;
  browser?: string;
  os?: string;
  pixelRatio?: number;
  enemyCountMax?: number;
  enemy_count_avg?: number;
  bullet_count_avg?: number;
  particle_count_avg?: number;
  avg_frame_time_ms?: number;
  max_frame_time_ms?: number;
  frameDrops?: number;
  memoryUsedMb?: number;
  memoryPeakMb?: number;
  optimizationProfile?: string;
  gpuRenderer?: string;
  [key: string]: unknown;
}

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
    }
  }

  static getInstance(): MetricsServiceClass {
    return (MetricsServiceClass.instance ??= new MetricsServiceClass());
  }

  public startSession(
    position: MarketPosition,
    entryPrice: number,
    leverage: number,
    pair: CryptoPair,
    serverSessionId?: string,
    serverSigningKey?: string
  ): string {
    if (!this.config.enabled) return '';
    const sessionId = `session_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
    const now = Date.now();

    this.state = {
      sessionId,
      serverSessionId,
      serverSigningKey,
      sessionStartTime: now,
      isActive: true,
      lastUpdateTime: now,
      pair,
      position,
      entryPrice,
      leverage,
      pnlHistory: [],
      difficultyHistory: [],
      atrHistory: [],
      currentWavePhase: 'warmup',
      wavePhaseStartTime: now,
      totalDamageDealt: 0,
      totalDamageTaken: 0,
      totalHealing: 0,
      totalGems: 0,
      totalExp: 0,
      totalCrits: 0,
      totalSuperCrits: 0,
      totalBullets: 0,
      totalSpawns: 0,
      maxEnemiesOnScreen: 0,
      maxPnL: 0,
      minPnL: 0,
      maxDifficulty: 0,
      maxStreak: 0,
      wavePhaseTime: createDefaultWavePhaseRecord(),
      killsByType: {},
      enemyLifetimes: [],
      cardsChosen: [],
      levelUpTimes: [],
      lastLevelUpTime: now,
      nearDeathActivations: 0,
      highDifficultyTime: 0,
      lowDifficultyTime: 0,
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

    this.state.pnlHistory.push({ time: now, value: 0 });
    InputLogger.getInstance().start();
    Logger.info(`[Metrics] Session started: ${sessionId}`, {
      pair,
      position,
      entryPrice,
      leverage,
    });
    return sessionId;
  }

  public endSession(
    reason: GameEndReason,
    finalData: SessionEndData
  ): SessionMetrics | null {
    if (!this.config.enabled || !this.state?.isActive) return null;
    const survivalTimeMs = TimeService.getGameTime();

    const replayResult = EventRecorderService.endSession({
      finalLevel: finalData.level,
      totalKills: finalData.totalKills,
      totalDamageDealt: this.state.totalDamageDealt,
      totalDamageTaken: this.state.totalDamageTaken,
      exitPrice: finalData.price,
      pnlPercent: finalData.pnl,
      survivalTimeMs,
    });

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
      player: MetricsCompiler.compilePlayerMetrics(
        this.state,
        finalData,
        survivalTimeMs
      ),
      combo: MetricsCompiler.compileComboMetrics(this.state),
      card: MetricsCompiler.compileCardMetrics(this.state),
      enemy: MetricsCompiler.compileEnemyMetrics(this.state),
      inputLogs: InputLogger.getInstance().stop(),
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
              deviceFingerprint: finalData.deviceFingerprint,
              browser: finalData.browser,
              os: finalData.os,
              pixelRatio: finalData.pixelRatio,
              gpuRenderer: finalData.gpuRenderer,
              optimizationProfile: finalData.optimizationProfile,
              enemyCountMax: finalData.enemyCountMax ?? this.state.maxEnemiesOnScreen,
              enemy_count_avg:
                finalData.enemy_count_avg ??
                (this.state.enemyCountSamples.reduce((a, b) => a + b, 0) /
                  this.state.enemyCountSamples.length ||
                  0),
              bullet_count_avg:
                finalData.bullet_count_avg ??
                (this.state.bulletCountSamples.reduce((a, b) => a + b, 0) /
                  this.state.bulletCountSamples.length ||
                  0),
              particle_count_avg:
                finalData.particle_count_avg ??
                (this.state.particleCountSamples.reduce((a, b) => a + b, 0) /
                  this.state.particleCountSamples.length ||
                  0),
            })
          : undefined,
    };

    this.storage.addSession(session);
    this.state.isActive = false;
    Logger.info(`[Metrics] Session ended: ${session.sessionId}`, {
      reason,
      survivalTimeMs,
      totalKills: finalData.totalKills,
    });
    return session;
  }

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
    // Use hpPercent for future healing/health analytics if needed
    // For now we just acknowledge it to avoid unused variable warning
    void hpPercent;
    this.trackWavePhaseTime(wavePhase, deltaMs);
    this.trackDifficultyRanges(difficulty, deltaMs);
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

  public trackDamageDealt(
    amount: number,
    isCrit: boolean,
    isSuperCrit: boolean,
    count: number = 1
  ): void {
    if (!this.state?.isActive) return;
    this.state.totalDamageDealt += amount;
    if (isCrit) {
      this.state.totalCrits += count;
    }
    if (isSuperCrit) {
      this.state.totalSuperCrits += count;
    }
  }

  public trackDamageTaken(amount: number): void {
    if (!this.state?.isActive) return;
    this.state.totalDamageTaken += amount;
    InputLogger.getInstance().log('DAMAGE_TAKEN', { amount });
  }

  public trackKill(enemyType: string, lifetime: number): void {
    if (!this.state?.isActive) return;
    this.state.killsByType[enemyType] = (this.state.killsByType[enemyType] ?? 0) + 1;
    this.state.enemyLifetimes.push(lifetime);
  }

  public trackSpawn(): void {
    if (!this.state?.isActive) return;
    this.state.totalSpawns++;
  }

  public trackGemCollected(value: number): void {
    if (!this.state?.isActive) return;
    this.state.totalGems++;
    this.state.totalExp += value;
  }

  public trackHealing(amount: number): void {
    if (!this.state?.isActive) return;
    this.state.totalHealing += amount;
  }

  public trackBulletFired(): void {
    if (!this.state?.isActive) return;
    this.state.totalBullets++;
  }

  public trackLevelUp(level: number, cardChosen: string, cardTier: string): void {
    if (!this.state?.isActive) return;
    const now = Date.now();
    this.state.levelUpTimes.push(now - this.state.lastLevelUpTime);
    this.state.lastLevelUpTime = now;
    this.state.cardsChosen.push({ card: cardChosen, tier: cardTier, level });
    InputLogger.getInstance().log('LEVEL_UP', {
      level,
      card: cardChosen,
      tier: cardTier,
    });
  }

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

  public trackComboMilestone(milestoneName: string): void {
    if (!this.state?.isActive) return;
    this.state.mileStonesReached.push(milestoneName);
  }

  public trackComboEnd(finalStreak: number, bonusXp: number): void {
    if (!this.state?.isActive) return;
    if (finalStreak > 0) {
      this.state.streakHistory.push(finalStreak);
      this.state.totalBonusXp += bonusXp;
      const duration = Date.now() - this.state.currentComboStartTime;
      if (duration > this.state.longestComboTime) {
        this.state.longestComboTime = duration;
      }
      this.state.comboTimeouts++;
    }
  }

  public trackNearDeathActivation(): void {
    if (!this.state?.isActive) return;
    this.state.nearDeathActivations++;
    InputLogger.getInstance().log('NEAR_DEATH', {});
  }

  private trackWavePhaseTime(phase: WavePhase, deltaMs: number): void {
    if (!this.state) return;
    this.state.wavePhaseTime[phase] = (this.state.wavePhaseTime[phase] ?? 0) + deltaMs;
    if (phase !== this.state.currentWavePhase) {
      this.state.currentWavePhase = phase;
      this.state.wavePhaseStartTime = Date.now();
    }
  }

  private trackDifficultyRanges(difficulty: number, deltaMs: number): void {
    if (!this.state) return;
    if (difficulty > METRICS.HIGH_DIFFICULTY_THRESHOLD) {
      this.state.highDifficultyTime += deltaMs;
    } else if (difficulty < METRICS.LOW_DIFFICULTY_THRESHOLD) {
      this.state.lowDifficultyTime += deltaMs;
    }
  }

  public getSessions(): SessionMetrics[] {
    return this.storage.getSessions();
  }
  public getSessionCount(): number {
    return this.storage.getCount();
  }
  public clearSessions(): void {
    this.storage.clear();
  }
  public getInsights(): GameInsights {
    return new MetricsAnalyzer(this.storage.getSessions()).getInsights();
  }
  public isSessionActive(): boolean {
    return this.state?.isActive ?? false;
  }
  public isEnabled(): boolean {
    return this.config.enabled;
  }
  public getConfig(): MetricsConfig {
    return this.config;
  }
  public getCurrentState() {
    return this.state ? { ...this.state } : null;
  }
  public exportAsJSON(): string {
    return MetricsExporter.toJSON(this.storage.getSessions());
  }
  public exportAsCSV(): string {
    return MetricsExporter.toCSV(this.storage.getSessions());
  }

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
        if (data.isCrit) this.trackDamageDealt(0, true, false);
      })
    );
    this.eventUnsubscribers.push(
      EventBus.on('gemCollected', data => this.trackGemCollected(data.value))
    );
    this.eventUnsubscribers.push(
      EventBus.on('playerHit', data => this.trackDamageTaken(data.damage))
    );
    this.eventUnsubscribers.push(
      EventBus.on('bulletFired', () => this.trackBulletFired())
    );
    this.eventUnsubscribers.push(
      EventBus.on('critHit', data =>
        this.trackDamageDealt(data.damage, true, data.isSuperCrit, data.count ?? 1)
      )
    );
    this.eventUnsubscribers.push(
      EventBus.on('comboUpdate', data =>
        this.trackComboUpdate(data.killStreak, data.multiplier)
      )
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

export const MetricsService = MetricsServiceClass.getInstance();
