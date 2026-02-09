/**
 * ReactiveLayer - Emergency Interventions
 *
 * AI Director V2 - Hierarchical Architecture
 * Layer 3: Reactive (Fast) - Updates every frame (16ms)
 *
 * Handles immediate interventions that cannot wait for slower layers:
 * - Mercy mode when HP critically low
 * - Swarm mode when HP too high
 * - Death recovery cooldown
 * - Combo breaker prevention
 *
 * @see docs/AI_DIRECTOR_V2_DESIGN.md
 */

import { Logger } from '../../system/Logger';
import { EventBus } from '../../core/EventBus';
import type { TacticalOutput } from './TacticalLayer';

/**
 * Reactive layer configuration
 */
export const REACTIVE_CONFIG = {
  // HP thresholds
  MERCY_HP_THRESHOLD: 0.2, // 20% HP - emergency mercy
  CRITICAL_HP_THRESHOLD: 0.1, // 10% HP - maximum mercy
  SWARM_HP_THRESHOLD: 0.8, // 80% HP - player too safe
  FULL_HP_THRESHOLD: 0.95, // 95% HP - immediate swarm

  // Mercy modifiers
  MERCY_SPAWN_MULTIPLIER: 0.3, // Reduce spawns to 30%
  CRITICAL_SPAWN_MULTIPLIER: 0.1, // Reduce spawns to 10%
  MERCY_DAMAGE_MULTIPLIER: 0.5, // Reduce enemy damage
  MERCY_SPEED_MULTIPLIER: 0.7, // Slow down enemies

  // Swarm modifiers
  SWARM_SPAWN_MULTIPLIER: 2.0, // Double spawn rate
  FULL_HP_SPAWN_MULTIPLIER: 3.0, // Triple spawn rate
  SWARM_ELITE_BONUS: 0.15, // Extra elite chance

  // Death recovery
  DEATH_COOLDOWN_MS: 5000, // 5 seconds of reduced difficulty after death
  DEATH_COOLDOWN_SPAWN_MULT: 0.5,

  // Combo protection
  HIGH_COMBO_THRESHOLD: 20,
  COMBO_PROTECTION_SPAWN_MULT: 0.8, // Slightly easier to maintain combo

  // Near miss tracking
  NEAR_MISS_WINDOW_MS: 500,
  NEAR_MISS_HP_THRESHOLD: 0.05, // 5% HP damage in quick succession
} as const;

/**
 * Player state for reactive checks
 */
export interface PlayerState {
  hpPercent: number;
  isDead: boolean;
  lastDeathTime: number;
  currentCombo: number;
  recentDamageTaken: number; // Damage in last second
}

/**
 * Reactive intervention result
 */
export interface ReactiveIntervention {
  // Active interventions
  mercyActive: boolean;
  swarmActive: boolean;
  deathCooldownActive: boolean;
  comboProtectionActive: boolean;

  // Final modifiers (applied on top of tactical)
  spawnMultiplier: number;
  damageMultiplier: number;
  speedMultiplier: number;
  eliteChanceModifier: number;

  // Intervention reason (for debugging/UI)
  activeInterventions: string[];

  // Priority level (higher = more urgent)
  priorityLevel: number;
}

/**
 * Final AI Director output
 */
export interface DirectorOutput {
  // Spawn control
  spawnRate: number; // enemies per second
  eliteChance: number; // 0-1
  bossChance: number; // 0-1

  // Enemy modifiers
  enemyDamageMultiplier: number;
  enemySpeedMultiplier: number;
  enemyHealthMultiplier: number;

  // Type bias
  bearSpawnWeight: number;
  bullSpawnWeight: number;

  // Special spawns
  shouldSpawnWhale: boolean;
  whaleType: 'bull' | 'bear' | null;
  shouldSpawnPortal: boolean;
  portalType: 'profit' | 'loss' | null;

  // Meta
  flowState: 'bored' | 'flow' | 'stressed';
  interventionActive: boolean;
  debugInfo: string;
}

/**
 * ReactiveLayer - Singleton
 */
class ReactiveLayerClass {
  private static instance: ReactiveLayerClass | null = null;

  // Tracking state
  private lastPlayerState: PlayerState | null = null;
  private damageHistory: { time: number; amount: number }[] = [];
  private readonly DAMAGE_HISTORY_WINDOW_MS = 1000;

  private constructor() {
    this.setupEventListeners();
    Logger.debug('[ReactiveLayer] Emergency System initialized');
  }

  static getInstance(): ReactiveLayerClass {
    return (ReactiveLayerClass.instance ??= new ReactiveLayerClass());
  }

