/**
 * MarketEventMapperV2 - Maps Market Events to Gameplay Effects
 *
 * AI Director V2 - Phase 6: Market Event Mapping
 *
 * This service translates market events (FLASH_CRASH, WHALE_ALERT, etc.)
 * into concrete gameplay effects that integrate with:
 * - UnifiedDirector (neural network adjustments)
 * - FlowStateManager (stress/engagement tracking)
 * - PortalSystemV2 (portal triggers)
 * - SpawnSystem (enemy spawning)
 *
 * Market Event -> Gameplay Effect Mapping:
 * - VOLUME_SPIKE (Flash Mob) -> +30% spawn rate, +50% elite chance
 * - WHALE_ALERT (Boss Wave) -> Spawn whale boss, pause normal spawns
 * - FLASH_CRASH (Panic Mode) -> -20% player speed, screen shake, portal trigger
 * - PRICE_BREAKOUT (Momentum) -> +20% player damage, speed boost
 * - CONSOLIDATION (Calm) -> Heal opportunity, reduced spawns
 *
 * @see docs/AI_DIRECTOR_V2_DESIGN.md
 */

import { EventBus } from '../core/EventBus';
import { Logger } from '../system/Logger';
import type { GameMarketEvent, MarketEventPayload } from '../market/MarketEventManager';

/**
 * Gameplay effect configuration per event type
 */
export interface MarketEventEffect {
  // Spawn modifiers
  spawnRateMultiplier: number;
  eliteChanceBonus: number;
  bossSpawn: boolean;
  pauseNormalSpawns: boolean;

  // Player modifiers
  playerSpeedMultiplier: number;
  playerDamageMultiplier: number;
  playerDefenseMultiplier: number;

  // Visual/Audio
  screenShake: boolean;
  screenShakeIntensity: number;
  overlayEffect: 'none' | 'red_flash' | 'green_pulse' | 'blue_calm' | 'purple_chaos';

  // Portal trigger
  shouldTriggerPortal: boolean;
  portalType: 'TAKE_PROFIT' | 'STOP_LOSS' | null;

  // Flow state influence
  stressIncrease: number;
  engagementIncrease: number;

  // Duration
  durationMs: number;
}

/**
 * Active effect tracking
 */
interface ActiveEffect {
  type: GameMarketEvent;
  effect: MarketEventEffect;
  startTime: number;
  endTime: number;
  intensity: number;
}

/**
 * Configuration for market event -> gameplay effect mapping
 */
export const MARKET_EVENT_EFFECTS: Record<GameMarketEvent, MarketEventEffect> = {
  VOLUME_SPIKE: {
    spawnRateMultiplier: 1.3,
    eliteChanceBonus: 0.5,
    bossSpawn: false,
    pauseNormalSpawns: false,
    playerSpeedMultiplier: 1.0,
    playerDamageMultiplier: 1.0,
    playerDefenseMultiplier: 1.0,
    screenShake: false,
    screenShakeIntensity: 0,
    overlayEffect: 'purple_chaos',
    shouldTriggerPortal: false,
    portalType: null,
    stressIncrease: 0.15,
    engagementIncrease: 0.2,
    durationMs: 20000,
  },

  WHALE_ALERT: {
    spawnRateMultiplier: 0.3, // Reduce normal spawns during boss
    eliteChanceBonus: 0,
    bossSpawn: true,
    pauseNormalSpawns: true,
    playerSpeedMultiplier: 1.0,
    playerDamageMultiplier: 1.0,
    playerDefenseMultiplier: 1.0,
    screenShake: true,
    screenShakeIntensity: 0.3,
    overlayEffect: 'none',
    shouldTriggerPortal: false,
    portalType: null,
    stressIncrease: 0.25,
    engagementIncrease: 0.4,
    durationMs: 30000,
  },

  FLASH_CRASH: {
    spawnRateMultiplier: 1.5,
    eliteChanceBonus: 0,
    bossSpawn: false,
    pauseNormalSpawns: false,
    playerSpeedMultiplier: 0.8, // -20% player speed
    playerDamageMultiplier: 0.9,
    playerDefenseMultiplier: 0.8,
    screenShake: true,
    screenShakeIntensity: 0.6,
    overlayEffect: 'red_flash',
    shouldTriggerPortal: true,
    portalType: 'STOP_LOSS',
    stressIncrease: 0.4,
    engagementIncrease: 0.1,
    durationMs: 15000,
  },

  PRICE_BREAKOUT: {
    spawnRateMultiplier: 1.1,
    eliteChanceBonus: 0.2,
    bossSpawn: false,
    pauseNormalSpawns: false,
    playerSpeedMultiplier: 1.15, // +15% speed
    playerDamageMultiplier: 1.2, // +20% damage
    playerDefenseMultiplier: 1.0,
    screenShake: false,
    screenShakeIntensity: 0,
    overlayEffect: 'green_pulse',
    shouldTriggerPortal: true,
    portalType: 'TAKE_PROFIT',
    stressIncrease: -0.1,
    engagementIncrease: 0.3,
    durationMs: 25000,
  },

  CONSOLIDATION: {
    spawnRateMultiplier: 0.6, // -40% spawn rate
    eliteChanceBonus: -0.2,
    bossSpawn: false,
    pauseNormalSpawns: false,
    playerSpeedMultiplier: 1.0,
    playerDamageMultiplier: 1.0,
    playerDefenseMultiplier: 1.2, // +20% defense for healing
    screenShake: false,
    screenShakeIntensity: 0,
    overlayEffect: 'blue_calm',
    shouldTriggerPortal: false,
    portalType: null,
    stressIncrease: -0.2,
    engagementIncrease: -0.1,
    durationMs: 30000,
  },
};

