import { Architect, Network } from 'synaptic';
import { difficultyContext } from './DifficultyContext';
import { Logger } from '../system/Logger';
import { PoolManager } from '../combat/PoolManager';

// Pre-trained brain data (embedded or loaded)
// This can be replaced with dynamic loading from brain-FINAL.json
const PRETRAINED_BRAIN: unknown = null;

/**
 * AI Director Inputs (Sensors)
 * Normalized to 0.0 - 1.0 range
 *
 * V3 Updates:
 * - Aligned with Project Darwin training inputs
 * - Market-aware difficulty scaling
 */
export interface DirectorInputs {
  // Market Inputs (from DifficultyContext)
  rsi: number; // RSI / 100
  macd: number; // MACD factor normalized 0-1
  volatility: number; // ATR% normalized
  volume: number; // Normalized volume 0-1
  trend: number; // 0 = bear, 0.5 = sideways, 1 = bull

  // Player State Inputs
  stress: number; // 1 - HP%
  playerDPS: number; // Normalized damage output
  killEfficiency: number; // Recent kills normalized
  zoningScore: number; // Gem pile-up (overwhelmed indicator)
}

/**
 * AI Director Outputs (Decisions)
 * 0.0 - 1.0 range
 */
export interface DirectorOutputs {
  spawnDensity: number;
  enemySpeedMod: number;
  aggression: number;
}

class AIDirectorClass {
  private static instance: AIDirectorClass | null = null;
  private net!: Network;
  private enabled: boolean = false;
  private lastUpdate: number = 0;
  private readonly BRAIN_UPDATE_INTERVAL = 1000;
  private brainLoaded: boolean = false;

  private currentOutputs: DirectorOutputs = {
    spawnDensity: 0.5,
    enemySpeedMod: 0.5,
    aggression: 0.5,
  };

  private playerStats = {
    damage: 10,
    fireRate: 5,
    bulletCount: 1,
    recentKills: 0,
    dashCooldownPercent: 0,
  };

  private constructor() {
    this.initNetwork();
  }

  static getInstance(): AIDirectorClass {
    return (AIDirectorClass.instance ??= new AIDirectorClass());
  }

  public setEnabled(enabled: boolean) {
    this.enabled = enabled;
  }

  /**
   * Load pre-trained brain from JSON
   */
  public loadBrain(brainJson: unknown): boolean {
    try {
      this.net = Network.fromJSON(brainJson);
      this.brainLoaded = true;
      Logger.info('[AIDirector] Pre-trained brain loaded successfully');
      return true;
    } catch (error) {
      Logger.warn('[AIDirector] Failed to load brain, using random network', error);
      this.initNetwork();
      return false;
    }
  }

  /**
   * Check if using pre-trained brain
   */
  public isUsingTrainedBrain(): boolean {
    return this.brainLoaded;
  }

  private initNetwork() {
    // Try to load pre-trained brain first
    if (PRETRAINED_BRAIN) {
      try {
        this.net = Network.fromJSON(PRETRAINED_BRAIN);
        this.brainLoaded = true;
        Logger.info('[AIDirector] Loaded embedded pre-trained brain');
        return;
      } catch {
        Logger.warn('[AIDirector] Failed to load embedded brain');
      }
    }

    // Fallback: Create new random network
    // 9 Inputs -> 6 Hidden -> 3 Outputs (Director architecture)
    this.net = new Architect.Perceptron(9, 6, 3);
    this.brainLoaded = false;
    Logger.info('[AIDirector] Neural Network Initialized (9-6-3 Random)');
  }

  public setPlayerStats(
    damage: number,
    fireRate: number,
    bulletCount: number,
    recentKills: number,
    dashCooldownPercent: number
  ) {
    this.playerStats = {
      damage,
      fireRate,
      bulletCount,
      recentKills,
      dashCooldownPercent,
    };
  }

  public update(time: number) {
    if (!this.enabled || time - this.lastUpdate < this.BRAIN_UPDATE_INTERVAL) return;
    this.lastUpdate = time;

    const ctx = difficultyContext.getContext();
    const marketRSI = Number.isFinite(ctx.inputs.rsi) ? ctx.inputs.rsi : 50;
    const marketAtrPercent = Number.isFinite(ctx.inputs.atrPercent)
      ? ctx.inputs.atrPercent
      : 0;
    const marketVolume = Number.isFinite(ctx.inputs.normalizedVolume)
      ? ctx.inputs.normalizedVolume
      : 0.5;

    // Power Analysis (fireRate is ms, lower is better, so we use 1000 / fireRate)
    const shotsPerSec = 1000 / Math.max(50, this.playerStats.fireRate);
    const rawPower =
      this.playerStats.damage * shotsPerSec * this.playerStats.bulletCount;

    // Normalizing: 25 dmg * 2.5 rate * 1 proj = 62.5 (Early Game)
    // Max: ~5000 (Very high power)
    const playerDPS = Math.min(1, rawPower / 2500);
    const killEfficiency = Math.min(1, this.playerStats.recentKills / 30);

    // Context Analysis: Crowd Control / Zoning Factor
    const activeGems = PoolManager.getInstance().activeGems.length;
    const zoningScore = Math.min(1, activeGems / 150);

    // MACD factor normalized 0 to 1
    const macdState = ctx.inputs.macd as { value?: number; macd?: number } | undefined;
    const macdValue = macdState?.value;
    const macdLegacy = macdState?.macd;
    const macdLine =
      typeof macdValue === 'number'
        ? macdValue
        : typeof macdLegacy === 'number'
          ? macdLegacy
          : 0;
    const macdInput = Math.max(0, Math.min(1, (macdLine + 1) / 2));

    // Determine trend from RSI
    let trendValue = 0.5; // sideways
    if (marketRSI > 60) {
      trendValue = 1.0; // bull
    } else if (marketRSI < 40) {
      trendValue = 0.0; // bear
    }

    const inputs: DirectorInputs = {
      rsi: marketRSI / 100,
      macd: macdInput,
      volatility: Math.min(1, marketAtrPercent * 2),
      volume: marketVolume,
      trend: trendValue,
      stress: 1 - Math.min(100, Math.max(0, ctx.inputs.hpPercent)) / 100,
      playerDPS,
      killEfficiency,
      zoningScore,
    };

    const out = this.net.activate([
      inputs.rsi,
      inputs.macd,
      inputs.volatility,
      inputs.volume,
      inputs.trend,
      inputs.stress,
      inputs.playerDPS,
      inputs.killEfficiency,
      inputs.zoningScore,
    ]);

    this.currentOutputs = {
      spawnDensity: out[0] ?? 0.5,
      enemySpeedMod: out[1] ?? 0.5,
      aggression: out[2] ?? 0.5,
    };

    // Logging for debug
    if (Math.random() < 0.05) {
      Logger.debug('[AIDirector] Inputs:', inputs);
      Logger.debug('[AIDirector] Decision:', this.currentOutputs);
    }
  }

  public getOutputs(): DirectorOutputs {
    return this.currentOutputs;
  }
}

export const AIDirector = AIDirectorClass.getInstance();
