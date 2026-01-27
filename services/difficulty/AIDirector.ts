import * as synapticModule from 'synaptic';
import { marketIndicatorService } from '../indicators/MarketIndicatorService';
import { calculateMACDFactor } from './factors/macd';
import { difficultyContext } from './DifficultyContext';
import { Logger } from '../Logger';

// Robust way to access Architect from different build environments
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const synaptic = (synapticModule as Record<string, any>).default ?? synapticModule;
const { Architect } = synaptic;

/**
 * AI Director Inputs (Sensors)
 * Normalized to 0.0 - 1.0 range
 */
export interface DirectorInputs {
  rsi: number;
  macd: number;
  volatility: number;
  pnl: number;
  stress: number;
  playerDPS: number;
  killEfficiency: number;
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
  private net!: { activate: (inputs: number[]) => number[] };
  private enabled: boolean = false;
  private lastUpdate: number = 0;
  private readonly BRAIN_UPDATE_INTERVAL = 1000;

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

  private initNetwork() {
    // 7 Inputs -> 5 Hidden -> 3 Outputs
    this.net = new Architect.Perceptron(7, 5, 3);
    Logger.info('[AIDirector] Neural Network Initialized');
  }

  public setPlayerStats(
    damage: number,
    fireRate: number,
    bulletCount: number,
    recentKills: number
  ) {
    this.playerStats = { damage, fireRate, bulletCount, recentKills };
  }

  public update(time: number) {
    if (!this.enabled || time - this.lastUpdate < this.BRAIN_UPDATE_INTERVAL) return;
    this.lastUpdate = time;

    const ctx = difficultyContext.getContext();
    const market = marketIndicatorService.getState();

    // Power Analysis (fireRate is ms, lower is better, so we use 1000 / fireRate)
    const shotsPerSec = 1000 / Math.max(50, this.playerStats.fireRate);
    const rawPower =
      this.playerStats.damage * shotsPerSec * this.playerStats.bulletCount;

    // Normalizing: 25 dmg * 2.5 rate * 1 proj = 62.5 (Early Game)
    // Max: ~5000 (Very high power)
    const playerDPS = Math.min(1, rawPower / 2500);
    const killEfficiency = Math.min(1, this.playerStats.recentKills / 30);

    // MACD factor is already normalized -1 to 1, shift to 0 to 1 for Neural Net
    const macdInput = (calculateMACDFactor() + 1) / 2;

    const inputs: DirectorInputs = {
      rsi: market.rsi / 100,
      macd: macdInput,
      // volatility: market.atrPercent is a percentage (e.g. 1.0 for 1%)
      // 1.0% is quite high volatility for crypto in 1s. Usually 0.01-0.2%.
      // Let's normalize so 0.5% is "max" intensity (1.0)
      volatility: Math.min(1, market.atrPercent * 2),
      pnl: Math.max(-1, Math.min(1, ctx.inputs.pnlPercent)),
      // ctx.inputs.hpPercent is 0-100
      stress: 1 - Math.min(100, Math.max(0, ctx.inputs.hpPercent)) / 100,
      playerDPS,
      killEfficiency,
    };

    const out = this.net.activate([
      inputs.rsi,
      inputs.macd,
      inputs.volatility,
      inputs.pnl,
      inputs.stress,
      inputs.playerDPS,
      inputs.killEfficiency,
    ]);

    this.currentOutputs = {
      spawnDensity: out[0] ?? 0.5,
      enemySpeedMod: out[1] ?? 0.5,
      aggression: out[2] ?? 0.5,
    };

    // Logging for debug
    if (Math.random() < 0.05) {
      Logger.debug('[AIDirector] Decision:', this.currentOutputs);
    }
  }

  public getOutputs(): DirectorOutputs {
    return this.currentOutputs;
  }
}

export const AIDirector = AIDirectorClass.getInstance();
