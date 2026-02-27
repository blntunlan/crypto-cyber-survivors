/**
 * BacktestEngine - AI Director V2 Eğitim Motoru
 *
 * Supabase'den çekilen geçmiş market verileri ile UnifiedDirector'ı eğitir.
 *
 * Eğitim Süreci:
 * 1. Geçmiş market verilerini Supabase'den çek
 * 2. Oyun simülasyonu çalıştır
 * 3. Flow state'te kalma süresini ölç
 * 4. Reward hesapla
 * 5. Neural network'ü güncelle
 *
 * Hedef: Oyuncuyu HP %35-%65 arasında (flow state) tutmak
 *
 * @see docs/AI_DIRECTOR_V2_DESIGN.md
 */

// Stub definitions for removed simulation dependencies
export interface PriceDataPoint {
  price: number;
  timestamp: number;
}
export interface IndicatorSnapshot {
  rsi: number;
  atrPercent: number;
  normalizedVolume: number;
  macdHistogram: number;
}
export class HistoricalDataLoader {
  async fetchPriceHistory(
    _pair: string,
    _start: Date,
    _end: Date,
    _limit: number
  ): Promise<PriceDataPoint[]> {
    return [];
  }
  calculateIndicators(_data: PriceDataPoint[]): IndicatorSnapshot[] {
    return [];
  }
}

import { Logger } from '../system/Logger';
import { EventBus } from '../core/EventBus';

/**
 * Backtest configuration
 */
export interface BacktestConfig {
  daysBack: number;
  simulationDurationMs: number;
  pair: string;
}

/**
 * Timeline frame for backtest
 */
export interface BacktestTimelineFrame {
  timestamp: number;
  playerHP: number;
  activeEnemies: number;
  spawnRate: number;
  marketPrice: number;
  rsi: number;
  atr: number;
}

/**
 * Backtest result
 */
export interface BacktestResult {
  timeline: BacktestTimelineFrame[];
  summary: {
    totalTimeMs: number;
    timeInFlowMs: number;
    flowRatio: number;
    avgHP: number;
    deaths: number;
    kills: number;
  };
}

/**
 * Director parameters (imported from DirectorOptimizer when available)
 */
export interface DirectorParameters {
  pid: {
    Kp: number;
    Ki: number;
    Kd: number;
  };
  tactical: {
    rsiOversold: number;
    rsiOverbought: number;
    atrLow: number;
    atrHigh: number;
    volumeThreshold: number;
  };
  reactive: {
    mercyThreshold: number;
    swarmThreshold: number;
    deathCooldownMs: number;
  };
}

/**
 * Simüle edilen oyuncu durumu
 */
interface SimulatedPlayerState {
  hp: number;
  maxHp: number;
  level: number;
  kills: number;
  dps: number;
  survivalTimeMs: number;
  dodgeRate: number;
  avgCombo: number;
}

/**
 * Simülasyon sonucu
 */
interface SimulationResult {
  totalTimeMs: number;
  timeInFlowMs: number;
  timeBoredMs: number;
  timeStressedMs: number;
  flowRatio: number; // 0-1, hedef: maximize
  avgHP: number;
  deaths: number;
  portalsUsed: number;
  reward: number; // Toplam reward skoru
}

/**
 * Eğitim konfigürasyonu
 */
export const TRAINING_CONFIG = {
  // Simülasyon
  SIMULATION_DURATION_MS: 10 * 60 * 1000, // 10 dakika
  SIMULATION_TICK_MS: 100, // 100ms tick
  EPISODES_PER_BATCH: 50, // Batch başına episode

  // Flow state hedefleri
  FLOW_HP_MIN: 0.35,
  FLOW_HP_MAX: 0.65,
  MERCY_HP: 0.2,

  // Reward fonksiyonu
  REWARDS: {
    FLOW_STATE: 1.0, // Her tick flow'da +1
    BORED_STATE: -0.3, // Her tick bored'da -0.3
    STRESSED_STATE: -0.5, // Her tick stressed'da -0.5
    DEATH: -100, // Ölüm büyük penalty
    SURVIVAL_BONUS: 0.1, // Her saniye hayatta +0.1
    PORTAL_USED: 10, // Portal kullanımı bonus
  },

  // Neural network
  LEARNING_RATE: 0.01,
  BATCH_SIZE: 32,
  EPOCHS: 100,

  // Oyun parametreleri
  PLAYER_BASE_HP: 100,
  PLAYER_BASE_DPS: 10,
  ENEMY_BASE_DAMAGE: 5,
  ENEMY_BASE_HP: 20,
  SPAWN_BASE_RATE: 1.0, // enemies per second
} as const;

