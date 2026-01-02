/**
 * BerserkDecorator - High risk, high reward buff
 *
 * Activated when HP is low (near-death mechanic).
 * +100% damage, +50% fire rate (faster attacks), but -30% armor.
 */

import { StatDecorator } from '../BaseDecorator';

export class BerserkDecorator extends StatDecorator {
  private static readonly DAMAGE_MULTIPLIER = 2.0;
  // Fire rate is delay in ms, so to go 50% faster we multiply by 0.67 (1/1.5)
  private static readonly FIRE_RATE_MULTIPLIER = 0.67;
  private static readonly ARMOR_PENALTY = 0.7;
  private static readonly DURATION_MS = 8000;

  getDamage(): number {
    return this.wrapped.getDamage() * BerserkDecorator.DAMAGE_MULTIPLIER;
  }

  getFireRate(): number {
    // Lower delay = faster firing
    return this.wrapped.getFireRate() * BerserkDecorator.FIRE_RATE_MULTIPLIER;
  }

  getArmor(): number {
    // Ensure armor doesn't go negative
    return Math.max(0, this.wrapped.getArmor() * BerserkDecorator.ARMOR_PENALTY);
  }

  getName(): string {
    return 'Berserk';
  }

  getIcon(): string {
    return '⚡';
  }

  getDuration(): number {
    return BerserkDecorator.DURATION_MS;
  }

  getDescription(): string {
    return '+100% damage, +50% fire rate, -30% armor';
  }
}
