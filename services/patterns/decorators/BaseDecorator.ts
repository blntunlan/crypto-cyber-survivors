/**
 * BaseDecorator - Abstract base class for all stat decorators
 *
 * Implements the Decorator Pattern for player stat modifications.
 * Subclasses override specific methods to modify stats.
 */

import { type IPlayerStats } from './IPlayerStats';

export abstract class StatDecorator implements IPlayerStats {
  constructor(protected wrapped: IPlayerStats) {}

  // Default implementations delegate to wrapped object
  getDamage(): number {
    return this.wrapped.getDamage();
  }

  getSpeed(): number {
    return this.wrapped.getSpeed();
  }

  getFireRate(): number {
    return this.wrapped.getFireRate();
  }

  getCritChance(): number {
    return this.wrapped.getCritChance();
  }

  getCritDamage(): number {
    return this.wrapped.getCritDamage();
  }

  getArmor(): number {
    return this.wrapped.getArmor();
  }

  getMagnet(): number {
    return this.wrapped.getMagnet();
  }

  getProjectiles(): number {
    return this.wrapped.getProjectiles();
  }

  getArea(): number {
    return this.wrapped.getArea();
  }

  getLuck(): number {
    return this.wrapped.getLuck();
  }

  getLifesteal(): number {
    return this.wrapped.getLifesteal();
  }

  getDodge(): number {
    return this.wrapped.getDodge();
  }

  // Decorator metadata - subclasses must implement
  abstract getName(): string;
  abstract getIcon(): string;
  abstract getDuration(): number; // ms, -1 = permanent
  abstract getDescription(): string;
}

// Type for decorator constructor
export type DecoratorConstructor = new (wrapped: IPlayerStats) => StatDecorator;