/**
 * Training sample
 */
interface TrainingSample {
  inputs: number[];
  targetOutputs: number[];
  reward: number;
}

/**
 * BacktestEngine - Singleton
 */
class BacktestEngineClass {
  private static instance: BacktestEngineClass | null = null;

  private dataLoader: HistoricalDataLoader;
  private trainingSamples: TrainingSample[] = [];
  private isTraining: boolean = false;
  private currentEpisode: number = 0;
  private bestReward: number = -Infinity;

  // Cached market data
  private marketData: PriceDataPoint[] = [];
  private indicators: IndicatorSnapshot[] = [];

  private constructor() {
    this.dataLoader = new HistoricalDataLoader();
    Logger.debug('[BacktestEngine] Initialized');
  }

  static getInstance(): BacktestEngineClass {
    return (BacktestEngineClass.instance ??= new BacktestEngineClass());
  }

  /**
   * Supabase'den eğitim verisi yükle
   */
  async loadTrainingData(
    daysBack: number = 7,
    pair: string = 'BTC-USD'
  ): Promise<number> {
    const endDate = new Date();
    const startDate = new Date(endDate.getTime() - daysBack * 24 * 60 * 60 * 1000);

    Logger.info(`[BacktestEngine] Loading ${daysBack} days of data...`);

    this.marketData = await this.dataLoader.fetchPriceHistory(
      pair,
      startDate,
      endDate,
      50000 // Max points
    );

    if (this.marketData.length === 0) {
      Logger.warn('[BacktestEngine] No data loaded, using mock data');
    }

    // Calculate indicators
    this.indicators = this.dataLoader.calculateIndicators(this.marketData);

    Logger.info(`[BacktestEngine] Loaded ${this.marketData.length} data points`);
    return this.marketData.length;
  }

