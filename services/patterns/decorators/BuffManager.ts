/**
 * BuffManager - Centralized Buff/Debuff Management Service
 *
 * Singleton service that manages all active buffs and debuffs on the player.
 * Uses the Decorator Pattern to stack stat modifiers.
 *
 * Features:
 * - Add/remove buffs and debuffs
 * - Automatic expiration of timed effects using TimeService
 * - Stack tracking and UI integration
 * - EventBus integration for visual feedback
 *
 * @example
 * BuffManager.initialize(playerRef.current);
 * BuffManager.addBuff(RageModeDecorator);
 * const stats = BuffManager.getDecoratedStats();
 */

import { type Player } from '../../../types';
import { type IPlayerStats } from './IPlayerStats';
import { PlayerStatsAdapter } from './PlayerStatsAdapter';
import { type StatDecorator, type DecoratorConstructor } from './BaseDecorator';
import { EventBus } from '../../core/EventBus';
import { Logger } from '../../system/Logger';
import { TimeService } from '../../core/TimeService';

/** Constant for permanent effects */
const PERMANENT_DURATION = -1;

interface ActiveEffect {
  id: string;
  decorator: StatDecorator;
  /** Expiration timestamp in Game Time (ms). -1 for permanent. */
  expiresAt: number;
  appliedAt: number;
  /** Remaining time in ms when paused. Used to recalculate expiresAt on resume. */
  remainingWhenPaused: number;
}

interface BuffManagerState {
  activeEffects: ActiveEffect[];
  baseStats: IPlayerStats | null;
  isInitialized: boolean;
  isPaused: boolean;
}

class BuffManagerClass {
  private static instance: BuffManagerClass | null = null;

  private state: BuffManagerState = {
    activeEffects: [],
    baseStats: null,
    isInitialized: false,
    isPaused: false,
  };

  private effectIdCounter: number = 0;

  // Stats cache to avoid rebuilding decorator chain every frame
  private cachedStats: IPlayerStats | null = null;
  private statsCacheDirty: boolean = true;

  private constructor() {
    // Listen for game reset to clear all effects
    EventBus.on('gameReset', () => {
      this.reset();
    });
  }

  /**
   * Returns the singleton instance of BuffManager.
   */
  static getInstance(): BuffManagerClass {
    return (BuffManagerClass.instance ??= new BuffManagerClass());
  }

  /**
   * Initialize the buff manager with a player reference.
   * Must be called before using any other methods.
   */
  initialize(player: Player): void {
    this.state.baseStats = new PlayerStatsAdapter(player);
    this.state.activeEffects = [];
    this.state.isInitialized = true;
    this.state.isPaused = false;
    this.effectIdCounter = 0;

    Logger.debug('[BuffManager] Initialized');
  }

  /**
   * Update the base player stats (called when player baseline stats change, e.g. leveling up).
   */
  updateBaseStats(player: Player): void {
    if (!this.state.isInitialized) {
      Logger.warn('[BuffManager] Not initialized, call initialize() first');
      return;
    }
    this.state.baseStats = new PlayerStatsAdapter(player);
    this.statsCacheDirty = true;
  }

