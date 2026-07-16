import { LOOT_CACHE_CONFIG } from '../../../../config/LootCacheConfig';
import { StatDecorator } from '../BaseDecorator';

export class OverclockContractDecorator extends StatDecorator {
  getDamage(): number {
    return this.wrapped.getDamage() * 1.25;
  }

  getFireRate(): number {
    return this.wrapped.getFireRate() / 1.3;
  }

  getName(): string {
    return 'Overclock Contract';
  }

  getIcon(): string {
    return '⚡';
  }

  getDuration(): number {
    return LOOT_CACHE_CONFIG.rewards.overclockDurationMs;
  }

  getDescription(): string {
    return '+25% damage, +30% fire rate';
  }
}