  /**
   * Tek bir episode simüle et
   */
  private simulateEpisode(
    startIndex: number,
    networkWeights?: number[][]
  ): SimulationResult {
    const config = TRAINING_CONFIG;
    const tickCount = Math.floor(
      config.SIMULATION_DURATION_MS / config.SIMULATION_TICK_MS
    );

    // Initialize player
    const player: SimulatedPlayerState = {
      hp: config.PLAYER_BASE_HP,
      maxHp: config.PLAYER_BASE_HP,
      level: 1,
      kills: 0,
      dps: config.PLAYER_BASE_DPS,
      survivalTimeMs: 0,
      dodgeRate: 0.1,
      avgCombo: 1,
    };

    // Result tracking
    let timeInFlowMs = 0;
    let timeBoredMs = 0;
    let timeStressedMs = 0;
    let deaths = 0;
    let portalsUsed = 0;
    let totalReward = 0;
    let hpSum = 0;

    // Active enemies
    let activeEnemies = 0;
    let spawnAccumulator = 0;

    for (let tick = 0; tick < tickCount; tick++) {
      const dataIndex = startIndex + tick;
      if (dataIndex >= this.indicators.length) break;

      const indicator = this.indicators[dataIndex];
      if (!indicator) break;

      // Get AI decision (simplified - will use actual network later)
      const aiDecision = this.getAIDecision(player, indicator, networkWeights);

      // Spawn enemies based on AI decision
      spawnAccumulator += aiDecision.spawnRate * (config.SIMULATION_TICK_MS / 1000);
      while (spawnAccumulator >= 1) {
        activeEnemies++;
        spawnAccumulator--;
      }

      // Simulate combat
      const { damage, kills } = this.simulateCombat(player, activeEnemies, aiDecision);
      player.hp -= damage;
      player.kills += kills;
      activeEnemies = Math.max(0, activeEnemies - kills);

      // Check death
      if (player.hp <= 0) {
        deaths++;
        totalReward += config.REWARDS.DEATH;
        player.hp = config.PLAYER_BASE_HP * 0.5; // Respawn at 50%
      }

      // Calculate HP percentage
      const hpPercent = player.hp / player.maxHp;
      hpSum += hpPercent;

      // Determine flow state
      let tickReward = 0;
      if (hpPercent >= config.FLOW_HP_MIN && hpPercent <= config.FLOW_HP_MAX) {
        timeInFlowMs += config.SIMULATION_TICK_MS;
        tickReward = config.REWARDS.FLOW_STATE;
      } else if (hpPercent > config.FLOW_HP_MAX) {
        timeBoredMs += config.SIMULATION_TICK_MS;
        tickReward = config.REWARDS.BORED_STATE;
      } else {
        timeStressedMs += config.SIMULATION_TICK_MS;
        tickReward = config.REWARDS.STRESSED_STATE;

        // Mercy mode
        if (hpPercent < config.MERCY_HP) {
          player.hp += 5; // Heal in mercy
        }
      }

      totalReward += tickReward;
      totalReward += config.REWARDS.SURVIVAL_BONUS * (config.SIMULATION_TICK_MS / 1000);

      player.survivalTimeMs += config.SIMULATION_TICK_MS;

      // Portal check (simplified)
      if (player.survivalTimeMs > 5 * 60 * 1000 && Math.random() < 0.001) {
        portalsUsed++;
        totalReward += config.REWARDS.PORTAL_USED;
      }

      // Record training sample periodically
      if (tick % 10 === 0) {
        this.recordTrainingSample(player, indicator, aiDecision, tickReward);
      }
    }

    const totalTimeMs = tickCount * config.SIMULATION_TICK_MS;

    return {
      totalTimeMs,
      timeInFlowMs,
      timeBoredMs,
      timeStressedMs,
      flowRatio: timeInFlowMs / totalTimeMs,
      avgHP: hpSum / tickCount,
      deaths,
      portalsUsed,
      reward: totalReward,
    };
  }

  /**
   * AI karar ver (network veya default)
   */
  private getAIDecision(
    player: SimulatedPlayerState,
    indicator: IndicatorSnapshot,
    _weights?: number[][]
  ): { spawnRate: number; enemySpeed: number; eliteChance: number } {
    // Normalize inputs
    const hpPercent = player.hp / player.maxHp;
    const rsiNorm = indicator.rsi / 100;
    const atrNorm = Math.min(1, indicator.atrPercent / 2);

    // Simple rule-based (will be replaced by network)
    let spawnRate = TRAINING_CONFIG.SPAWN_BASE_RATE;

    // Adjust based on HP
    if (hpPercent < TRAINING_CONFIG.FLOW_HP_MIN) {
      spawnRate *= 0.5; // Reduce when low HP
    } else if (hpPercent > TRAINING_CONFIG.FLOW_HP_MAX) {
      spawnRate *= 1.5; // Increase when high HP
    }

    // Adjust based on market
    spawnRate *= 0.8 + rsiNorm * 0.4; // RSI high = more spawns
    spawnRate *= 1 + atrNorm * 0.5; // Volatility = more action

    return {
      spawnRate: Math.max(0.1, Math.min(3, spawnRate)),
      enemySpeed: 1.0,
      eliteChance: 0.1 + atrNorm * 0.1,
    };
  }

