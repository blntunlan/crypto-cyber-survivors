/**
 * BuffManager - Centralized Buff/Debuff Management Service
 *
 * Singleton service that manages all active buffs and debuffs on the player.
 * Uses the Decorator Pattern to stack stat modifiers.
 *
 * Features:
 * - Add/remove buffs and debuffs
 * - Automatic expiration of timed effects
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
import { EventBus } from '../../EventBus';
import { Logger } from '../../Logger';

interface ActiveEffect {
  id: string;
  decorator: StatDecorator;
  expiresAt: number; // timestamp, -1 = permanent
  appliedAt: number;
  remainingWhenPaused: number; // ms remaining when paused, -1 if not paused or permanent
}

interface BuffManagerState {
  activeEffects: ActiveEffect[];
  baseStats: IPlayerStats | null;
  isInitialized: boolean;
  isPaused: boolean;
  pausedAt: number; // timestamp when paused
}

class BuffManagerClass {
  private static instance: BuffManagerClass | null = null;

  private state: BuffManagerState = {
    activeEffects: [],
    baseStats: null,
    isInitialized: false,
    isPaused: false,
    pausedAt: 0,
  };

  private effectIdCounter: number = 0;

  private constructor() {
    // Listen for game reset to clear all effects
    EventBus.on('gameReset', () => {
      this.reset();
    });
  }

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
    this.state.pausedAt = 0;
    this.effectIdCounter = 0;

    Logger.debug('[BuffManager] Initialized');
  }

  /**
   * Update the base player stats (call when player stats change).
   */
  updateBaseStats(player: Player): void {
    if (!this.state.isInitialized) {
      Logger.warn('[BuffManager] Not initialized, call initialize() first');
      return;
    }
    this.state.baseStats = new PlayerStatsAdapter(player);
  }

  /**
   * Add a buff/debuff to the player.
   * If the same effect already exists, extends its duration instead of stacking.
   * Returns the effect ID for later removal.
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
    const now = Date.now();

    // Check if same effect already exists
    const existingEffect = this.state.activeEffects.find(e => e.decorator.getName() === effectName);

    if (existingEffect) {
      // Permanent effects: do nothing if already active
      if (existingEffect.expiresAt === -1) {
        Logger.debug(`[BuffManager] ${effectName} is permanent, already active`);
        return existingEffect.id;
      }

      // Temporary effects: extend duration
      if (duration !== -1) {
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
      expiresAt: duration === -1 ? -1 : now + duration,
      appliedAt: now,
      remainingWhenPaused: -1,
    };

    this.state.activeEffects.push(effect);

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
   * Remove an effect by its ID.
   */
  removeEffectById(effectId: string): boolean {
    const index = this.state.activeEffects.findIndex(e => e.id === effectId);
    if (index === -1) return false;

    const effect = this.state.activeEffects[index];
    if (effect) {
      EventBus.emit('buffExpired', { name: effect.decorator.getName() });
      Logger.debug(`[BuffManager] Removed effect: ${effect.decorator.getName()}`);
    }

    this.state.activeEffects.splice(index, 1);
    return true;
  }

  /**
   * Remove all effects with a specific name.
   */
  removeEffectByName(name: string): number {
    const toRemove = this.state.activeEffects.filter(e => e.decorator.getName() === name);

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
   * Update effect timers - call each frame.
   * Removes expired effects automatically.
   * Does nothing if paused.
   */
  update(): void {
    if (!this.state.isInitialized || this.state.isPaused) return;

    const now = Date.now();
    const expired = this.state.activeEffects.filter(e => e.expiresAt !== -1 && e.expiresAt <= now);

    for (const effect of expired) {
      EventBus.emit('buffExpired', { name: effect.decorator.getName() });
      Logger.debug(`[BuffManager] Effect expired: ${effect.decorator.getName()}`);
    }

    this.state.activeEffects = this.state.activeEffects.filter(
      e => e.expiresAt === -1 || e.expiresAt > now
    );
  }

  /**
   * Pause all effect timers (for LevelUp screen, Pause menu).
   * Stores remaining time for each effect.
   */
  pause(): void {
    if (!this.state.isInitialized || this.state.isPaused) return;

    const now = Date.now();
    this.state.isPaused = true;
    this.state.pausedAt = now;

    // Store remaining time for each temporary effect
    for (const effect of this.state.activeEffects) {
      if (effect.expiresAt !== -1) {
        effect.remainingWhenPaused = Math.max(0, effect.expiresAt - now);
      }
    }

    Logger.debug('[BuffManager] Paused');
  }

  /**
   * Resume effect timers after pause.
   * Recalculates expiration times based on stored remaining time.
   */
  resume(): void {
    if (!this.state.isInitialized || !this.state.isPaused) return;

    const now = Date.now();
    this.state.isPaused = false;

    // Recalculate expiration times based on remaining time
    for (const effect of this.state.activeEffects) {
      if (effect.remainingWhenPaused > 0) {
        effect.expiresAt = now + effect.remainingWhenPaused;
        effect.remainingWhenPaused = -1;
      }
    }

    Logger.debug('[BuffManager] Resumed');
  }

  /**
   * Check if buff manager is currently paused.
   */
  isPaused(): boolean {
    return this.state.isPaused;
  }

  /**
   * Get the decorated stats with all active effects applied.
   * This is the main method to use for stat calculations.
   */
  getDecoratedStats(): IPlayerStats {
    if (!this.state.isInitialized || !this.state.baseStats) {
      throw new Error('[BuffManager] Not initialized');
    }

    // Start with base stats
    let stats: IPlayerStats = this.state.baseStats;

    // Apply each effect in order (newer effects wrap older ones)
    for (const effect of this.state.activeEffects) {
      const DecoratorClass = effect.decorator.constructor as DecoratorConstructor;
      stats = new DecoratorClass(stats);
    }

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
    // When paused, use stored remaining time instead of calculating from now
    if (this.state.isPaused) {
      return this.state.activeEffects.map(effect => ({
        id: effect.id,
        name: effect.decorator.getName(),
        icon: effect.decorator.getIcon(),
        description: effect.decorator.getDescription(),
        remainingMs: effect.expiresAt === -1 ? -1 : effect.remainingWhenPaused,
        isPermanent: effect.expiresAt === -1,
      }));
    }

    const now = Date.now();
    return this.state.activeEffects.map(effect => ({
      id: effect.id,
      name: effect.decorator.getName(),
      icon: effect.decorator.getIcon(),
      description: effect.decorator.getDescription(),
      remainingMs: effect.expiresAt === -1 ? -1 : Math.max(0, effect.expiresAt - now),
      isPermanent: effect.expiresAt === -1,
    }));
  }

  /**
   * Get count of active buffs (positive effects).
   */
  getBuffCount(): number {
    // For simplicity, we consider effects with positive names as buffs
    // In a real implementation, you might add an 'isDebuff' method to decorators
    return this.state.activeEffects.length;
  }

  /**
   * Clear all effects.
   */
  clearAll(): void {
    for (const effect of this.state.activeEffects) {
      EventBus.emit('buffExpired', { name: effect.decorator.getName() });
    }

    this.state.activeEffects = [];
    Logger.debug('[BuffManager] Cleared all effects');
  }

  /**
   * Clear only temporary effects (keep permanent ones).
   */
  clearTemporary(): void {
    const temporary = this.state.activeEffects.filter(e => e.expiresAt !== -1);

    for (const effect of temporary) {
      EventBus.emit('buffExpired', { name: effect.decorator.getName() });
    }

    this.state.activeEffects = this.state.activeEffects.filter(e => e.expiresAt === -1);

    Logger.debug(`[BuffManager] Cleared ${temporary.length} temporary effects`);
  }

  /**
   * Reset the buff manager (for game restart).
   */
  reset(): void {
    this.state = {
      activeEffects: [],
      baseStats: null,
      isInitialized: false,
      isPaused: false,
      pausedAt: 0,
    };
    this.effectIdCounter = 0;

    Logger.debug('[BuffManager] Reset');
  }

  /**
   * Check if the manager is initialized.
   */
  isInitialized(): boolean {
    return this.state.isInitialized;
  }
}

// Export singleton instance
export const BuffManager = BuffManagerClass.getInstance();