  /**
   * Add a buff/debuff to the player.
   * If the same effect already exists, extends its duration instead of stacking.
   *
   * @param DecoratorClass - The class constructor for the decorator
   * @returns The unique ID of the applied effect
   */
  addEffect(DecoratorClass: DecoratorConstructor): string {
    if (!this.state.isInitialized || !this.state.baseStats) {
      Logger.warn('[BuffManager] Cannot add effect - not initialized');
      return '';
    }

    // Create a temporary decorator to get metadata
    const tempDecorator = new DecoratorClass(this.state.baseStats);
    const effectName = tempDecorator.getName();
    const duration = tempDecorator.getDuration();
    const now = TimeService.getGameTime();

    // Check if same effect already exists
    const existingEffect = this.state.activeEffects.find(
      e => e.decorator.getName() === effectName
    );

    if (existingEffect) {
      // Permanent effects: do nothing if already active
      if (existingEffect.expiresAt === PERMANENT_DURATION) {
        Logger.debug(`[BuffManager] ${effectName} is permanent, already active`);
        return existingEffect.id;
      }

      // Temporary effects: extend duration
      if (duration !== PERMANENT_DURATION) {
        const currentRemaining = this.state.isPaused
          ? existingEffect.remainingWhenPaused
          : Math.max(0, existingEffect.expiresAt - now);

        const newRemaining = currentRemaining + duration;

        if (this.state.isPaused) {
          existingEffect.remainingWhenPaused = newRemaining;
        } else {
          existingEffect.expiresAt = now + newRemaining;
        }

        // Emit refresh event for UI
        EventBus.emit('buffApplied', {
          name: effectName,
          icon: tempDecorator.getIcon(),
          duration: newRemaining,
        });

        Logger.debug(`[BuffManager] Extended ${effectName} duration by ${duration}ms`);
        return existingEffect.id;
      }
    }

    // No existing effect, add new one
    const effect: ActiveEffect = {
      id: `effect_${++this.effectIdCounter}`,
      decorator: tempDecorator,
      expiresAt: duration === PERMANENT_DURATION ? PERMANENT_DURATION : now + duration,
      appliedAt: now,
      remainingWhenPaused: PERMANENT_DURATION,
    };

    // If paused, immediately calculate remaining time
    if (this.state.isPaused && duration !== PERMANENT_DURATION) {
      effect.remainingWhenPaused = duration;
    }

    this.state.activeEffects.push(effect);
    this.statsCacheDirty = true;

    // Emit event for UI
    EventBus.emit('buffApplied', {
      name: effectName,
      icon: tempDecorator.getIcon(),
      duration,
    });

    Logger.debug(`[BuffManager] Added effect: ${effectName}`);

    return effect.id;
  }

  /**
   * Convenience method to add a buff.
   */
  addBuff(DecoratorClass: DecoratorConstructor): string {
    return this.addEffect(DecoratorClass);
  }

  /**
   * Convenience method to add a debuff.
   */
  addDebuff(DecoratorClass: DecoratorConstructor): string {
    return this.addEffect(DecoratorClass);
  }

  /**
   * Remove an effect by its unique ID.
   */
  removeEffectById(effectId: string): boolean {
    const index = this.state.activeEffects.findIndex(e => e.id === effectId);
    if (index === -1) {
      return false;
    }

    const effect = this.state.activeEffects[index];
    if (effect) {
      EventBus.emit('buffExpired', { name: effect.decorator.getName() });
      Logger.debug(`[BuffManager] Removed effect: ${effect.decorator.getName()}`);
    }

    this.state.activeEffects.splice(index, 1);
    this.statsCacheDirty = true;
    return true;
  }

  /**
   * Remove all effects with a specific name.
   */
  removeEffectByName(name: string): number {
    const toRemove = this.state.activeEffects.filter(
      e => e.decorator.getName() === name
    );

    for (const effect of toRemove) {
      this.removeEffectById(effect.id);
    }

    return toRemove.length;
  }

  /**
   * Check if the player has an effect with the given name.
   */
  hasEffect(name: string): boolean {
    return this.state.activeEffects.some(e => e.decorator.getName() === name);
  }

  /**
   * Update effect timers - call each frame in the game loop.
   * Uses in-place swap-and-pop to avoid array allocations.
   */
  update(): void {
    if (!this.state.isInitialized || this.state.isPaused) {
      return;
    }

    const now = TimeService.getGameTime();
    const effects = this.state.activeEffects;

    // In-place removal using swap-and-pop (O(n) with zero allocations)
    for (let i = effects.length - 1; i >= 0; i--) {
      const e = effects[i]!;
      if (e.expiresAt !== PERMANENT_DURATION && e.expiresAt <= now) {
        EventBus.emit('buffExpired', { name: e.decorator.getName() });
        Logger.debug(`[BuffManager] Effect expired: ${e.decorator.getName()}`);

        // Swap with last element and pop (O(1) removal)
        effects[i] = effects[effects.length - 1]!;
        effects.pop();
        this.statsCacheDirty = true;
      }
    }
  }

