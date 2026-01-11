/**
 * SlowDecorator - Movement speed debuff
 *
 * Applied by certain enemy types or market events.
 * Reduces movement speed by configurable amount.
 */

import { StatDecorator } from '../BaseDecorator';
import { type IPlayerStats } from '../IPlayerStats';

export class SlowDecorator extends StatDecorator {
  private static readonly DEFAULT_SLOW_PERCENT = 0.5;
  private static readonly DURATION_MS = 3000;

  private slowPercent: number;

  constructor(
    wrapped: IPlayerStats,
    slowPercent: number = SlowDecorator.DEFAULT_SLOW_PERCENT
  ) {
    super(wrapped);
    this.slowPercent = slowPercent;
  }

  getSpeed(): number {
    return this.wrapped.getSpeed() * this.slowPercent;
  }

  getName(): string {
    return 'Slowed';
  }

  getIcon(): string {
    return '🐌';
  }

  getDuration(): number {
    return SlowDecorator.DURATION_MS;
  }

  getDescription(): string {
    return `-${Math.round((1 - this.slowPercent) * 100)}% movement speed`;
  }
}
