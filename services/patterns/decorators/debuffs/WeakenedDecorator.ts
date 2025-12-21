/**
 * WeakenedDecorator - General weakness debuff
 *
 * Applied by FUD enemies or prolonged low HP.
 * Reduces damage and luck.
 */

import { StatDecorator } from '../BaseDecorator';

export class WeakenedDecorator extends StatDecorator {
  private static readonly DAMAGE_PENALTY = 0.7;
  private static readonly LUCK_PENALTY = 0.6;
  private static readonly DURATION_MS = 6000;

  getDamage(): number {
    return this.wrapped.getDamage() * WeakenedDecorator.DAMAGE_PENALTY;
  }

  getLuck(): number {
    return this.wrapped.getLuck() * WeakenedDecorator.LUCK_PENALTY;
  }

  getName(): string {
    return 'Weakened';
  }

  getIcon(): string {
    return '💀';
  }

  getDuration(): number {
    return WeakenedDecorator.DURATION_MS;
  }

  getDescription(): string {
    return '-30% damage, -40% luck';
  }
}
