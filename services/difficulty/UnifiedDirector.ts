import {
  type DifficultyRule,
  type RuleContext,
  getDefaultSharedState,
} from './rules/DifficultyRule';
import { DEFAULT_RULE_ORDER } from './rules';

export interface UnifiedInputs {
  // Market Data
  rsi: number; // 0.0 to 1.0 (e.g. 50 RSI = 0.5)
  rsiMomentum: number;
  atrPercent: number;
  volumeNorm: number; // 0.0 to 1.0
  priceChange: number;
  trendStrength: number;
  macdHistogram: number;
  side: 'long' | 'short';

  // Player State
  hpPercent: number; // 0.0 to 1.0
  pnlRatio: number; // -1.0 to 1.0
  killsPerMin: number;
  dashFrequency: number;
  playerDPS: number;
  damageTakenRate: number;

  // Game Context
  elapsedMinutes: number;
  playerLevel: number; // e.g. level / 50
  leverage: number; // e.g. 100x = 1.0
  gemPileup: number;
  engagementScore: number;
  frustrationScore: number;
}

export interface UnifiedOutputs {
  spawnRate: number;
  enemySpeed: number;
  enemyHP: number;
  enemyDamage: number;
  gemDropRate: number;
  enemyVariety: number;
  chaosLevel: number;
  mercyFactor: number;
  pressureIntensity: number;
  whaleProbability: number;
  xpMultiplier: number;
  trendAlignment: 'with_player' | 'against_player' | 'neutral';
  lootboxDropChance: number;
}

/**
 * Deterministic Rule-Based Director (V2 — Composable Rules)
 *
 * The `update()` method runs a pipeline of DifficultyRule instances.
 * Rules mutate a pre-allocated RuleContext in-place (zero GC).
 * The rule set can be overridden via the constructor for testing.
 */
class RuleBasedDirector {
  private readonly rules: readonly DifficultyRule[];
  private outputs: UnifiedOutputs = this.getDefaultOutputs();
  private smoothedOutputs: UnifiedOutputs = this.getDefaultOutputs();

  /** Pre-allocated rule context — reused every frame */
  private readonly ruleContext: RuleContext = {
    inputs: {} as UnifiedInputs,
    outputs: this.outputs,
    shared: getDefaultSharedState(),
  };

  constructor(rules?: readonly DifficultyRule[]) {
    this.rules = rules ?? DEFAULT_RULE_ORDER;
  }

  public update(inputs: UnifiedInputs, _nowMs: number): void {
    // Reset outputs to defaults before rule pipeline
    this.resetOutputs(this.outputs);

    // Reset shared state
    const shared = this.ruleContext.shared;
    shared.mercy = 0;
    shared.atrNorm = 0;
    shared.timePressure = 0;
    shared.leverageBoost = 0;
    shared.volumeBoost = 0;
    shared.pnlSpeedMult = 1;
    shared.atrSpeedMult = 1;
    shared.underwaterPenalty = 0;

    // Set context inputs (reference swap, no allocation)
    this.ruleContext.inputs = inputs;
    this.ruleContext.outputs = this.outputs;

    // Execute rule pipeline
    for (let i = 0; i < this.rules.length; i++) {
      this.rules[i]!.apply(this.ruleContext);
    }

    this.applySmoothing();
  }

  /**
   * Immediately snap smoothed outputs to target values (bypasses LERP).
   * Useful for unit tests or game starts.
   */
  public snapToTargets(): void {
    this.smoothedOutputs = { ...this.outputs };
  }

  // Pre-computed numeric keys to avoid Object.keys() allocation per frame
  private static readonly NUMERIC_KEYS: Array<keyof UnifiedOutputs> = [
    'spawnRate',
    'enemySpeed',
    'enemyHP',
    'enemyDamage',
    'gemDropRate',
    'enemyVariety',
    'chaosLevel',
    'mercyFactor',
    'pressureIntensity',
    'whaleProbability',
    'xpMultiplier',
    'lootboxDropChance',
  ];

  private applySmoothing(): void {
    const LERP_SPEED = 0.05; // 5% approach per frame to prevent jerky game feel
    const s = this.smoothedOutputs as unknown as Record<string, number>;
    const o = this.outputs as unknown as Record<string, number>;

    for (let i = 0; i < RuleBasedDirector.NUMERIC_KEYS.length; i++) {
      const key = RuleBasedDirector.NUMERIC_KEYS[i] as string;
      s[key] = s[key]! + (o[key]! - s[key]!) * LERP_SPEED;
    }
    // Non-numeric: copy directly
    this.smoothedOutputs.trendAlignment = this.outputs.trendAlignment;
  }

  public getOutputs(): UnifiedOutputs {
    return { ...this.smoothedOutputs };
  }

  public reset(): void {
    this.outputs = this.getDefaultOutputs();
    this.smoothedOutputs = this.getDefaultOutputs();
  }

  private resetOutputs(o: UnifiedOutputs): void {
    o.spawnRate = 1.0;
    o.enemySpeed = 1.0;
    o.enemyHP = 1.0;
    o.enemyDamage = 1.0;
    o.gemDropRate = 1.0;
    o.enemyVariety = 1.0;
    o.chaosLevel = 0;
    o.mercyFactor = 0;
    o.pressureIntensity = 0;
    o.whaleProbability = 0;
    o.xpMultiplier = 1.0;
    o.trendAlignment = 'neutral';
    o.lootboxDropChance = 0.03;
  }

  private getDefaultOutputs(): UnifiedOutputs {
    return {
      spawnRate: 1.0,
      enemySpeed: 1.0,
      enemyHP: 1.0,
      enemyDamage: 1.0,
      gemDropRate: 1.0,
      enemyVariety: 1.0,
      chaosLevel: 0,
      mercyFactor: 0,
      pressureIntensity: 0,
      whaleProbability: 0,
      xpMultiplier: 1.0,
      trendAlignment: 'neutral',
      lootboxDropChance: 0.03,
    };
  }
}

export const UnifiedDirector = new RuleBasedDirector();