  /**
   * Setup event listeners
   */
  private setupEventListeners(): void {
    EventBus.on('gameReset', () => this.reset());

    // Track damage events
    EventBus.on('playerHit', data => {
      this.recordDamage(data.damage);
    });
  }

  /**
   * Process reactive interventions
   *
   * @param player - Current player state
   * @param tactical - Output from tactical layer
   * @returns Final director output
   */
  process(player: PlayerState, tactical: TacticalOutput): DirectorOutput {
    const now = Date.now();

    // Clean old damage history
    this.cleanDamageHistory(now);

    // Check all intervention conditions
    const intervention = this.checkInterventions(player, now);

    // Combine tactical output with reactive interventions
    const finalSpawnRate = this.calculateFinalSpawnRate(tactical, intervention);
    const finalEliteChance = this.calculateFinalEliteChance(tactical, intervention);

    // Build final output
    const output: DirectorOutput = {
      spawnRate: finalSpawnRate,
      eliteChance: finalEliteChance,
      bossChance: this.calculateBossChance(player, tactical),

      enemyDamageMultiplier: intervention.damageMultiplier,
      enemySpeedMultiplier: intervention.speedMultiplier,
      enemyHealthMultiplier: 1.0 + (tactical.strategicMultiplier - 1) * 0.5,

      bearSpawnWeight: tactical.bearSpawnMultiplier,
      bullSpawnWeight: tactical.bullSpawnMultiplier,

      shouldSpawnWhale: tactical.shouldSpawnWhale && !intervention.mercyActive,
      whaleType: tactical.whaleType,
      shouldSpawnPortal: tactical.shouldSpawnPortal,
      portalType: tactical.portalType,

      flowState: this.determineFlowState(player.hpPercent),
      interventionActive: intervention.activeInterventions.length > 0,
      debugInfo: this.buildDebugInfo(player, tactical, intervention),
    };

    // Store for comparison
    this.lastPlayerState = { ...player };

    // Emit final decision
    EventBus.emit('directorDecision', {
      spawnRate: output.spawnRate,
      flowState: output.flowState,
      interventions: intervention.activeInterventions,
    });

    return output;
  }

  /**
   * Check all intervention conditions
   */
  private checkInterventions(player: PlayerState, now: number): ReactiveIntervention {
    const config = REACTIVE_CONFIG;
    const activeInterventions: string[] = [];

    let spawnMultiplier = 1.0;
    let damageMultiplier = 1.0;
    let speedMultiplier = 1.0;
    let eliteChanceModifier = 0;
    let priorityLevel = 0;

    // === MERCY MODE ===
    const mercyActive = player.hpPercent < config.MERCY_HP_THRESHOLD;
    const criticalMercy = player.hpPercent < config.CRITICAL_HP_THRESHOLD;

    if (criticalMercy) {
      activeInterventions.push('CRITICAL_MERCY');
      spawnMultiplier *= config.CRITICAL_SPAWN_MULTIPLIER;
      damageMultiplier *= config.MERCY_DAMAGE_MULTIPLIER;
      speedMultiplier *= config.MERCY_SPEED_MULTIPLIER;
      eliteChanceModifier -= 0.2;
      priorityLevel = 10;
    } else if (mercyActive) {
      activeInterventions.push('MERCY');
      spawnMultiplier *= config.MERCY_SPAWN_MULTIPLIER;
      damageMultiplier *= config.MERCY_DAMAGE_MULTIPLIER;
      speedMultiplier *= config.MERCY_SPEED_MULTIPLIER;
      eliteChanceModifier -= 0.1;
      priorityLevel = Math.max(priorityLevel, 8);
    }

    // === SWARM MODE ===
    const swarmActive = player.hpPercent > config.SWARM_HP_THRESHOLD && !mercyActive;
    const fullHPSwarm = player.hpPercent > config.FULL_HP_THRESHOLD;

    if (fullHPSwarm) {
      activeInterventions.push('FULL_HP_SWARM');
      spawnMultiplier *= config.FULL_HP_SPAWN_MULTIPLIER;
      eliteChanceModifier += config.SWARM_ELITE_BONUS * 2;
      priorityLevel = Math.max(priorityLevel, 5);
    } else if (swarmActive) {
      activeInterventions.push('SWARM');
      spawnMultiplier *= config.SWARM_SPAWN_MULTIPLIER;
      eliteChanceModifier += config.SWARM_ELITE_BONUS;
      priorityLevel = Math.max(priorityLevel, 3);
    }

    // === DEATH COOLDOWN ===
    const timeSinceDeath = now - player.lastDeathTime;
    const deathCooldownActive =
      timeSinceDeath < config.DEATH_COOLDOWN_MS && player.lastDeathTime > 0;

    if (deathCooldownActive) {
      activeInterventions.push('DEATH_RECOVERY');
      spawnMultiplier *= config.DEATH_COOLDOWN_SPAWN_MULT;
      priorityLevel = Math.max(priorityLevel, 7);
    }

    // === COMBO PROTECTION ===
    const comboProtectionActive = player.currentCombo >= config.HIGH_COMBO_THRESHOLD;

    if (comboProtectionActive && !swarmActive) {
      activeInterventions.push('COMBO_PROTECTION');
      spawnMultiplier *= config.COMBO_PROTECTION_SPAWN_MULT;
      priorityLevel = Math.max(priorityLevel, 2);
    }

    return {
      mercyActive,
      swarmActive,
      deathCooldownActive,
      comboProtectionActive,
      spawnMultiplier,
      damageMultiplier,
      speedMultiplier,
      eliteChanceModifier,
      activeInterventions,
      priorityLevel,
    };
  }

