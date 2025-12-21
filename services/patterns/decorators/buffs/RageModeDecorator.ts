/**
 * RageModeDecorator - Temporary damage and speed buff
 *
 * Triggered when player is on a kill streak or from certain cards.
 * +50% damage, +20% speed for 10 seconds.
 */

import { StatDecorator } from '../BaseDecorator';

export class RageModeDecorator extends StatDecorator {
  private static readonly DAMAGE_MULTIPLIER = 1.5;
  private static readonly SPEED_MULTIPLIER = 1.2;
  private static readonly DURATION_MS = 10000;

  getDamage(): number {
    return this.wrapped.getDamage() * RageModeDecorator.DAMAGE_MULTIPLIER;
  }

  getSpeed(): number {
    return this.wrapped.getSpeed() * RageModeDecorator.SPEED_MULTIPLIER;
  }

  getName(): string {
    return 'Rage Mode';
  }

  getIcon(): string {
    return '🔥';
  }

  getDuration(): number {
    return RageModeDecorator.DURATION_MS;
  }

  getDescription(): string {
    return '+50% damage, +20% speed';
  }
}