  /**
   * Combat simulation
   */
  private simulateCombat(
    player: SimulatedPlayerState,
    enemies: number,
    _aiDecision: { spawnRate: number; enemySpeed: number; eliteChance: number }
  ): { damage: number; kills: number } {
    // Simplified combat
    const tickDamage =
      enemies * TRAINING_CONFIG.ENEMY_BASE_DAMAGE * 0.1 * (1 - player.dodgeRate);
    const killsThisTick = Math.floor(
      (player.dps * 0.1) / TRAINING_CONFIG.ENEMY_BASE_HP
    );

    return {
      damage: tickDamage,
      kills: Math.min(enemies, killsThisTick),
    };
  }

  /**
   * Record training sample
   */
  private recordTrainingSample(
    player: SimulatedPlayerState,
    indicator: IndicatorSnapshot,
    aiDecision: { spawnRate: number; enemySpeed: number; eliteChance: number },
    reward: number
  ): void {
    const inputs = [
      indicator.rsi / 100,
      indicator.atrPercent / 2,
      indicator.normalizedVolume,
      indicator.macdHistogram / 100,
      player.hp / player.maxHp,
      player.kills / 100,
      player.dps / 50,
      player.survivalTimeMs / (10 * 60 * 1000),
    ];

    const targetOutputs = [
      aiDecision.spawnRate / 3,
      aiDecision.enemySpeed,
      aiDecision.eliteChance,
    ];

    this.trainingSamples.push({ inputs, targetOutputs, reward });

    // Limit sample size
    if (this.trainingSamples.length > 10000) {
      this.trainingSamples.shift();
    }
  }

  /**
   * Eğitim çalıştır
   */
  async train(
    episodes: number = 100
  ): Promise<{ avgReward: number; bestReward: number }> {
    if (this.marketData.length === 0) {
      await this.loadTrainingData();
    }

    if (this.marketData.length < 1000) {
      Logger.error('[BacktestEngine] Insufficient training data');
      return { avgReward: 0, bestReward: 0 };
    }

    this.isTraining = true;
    let totalReward = 0;

    Logger.info(`[BacktestEngine] Starting training with ${episodes} episodes...`);

    for (let ep = 0; ep < episodes; ep++) {
      this.currentEpisode = ep;

      // Random starting point
      const maxStart =
        this.indicators.length -
        Math.floor(
          TRAINING_CONFIG.SIMULATION_DURATION_MS / TRAINING_CONFIG.SIMULATION_TICK_MS
        );
      const startIndex = Math.floor(Math.random() * Math.max(1, maxStart));

      const result = this.simulateEpisode(startIndex);

      totalReward += result.reward;

      if (result.reward > this.bestReward) {
        this.bestReward = result.reward;
      }

      // Progress log
      if ((ep + 1) % 10 === 0) {
        const avgSoFar = totalReward / (ep + 1);
        Logger.info(
          `[BacktestEngine] Episode ${ep + 1}/${episodes}: ` +
            `reward=${result.reward.toFixed(1)}, ` +
            `flow=${(result.flowRatio * 100).toFixed(1)}%, ` +
            `avg=${avgSoFar.toFixed(1)}`
        );

        EventBus.emit('trainingProgress', {
          episode: ep + 1,
          totalEpisodes: episodes,
          avgReward: avgSoFar,
          bestReward: this.bestReward,
          flowRatio: result.flowRatio,
        });
      }
    }

    this.isTraining = false;

    const avgReward = totalReward / episodes;
    Logger.info(
      `[BacktestEngine] Training complete: avg=${avgReward.toFixed(1)}, best=${this.bestReward.toFixed(1)}`
    );

    return { avgReward, bestReward: this.bestReward };
  }

