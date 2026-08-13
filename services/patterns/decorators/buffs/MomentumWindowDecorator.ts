/**
 * MomentumWindowDecorator - Final Design Contract v1.0 §10
 *
 * The mechanical half of the MOMENTUM_WINDOW advantage: eight seconds of +10%
 * movement while the position is favourable. The matching dash-cooldown relief
 * is applied on the player by DirectorEffectApplier, because dash cooldown is
 * not part of the decorator stat surface.
 *
 * It grants no damage, no reward, and no token — advantage buys tempo, never
 * settlement value.
 */

import { StatDecorator } from '../BaseDecorator';

export class MomentumWindowDecorator extends StatDecorator {
  private static readonly SPEED_MULTIPLIER = 1.1;
  private static readonly DURATION_MS = 8000;

  getSpeed(): number {
    return this.wrapped.getSpeed() * MomentumWindowDecorator.SPEED_MULTIPLIER;
  }

  getName(): string {
    return 'Momentum Window';
  }

  getIcon(): string {
    return '🌊';
  }

  getDuration(): number {
    return MomentumWindowDecorator.DURATION_MS;
  }

  getDescription(): string {
    return '+10% movement, -10% dash cooldown';
  }
}