  /**
   * Calculate final spawn rate
   */
  private calculateFinalSpawnRate(
    tactical: TacticalOutput,
    intervention: ReactiveIntervention
  ): number {
    // Base spawn rate from strategic multiplier
    const baseRate = 1.0 + (tactical.strategicMultiplier - 1) * 0.5;

    // Apply reactive multiplier
    const finalRate = baseRate * intervention.spawnMultiplier;

    // Clamp to reasonable bounds
    return Math.max(0.1, Math.min(5.0, finalRate));
  }

  /**
   * Calculate final elite chance
   */
  private calculateFinalEliteChance(
    tactical: TacticalOutput,
    intervention: ReactiveIntervention
  ): number {
    const baseChance = tactical.eliteChanceBonus;
    const finalChance = baseChance + intervention.eliteChanceModifier;
    return Math.max(0, Math.min(0.5, finalChance));
  }

  /**
   * Calculate boss spawn chance
   */
  private calculateBossChance(player: PlayerState, tactical: TacticalOutput): number {
    // No boss during mercy
    if (player.hpPercent < REACTIVE_CONFIG.MERCY_HP_THRESHOLD) {
      return 0;
    }

    // Base chance from chaos level
    const chaosBonus =
      tactical.chaosLevel === 'extreme'
        ? 0.05
        : tactical.chaosLevel === 'volatile'
          ? 0.02
          : 0;

    return chaosBonus;
  }

  /**
   * Determine flow state from HP
   */
  private determineFlowState(hpPercent: number): 'bored' | 'flow' | 'stressed' {
    if (hpPercent > 0.65) return 'bored';
    if (hpPercent < 0.35) return 'stressed';
    return 'flow';
  }

  /**
   * Record damage for near-miss detection
   */
  private recordDamage(amount: number): void {
    this.damageHistory.push({ time: Date.now(), amount });
  }

  /**
   * Clean old damage history
   */
  private cleanDamageHistory(now: number): void {
    const cutoff = now - this.DAMAGE_HISTORY_WINDOW_MS;
    this.damageHistory = this.damageHistory.filter(d => d.time >= cutoff);
  }

  /**
   * Build debug info string
   */
  private buildDebugInfo(
    player: PlayerState,
    tactical: TacticalOutput,
    intervention: ReactiveIntervention
  ): string {
    const parts = [
      `HP:${(player.hpPercent * 100).toFixed(0)}%`,
      `Chaos:${tactical.chaosLevel}`,
      `Mood:${tactical.marketMood}`,
      `Spawn:${intervention.spawnMultiplier.toFixed(2)}x`,
    ];

    if (intervention.activeInterventions.length > 0) {
      parts.push(`[${intervention.activeInterventions.join(',')}]`);
    }

    return parts.join(' | ');
  }

  /**
   * Get debug state
   */
  getDebugState(): Record<string, unknown> {
    return {
      lastPlayerState: this.lastPlayerState,
      damageHistorySize: this.damageHistory.length,
      recentDamage: this.damageHistory.reduce((sum, d) => sum + d.amount, 0),
    };
  }

  /**
   * Reset state
   */
  reset(): void {
    this.lastPlayerState = null;
    this.damageHistory = [];
    Logger.debug('[ReactiveLayer] Reset');
  }
}

// Export singleton
export const ReactiveLayer = ReactiveLayerClass.getInstance();

// For testing
export function createReactiveLayer(): ReactiveLayerClass {
  (ReactiveLayerClass as unknown as { instance: null }).instance = null;
  return ReactiveLayerClass.getInstance();
}