  /**
   * Eğitilmiş ağırlıkları UnifiedDirector'a aktar
   */
  exportWeightsForUnifiedDirector(): {
    weights: number[][];
    biases: number[][];
    metadata: Record<string, unknown>;
  } {
    // For now, return rule-based weights
    // Will be replaced with actual trained weights

    // UnifiedDirector: 18 inputs → 32 → 32 → 14 outputs
    const inputSize = 18;
    const hidden1Size = 32;
    const hidden2Size = 32;
    const outputSize = 14;

    // Initialize with rule-based heuristics
    const weights: number[][] = [];
    const biases: number[][] = [];

    // Layer 1: Input → Hidden1 (18x32)
    const w1: number[] = [];
    for (let i = 0; i < inputSize * hidden1Size; i++) {
      // Small random initialization
      w1.push((Math.random() - 0.5) * 0.2);
    }
    weights.push(w1);
    biases.push(new Array(hidden1Size).fill(0));

    // Layer 2: Hidden1 → Hidden2 (32x32)
    const w2: number[] = [];
    for (let i = 0; i < hidden1Size * hidden2Size; i++) {
      w2.push((Math.random() - 0.5) * 0.2);
    }
    weights.push(w2);
    biases.push(new Array(hidden2Size).fill(0));

    // Layer 3: Hidden2 → Output (32x14)
    const w3: number[] = [];
    for (let i = 0; i < hidden2Size * outputSize; i++) {
      w3.push((Math.random() - 0.5) * 0.2);
    }
    weights.push(w3);
    biases.push(new Array(outputSize).fill(0));

    // Apply rule-based adjustments to key connections
    // HP stress connection (input 4 → output 0 spawnDensity)
    // When HP low, reduce spawn
    const hpToSpawnIdx = 4 * hidden1Size + 0;
    if (w1[hpToSpawnIdx] !== undefined) {
      w1[hpToSpawnIdx] = -0.5; // Negative: low HP → low spawn
    }

    // RSI to elite chance (input 0 → output 2)
    const rsiToEliteIdx = 0 * hidden1Size + 2;
    if (w1[rsiToEliteIdx] !== undefined) {
      w1[rsiToEliteIdx] = 0.3; // High RSI → more elites
    }

    return {
      weights,
      biases,
      metadata: {
        trainedAt: new Date().toISOString(),
        episodes: this.currentEpisode,
        bestReward: this.bestReward,
        samplesCollected: this.trainingSamples.length,
        architecture: [inputSize, hidden1Size, hidden2Size, outputSize],
      },
    };
  }

  /**
   * Eğitim durumunu al
   */
  getTrainingState(): Record<string, unknown> {
    return {
      isTraining: this.isTraining,
      currentEpisode: this.currentEpisode,
      bestReward: this.bestReward,
      samplesCollected: this.trainingSamples.length,
      dataPointsLoaded: this.marketData.length,
    };
  }

