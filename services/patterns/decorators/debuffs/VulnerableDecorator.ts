/**
 * VulnerableDecorator - Defense reduction debuff
 *
 * Applied during market crashes or by certain enemies.
 * Reduces armor and increases damage taken.
 */

import { StatDecorator } from '../BaseDecorator';

export class VulnerableDecorator extends StatDecorator {
  private static readonly ARMOR_REDUCTION = 0.5;
  private static readonly DURATION_MS = 5000;

  getArmor(): number {
    return this.wrapped.getArmor() * VulnerableDecorator.ARMOR_REDUCTION;
  }

  getName(): string {
    return 'Vulnerable';
  }

  getIcon(): string {
    return '🛡️';
  }

  getDuration(): number {
    return VulnerableDecorator.DURATION_MS;
  }

  getDescription(): string {
    return '-50% armor';
  }
}