/**
 * MarketEventMapperV2 - Singleton service
 */
class MarketEventMapperV2Class {
  private static instance: MarketEventMapperV2Class | null = null;

  // Active effects
  private activeEffects: ActiveEffect[] = [];

  // Accumulated modifiers (from all active effects)
  private accumulatedModifiers = {
    spawnRateMultiplier: 1.0,
    eliteChanceBonus: 0,
    playerSpeedMultiplier: 1.0,
    playerDamageMultiplier: 1.0,
    playerDefenseMultiplier: 1.0,
    bossActive: false,
    pauseNormalSpawns: false,
  };

  // Event history for analytics
  private eventHistory: Array<{
    type: GameMarketEvent;
    timestamp: number;
    intensity: number;
  }> = [];

  private constructor() {
    // Subscribe to market events
    EventBus.on('gameMarketEvent', (payload: MarketEventPayload) => {
      this.onMarketEvent(payload);
    });

    // Reset on game reset
    EventBus.on('gameReset', () => this.reset());

    Logger.debug('[MarketEventMapperV2] Initialized');
  }

  static getInstance(): MarketEventMapperV2Class {
    return (MarketEventMapperV2Class.instance ??= new MarketEventMapperV2Class());
  }

  /**
   * Handle incoming market event
   */
  private onMarketEvent(payload: MarketEventPayload): void {
    const { type, intensity, durationMs } = payload;

    // Check if same event type is already active
    const existingIndex = this.activeEffects.findIndex(e => e.type === type);
    if (existingIndex >= 0) {
      // Refresh duration instead of stacking
      const existing = this.activeEffects[existingIndex];
      if (existing) {
        existing.endTime = Date.now() + durationMs;
        existing.intensity = Math.max(existing.intensity, intensity);
        Logger.debug(`[MarketEventMapperV2] Refreshed ${type} effect`);
        return;
      }
    }

    const baseEffect = MARKET_EVENT_EFFECTS[type];

    // Scale effect by intensity
    const scaledEffect = this.scaleEffect(baseEffect, intensity);

    // Create active effect
    const activeEffect: ActiveEffect = {
      type,
      effect: scaledEffect,
      startTime: Date.now(),
      endTime: Date.now() + (durationMs || baseEffect.durationMs),
      intensity,
    };

    this.activeEffects.push(activeEffect);
    this.eventHistory.push({ type, timestamp: Date.now(), intensity });

    Logger.info(`[MarketEventMapperV2] Activated ${type} effect`, {
      intensity,
      duration: scaledEffect.durationMs,
    });

    // Emit gameplay events
    this.emitGameplayEvents(type, scaledEffect, intensity);

    // Recalculate accumulated modifiers
    this.recalculateModifiers();
  }

