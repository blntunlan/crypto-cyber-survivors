/**
 * BerserkDecorator - High risk, high reward buff
 *
 * Activated when HP is low (near-death mechanic).
 * +100% damage, +50% fire rate, but -30% armor.
 */

import { StatDecorator } from '../BaseDecorator';

export class BerserkDecorator extends StatDecorator {
  private static readonly DAMAGE_MULTIPLIER = 2.0;
  private static readonly FIRE_RATE_MULTIPLIER = 1.5;
  private static readonly ARMOR_PENALTY = 0.7;
  private static readonly DURATION_MS = 8000;

  getDamage(): number {
    return this.wrapped.getDamage() * BerserkDecorator.DAMAGE_MULTIPLIER;
  }

  getFireRate(): number {
    return this.wrapped.getFireRate() * BerserkDecorator.FIRE_RATE_MULTIPLIER;
  }

  getArmor(): number {
    return this.wrapped.getArmor() * BerserkDecorator.ARMOR_PENALTY;
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