  /**
   * Pause effect processing. Stores remaining time for temporary effects.
   */
  pause(): void {
    if (!this.state.isInitialized || this.state.isPaused) {
      return;
    }

    const now = TimeService.getGameTime();
    this.state.isPaused = true;

    for (const effect of this.state.activeEffects) {
      if (effect.expiresAt !== PERMANENT_DURATION) {
        effect.remainingWhenPaused = Math.max(0, effect.expiresAt - now);
      }
    }

    Logger.debug('[BuffManager] Paused');
  }

  /**
   * Resume effect processing. Recalculates expiration timestamps.
   */
  resume(): void {
    if (!this.state.isInitialized || !this.state.isPaused) {
      return;
    }

    const now = TimeService.getGameTime();
    this.state.isPaused = false;

    for (const effect of this.state.activeEffects) {
      if (effect.remainingWhenPaused !== PERMANENT_DURATION) {
        effect.expiresAt = now + effect.remainingWhenPaused;
        effect.remainingWhenPaused = PERMANENT_DURATION;
      }
    }

    Logger.debug('[BuffManager] Resumed');
  }

  /**
   * Get current pause state.
   */
  isPaused(): boolean {
    return this.state.isPaused;
  }

  /**
   * Get the decorated stats with all active effects applied.
   * Uses caching to avoid rebuilding decorator chain every frame.
   */
  getDecoratedStats(): IPlayerStats {
    if (!this.state.isInitialized || !this.state.baseStats) {
      throw new Error('[BuffManager] Not initialized');
    }

    // Return cached stats if still valid
    if (!this.statsCacheDirty && this.cachedStats) {
      return this.cachedStats;
    }

    // Rebuild decorator chain
    let stats: IPlayerStats = this.state.baseStats;
    for (const effect of this.state.activeEffects) {
      const DecoratorClass = effect.decorator.constructor as DecoratorConstructor;
      stats = new DecoratorClass(stats);
    }

    // Cache the result
    this.cachedStats = stats;
    this.statsCacheDirty = false;

    return stats;
  }

  /**
   * Get list of active effects for UI display.
   */
  getActiveEffects(): {
    id: string;
    name: string;
    icon: string;
    description: string;
    remainingMs: number;
    isPermanent: boolean;
  }[] {
    const now = TimeService.getGameTime();

    return this.state.activeEffects.map(effect => {
      let remainingMs = PERMANENT_DURATION;
      if (effect.expiresAt !== PERMANENT_DURATION) {
        remainingMs = this.state.isPaused
          ? effect.remainingWhenPaused
          : Math.max(0, effect.expiresAt - now);
      }

      return {
        id: effect.id,
        name: effect.decorator.getName(),
        icon: effect.decorator.getIcon(),
        description: effect.decorator.getDescription(),
        remainingMs,
        isPermanent: effect.expiresAt === PERMANENT_DURATION,
      };
    });
  }

  /**
   * Get total count of active effects.
   */
  getBuffCount(): number {
    return this.state.activeEffects.length;
  }

  /**
   * Clear all active effects immediately.
   */
  clearAll(): void {
    for (const effect of this.state.activeEffects) {
      EventBus.emit('buffExpired', { name: effect.decorator.getName() });
    }

    this.state.activeEffects = [];
    Logger.debug('[BuffManager] Cleared all effects');
  }

  /**
   * Clear only temporary effects, retaining permanent ones (e.g. passive skills).
   */
  clearTemporary(): void {
    const temporary = this.state.activeEffects.filter(
      e => e.expiresAt !== PERMANENT_DURATION
    );

    for (const effect of temporary) {
      EventBus.emit('buffExpired', { name: effect.decorator.getName() });
    }

    this.state.activeEffects = this.state.activeEffects.filter(
      e => e.expiresAt === PERMANENT_DURATION
    );

    Logger.debug(`[BuffManager] Cleared ${temporary.length} temporary effects`);
  }

  /**
   * Reset the manager state for a new game session.
   */
  reset(): void {
    this.state = {
      activeEffects: [],
      baseStats: null,
      isInitialized: false,
      isPaused: false,
    };
    this.effectIdCounter = 0;

    Logger.debug('[BuffManager] Reset');
  }

  /**
   * Check if the manager is currently initialized.
   */
  isInitialized(): boolean {
    return this.state.isInitialized;
  }
}

// Export singleton instance
export const BuffManager = BuffManagerClass.getInstance();
export { PERMANENT_DURATION };