  /**
   * Scale effect values by intensity
   */
  private scaleEffect(base: MarketEventEffect, intensity: number): MarketEventEffect {
    // Intensity ranges from 0 to 1, scale appropriately
    const scale = 0.5 + intensity * 0.5; // Range: 0.5 to 1.0

    return {
      ...base,
      spawnRateMultiplier: 1 + (base.spawnRateMultiplier - 1) * scale,
      eliteChanceBonus: base.eliteChanceBonus * scale,
      playerSpeedMultiplier: 1 + (base.playerSpeedMultiplier - 1) * scale,
      playerDamageMultiplier: 1 + (base.playerDamageMultiplier - 1) * scale,
      playerDefenseMultiplier: 1 + (base.playerDefenseMultiplier - 1) * scale,
      screenShakeIntensity: base.screenShakeIntensity * intensity,
      stressIncrease: base.stressIncrease * scale,
      engagementIncrease: base.engagementIncrease * scale,
    };
  }

  /**
   * Emit gameplay-specific events based on effect
   */
  private emitGameplayEvents(
    type: GameMarketEvent,
    effect: MarketEventEffect,
    intensity: number
  ): void {
    // Screen shake
    if (effect.screenShake) {
      EventBus.emit('screenShake', {
        intensity: effect.screenShakeIntensity,
        duration: Math.min(2000, effect.durationMs / 4),
      });
    }

    // Visual overlay
    if (effect.overlayEffect !== 'none') {
      EventBus.emit('visualOverlay', {
        effect: effect.overlayEffect,
        intensity,
        durationMs: effect.durationMs,
      });
    }

    // Boss spawn
    if (effect.bossSpawn) {
      EventBus.emit('spawnBoss', {
        type: 'whale',
        tier: Math.ceil(intensity * 3), // Tier 1-3 based on intensity
      });
    }

    // Player buff/debuff
    const hasPlayerEffect =
      effect.playerSpeedMultiplier !== 1.0 ||
      effect.playerDamageMultiplier !== 1.0 ||
      effect.playerDefenseMultiplier !== 1.0;

    if (hasPlayerEffect) {
      EventBus.emit('playerModifierApplied', {
        source: `market_${type}`,
        speedMultiplier: effect.playerSpeedMultiplier,
        damageMultiplier: effect.playerDamageMultiplier,
        defenseMultiplier: effect.playerDefenseMultiplier,
        durationMs: effect.durationMs,
      });
    }

    // Flow state influence
    if (effect.stressIncrease !== 0 || effect.engagementIncrease !== 0) {
      EventBus.emit('marketFlowInfluence', {
        stressChange: effect.stressIncrease,
        engagementChange: effect.engagementIncrease,
        source: type,
      });
    }

    // Notify UnifiedDirector of market event
    EventBus.emit('marketEventActive', {
      type,
      intensity,
      spawnModifier: effect.spawnRateMultiplier,
      eliteModifier: effect.eliteChanceBonus,
    });
  }

  /**
   * Update - call every frame to manage active effects
   */
  update(_dt: number): void {
    const now = Date.now();
    let needsRecalc = false;

    // Check for expired effects
    for (let i = this.activeEffects.length - 1; i >= 0; i--) {
      const effect = this.activeEffects[i];
      if (effect && now >= effect.endTime) {
        Logger.debug(`[MarketEventMapperV2] ${effect.type} effect expired`);

        // Emit expiration event
        EventBus.emit('marketEventExpired', {
          type: effect.type,
        });

        // Remove player modifier
        EventBus.emit('playerModifierRemoved', {
          source: `market_${effect.type}`,
        });

        this.activeEffects.splice(i, 1);
        needsRecalc = true;
      }
    }

    if (needsRecalc) {
      this.recalculateModifiers();
    }
  }

  /**
   * Recalculate accumulated modifiers from all active effects
   */
  private recalculateModifiers(): void {
    // Reset to defaults
    this.accumulatedModifiers = {
      spawnRateMultiplier: 1.0,
      eliteChanceBonus: 0,
      playerSpeedMultiplier: 1.0,
      playerDamageMultiplier: 1.0,
      playerDefenseMultiplier: 1.0,
      bossActive: false,
      pauseNormalSpawns: false,
    };

    // Apply all active effects (multiplicative for multipliers, additive for bonuses)
    for (const active of this.activeEffects) {
      const e = active.effect;
      this.accumulatedModifiers.spawnRateMultiplier *= e.spawnRateMultiplier;
      this.accumulatedModifiers.eliteChanceBonus += e.eliteChanceBonus;
      this.accumulatedModifiers.playerSpeedMultiplier *= e.playerSpeedMultiplier;
      this.accumulatedModifiers.playerDamageMultiplier *= e.playerDamageMultiplier;
      this.accumulatedModifiers.playerDefenseMultiplier *= e.playerDefenseMultiplier;

      if (e.bossSpawn) this.accumulatedModifiers.bossActive = true;
      if (e.pauseNormalSpawns) this.accumulatedModifiers.pauseNormalSpawns = true;
    }
  }

