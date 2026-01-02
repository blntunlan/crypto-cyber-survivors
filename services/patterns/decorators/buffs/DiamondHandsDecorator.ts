/**
 * DiamondHandsDecorator - Permanent defensive buff
 *
 * Crypto-themed buff for HODL players.
 * +5 armor, +10% crit chance (permanent).
 */

import { StatDecorator } from '../BaseDecorator';

export class DiamondHandsDecorator extends StatDecorator {
  private static readonly ARMOR_BONUS = 5;
  private static readonly CRIT_BONUS = 0.1;

  getArmor(): number {
    return this.wrapped.getArmor() + DiamondHandsDecorator.ARMOR_BONUS;
  }

  getCritChance(): number {
    // No cap here - system level cap (0.95) is applied in CombatSystem
    return this.wrapped.getCritChance() + DiamondHandsDecorator.CRIT_BONUS;
  }

  getName(): string {
    return 'Diamond Hands';
  }

  getIcon(): string {
    return '💎';
  }

  getDuration(): number {
    return -1; // Permanent
  }

  getDescription(): string {
    return '+5 armor, +10% crit chance';
  }
}