  /**
   * Run backtest with specific parameters (for DirectorOptimizer)
   */
  async runWithParams(
    params: DirectorParameters,
    config?: Partial<BacktestConfig>
  ): Promise<BacktestResult> {
    // Ensure data is loaded
    if (this.marketData.length === 0) {
      await this.loadTrainingData(config?.daysBack ?? 7);
    }

    const simulationDuration =
      config?.simulationDurationMs ?? TRAINING_CONFIG.SIMULATION_DURATION_MS;
    const tickMs = TRAINING_CONFIG.SIMULATION_TICK_MS;
    const tickCount = Math.floor(simulationDuration / tickMs);

    // Random starting point
    const maxStart = this.indicators.length - tickCount;
    const startIndex = Math.floor(Math.random() * Math.max(1, maxStart));

    // Initialize player
    const player: SimulatedPlayerState = {
      hp: TRAINING_CONFIG.PLAYER_BASE_HP,
      maxHp: TRAINING_CONFIG.PLAYER_BASE_HP,
      level: 1,
      kills: 0,
      dps: TRAINING_CONFIG.PLAYER_BASE_DPS,
      survivalTimeMs: 0,
      dodgeRate: 0.1,
      avgCombo: 1,
    };

    // Result tracking
    const timeline: BacktestTimelineFrame[] = [];
    let deaths = 0;
    let timeInFlowMs = 0;
    let activeEnemies = 0;
    let spawnAccumulator = 0;

    // PID state for this simulation
    let pidIntegral = 0;
    let pidPrevError = 0;

    for (let tick = 0; tick < tickCount; tick++) {
      const dataIndex = startIndex + tick;
      if (dataIndex >= this.indicators.length) break;

      const indicator = this.indicators[dataIndex];
      const marketData = this.marketData[dataIndex];

      if (!indicator || !marketData) break;

      // Calculate HP percentage
      const hpPercent = player.hp / player.maxHp;

      // Apply PID controller with given parameters
      const pidError = 0.5 - hpPercent; // Target 50%
      pidIntegral += pidError * (tickMs / 1000);
      pidIntegral = Math.max(-1, Math.min(1, pidIntegral)); // Clamp
      const pidDerivative = (pidError - pidPrevError) / (tickMs / 1000);
      pidPrevError = pidError;

      const pidOutput =
        1.0 +
        params.pid.Kp * pidError +
        params.pid.Ki * pidIntegral +
        params.pid.Kd * pidDerivative;

      // Apply tactical rules with given parameters
      let tacticalMultiplier = 1.0;
      if (indicator.rsi > params.tactical.rsiOverbought) {
        tacticalMultiplier *= 1.2; // More bears
      } else if (indicator.rsi < params.tactical.rsiOversold) {
        tacticalMultiplier *= 0.8; // More bulls (easier)
      }

      if (indicator.atrPercent > params.tactical.atrHigh) {
        tacticalMultiplier *= 1.3; // High volatility = more spawns
      } else if (indicator.atrPercent < params.tactical.atrLow) {
        tacticalMultiplier *= 0.7;
      }

      // Apply reactive rules with given parameters
      let reactiveMultiplier = 1.0;
      if (hpPercent < params.reactive.mercyThreshold) {
        reactiveMultiplier = 0.3; // Mercy mode
      } else if (hpPercent > params.reactive.swarmThreshold) {
        reactiveMultiplier = 1.5; // Swarm mode
      }

      // Combined spawn rate
      const spawnRate =
        TRAINING_CONFIG.SPAWN_BASE_RATE *
        Math.max(0.1, Math.min(3, pidOutput * tacticalMultiplier * reactiveMultiplier));

      // Spawn enemies
      spawnAccumulator += spawnRate * (tickMs / 1000);
      while (spawnAccumulator >= 1) {
        activeEnemies++;
        spawnAccumulator--;
      }

      // Simulate combat
      const { damage, kills } = this.simulateCombat(player, activeEnemies, {
        spawnRate,
        enemySpeed: 1,
        eliteChance: 0.1,
      });
      player.hp -= damage;
      player.kills += kills;
      activeEnemies = Math.max(0, activeEnemies - kills);

      // Check death
      if (player.hp <= 0) {
        deaths++;
        player.hp = player.maxHp * 0.5; // Respawn
      }

      // Track flow state
      if (hpPercent >= 0.35 && hpPercent <= 0.65) {
        timeInFlowMs += tickMs;
      }

      player.survivalTimeMs += tickMs;

      // Record timeline frame (every 10 ticks)
      if (tick % 10 === 0) {
        timeline.push({
          timestamp: tick * tickMs,
          playerHP: player.hp,
          activeEnemies,
          spawnRate,
          marketPrice: marketData.price,
          rsi: indicator.rsi,
          atr: indicator.atrPercent,
        });
      }
    }

    const totalTimeMs = tickCount * tickMs;

    return {
      timeline,
      summary: {
        totalTimeMs,
        timeInFlowMs,
        flowRatio: timeInFlowMs / totalTimeMs,
        avgHP: player.hp / player.maxHp,
        deaths,
        kills: player.kills,
      },
    };
  }

  /**
   * Reset
   */
  reset(): void {
    this.trainingSamples = [];
    this.isTraining = false;
    this.currentEpisode = 0;
    this.bestReward = -Infinity;
    Logger.debug('[BacktestEngine] Reset');
  }
}

// Export singleton
export const BacktestEngine = BacktestEngineClass.getInstance();

// For testing
export function createBacktestEngine(): BacktestEngineClass {
  (BacktestEngineClass as unknown as { instance: null }).instance = null;
  return BacktestEngineClass.getInstance();
}
