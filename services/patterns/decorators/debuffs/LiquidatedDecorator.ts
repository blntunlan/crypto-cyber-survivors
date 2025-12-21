/**
 * LiquidatedDecorator - Severe market crash debuff
 *
 * Applied when PnL goes extremely negative (liquidation event).
 * Reduces all offensive stats significantly.
 */

import { StatDecorator } from '../BaseDecorator';

export class LiquidatedDecorator extends StatDecorator {
  private static readonly DAMAGE_PENALTY = 0.5;
  private static readonly FIRE_RATE_PENALTY = 0.7;
  private static readonly CRIT_PENALTY = 0.5;
  private static readonly DURATION_MS = 8000;

  getDamage(): number {
    return this.wrapped.getDamage() * LiquidatedDecorator.DAMAGE_PENALTY;
  }

  getFireRate(): number {
    return this.wrapped.getFireRate() * LiquidatedDecorator.FIRE_RATE_PENALTY;
  }

  getCritChance(): number {
    return this.wrapped.getCritChance() * LiquidatedDecorator.CRIT_PENALTY;
  }

  getName(): string {
    return 'Liquidated';
  }

  getIcon(): string {
    return '📉';
  }

  getDuration(): number {
    return LiquidatedDecorator.DURATION_MS;
  }

  getDescription(): string {
    return '-50% damage, -30% fire rate, -50% crit';
  }
}
