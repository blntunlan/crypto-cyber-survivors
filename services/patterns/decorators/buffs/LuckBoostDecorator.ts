/**
 * LuckBoostDecorator - Luck and gem collection buff
 *
 * Increases rare drop chances and gem magnet range.
 * +30% luck, +50% magnet range.
 */

import { StatDecorator } from '../BaseDecorator';

export class LuckBoostDecorator extends StatDecorator {
  private static readonly LUCK_MULTIPLIER = 1.3;
  private static readonly MAGNET_MULTIPLIER = 1.5;
  private static readonly DURATION_MS = 15000;

  getLuck(): number {
    return this.wrapped.getLuck() * LuckBoostDecorator.LUCK_MULTIPLIER;
  }

  getMagnet(): number {
    return this.wrapped.getMagnet() * LuckBoostDecorator.MAGNET_MULTIPLIER;
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
    return '+30% luck, +50% magnet range';
  }
}