  // --- Public API ---

  /**
   * Get current spawn rate multiplier from market events
   */
  getSpawnRateMultiplier(): number {
    return this.accumulatedModifiers.spawnRateMultiplier;
  }

  /**
   * Get current elite chance bonus from market events
   */
  getEliteChanceBonus(): number {
    return this.accumulatedModifiers.eliteChanceBonus;
  }

  /**
   * Get player modifiers from market events
   */
  getPlayerModifiers(): {
    speed: number;
    damage: number;
    defense: number;
  } {
    return {
      speed: this.accumulatedModifiers.playerSpeedMultiplier,
      damage: this.accumulatedModifiers.playerDamageMultiplier,
      defense: this.accumulatedModifiers.playerDefenseMultiplier,
    };
  }

  /**
   * Check if normal spawns should be paused (boss active)
   */
  shouldPauseNormalSpawns(): boolean {
    return this.accumulatedModifiers.pauseNormalSpawns;
  }

  /**
   * Check if a boss is currently active
   */
  isBossActive(): boolean {
    return this.accumulatedModifiers.bossActive;
  }

  /**
   * Get all active effects
   */
  getActiveEffects(): ReadonlyArray<{
    type: GameMarketEvent;
    timeRemaining: number;
    intensity: number;
  }> {
    const now = Date.now();
    return this.activeEffects.map(e => ({
      type: e.type,
      timeRemaining: Math.max(0, e.endTime - now),
      intensity: e.intensity,
    }));
  }

  /**
   * Get event history for analytics
   */
  getEventHistory(): ReadonlyArray<{
    type: GameMarketEvent;
    timestamp: number;
    intensity: number;
  }> {
    return [...this.eventHistory];
  }

  /**
   * Check if specific event type is active
   */
  isEventActive(type: GameMarketEvent): boolean {
    return this.activeEffects.some(e => e.type === type);
  }

  /**
   * Get debug state
   */
  getDebugState(): Record<string, unknown> {
    return {
      activeEffects: this.activeEffects.map(e => ({
        type: e.type,
        intensity: e.intensity.toFixed(2),
        remaining: ((e.endTime - Date.now()) / 1000).toFixed(1) + 's',
      })),
      modifiers: {
        spawnRate: this.accumulatedModifiers.spawnRateMultiplier.toFixed(2),
        eliteBonus: this.accumulatedModifiers.eliteChanceBonus.toFixed(2),
        playerSpeed: this.accumulatedModifiers.playerSpeedMultiplier.toFixed(2),
        playerDamage: this.accumulatedModifiers.playerDamageMultiplier.toFixed(2),
        playerDefense: this.accumulatedModifiers.playerDefenseMultiplier.toFixed(2),
      },
      bossActive: this.accumulatedModifiers.bossActive,
      pauseSpawns: this.accumulatedModifiers.pauseNormalSpawns,
      eventCount: this.eventHistory.length,
    };
  }

  /**
   * Reset state
   */
  reset(): void {
    this.activeEffects = [];
    this.eventHistory = [];
    this.accumulatedModifiers = {
      spawnRateMultiplier: 1.0,
      eliteChanceBonus: 0,
      playerSpeedMultiplier: 1.0,
      playerDamageMultiplier: 1.0,
      playerDefenseMultiplier: 1.0,
      bossActive: false,
      pauseNormalSpawns: false,
    };
    Logger.debug('[MarketEventMapperV2] Reset');
  }
}

// Export singleton instance
export const MarketEventMapperV2 = MarketEventMapperV2Class.getInstance();

// For testing - allows creating fresh instances
export function createMarketEventMapperV2(): MarketEventMapperV2Class {
  (MarketEventMapperV2Class as unknown as { instance: null }).instance = null;
  return MarketEventMapperV2Class.getInstance();
}
