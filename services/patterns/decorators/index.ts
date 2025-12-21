/**
 * Decorator Pattern Exports
 *
 * Public API for the Buff/Debuff system.
 */

// Core
export { type IPlayerStats } from './IPlayerStats';
export { PlayerStatsAdapter } from './PlayerStatsAdapter';
export { StatDecorator, type DecoratorConstructor } from './BaseDecorator';
export { BuffManager } from './BuffManager';

// Buffs
export {
  RageModeDecorator,
  DiamondHandsDecorator,
  BerserkDecorator,
  LuckBoostDecorator,
} from './buffs';

// Debuffs
export {
  SlowDecorator,
  VulnerableDecorator,
  LiquidatedDecorator,
  WeakenedDecorator,
} from './debuffs';
