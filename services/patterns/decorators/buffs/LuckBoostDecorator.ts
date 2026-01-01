/**
 * LuckBoostDecorator - Luck and gem collection buff
 *
 * Increases rare drop chances and gem magnet range.
 * +2 luck, +50 magnet range (additive to work when base is 0).
 */

import { StatDecorator } from '../BaseDecorator';

export class LuckBoostDecorator extends StatDecorator {
  private static readonly LUCK_BONUS = 2; // Additive bonus
  private static readonly MAGNET_BONUS = 50; // Additive bonus
  private static readonly DURATION_MS = 15000;

  getLuck(): number {
    return this.wrapped.getLuck() + LuckBoostDecorator.LUCK_BONUS;
  }

  getMagnet(): number {
    return this.wrapped.getMagnet() + LuckBoostDecorator.MAGNET_BONUS;
  }

  getName(): string {
    return 'Lucky Star';
  }

  getIcon(): string {
    return '🍀';
  }

  getDuration(): number {
    return LuckBoostDecorator.DURATION_MS;
  }

  getDescription(): string {
    return '+2 luck, +50 magnet range';
  }
}
