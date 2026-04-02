import { type LeverageInputSlice } from '../types';
import { MarketPosition } from '../../../types';

/**
 * LeverageStateProvider — owns leverage, position, and cycle-related inputs.
 *
 * Delegates to LeverageEngine for actual multiplier computation but owns
 * the input slice that DifficultyContext composes into DifficultyInputs.
 *
 * Fixes the leverage "triple-set" problem by being the single source of truth
 * for leverage-related state within the difficulty system.
 *
 * Hot-path safe: pre-allocated slice.
 */
class LeverageStateProviderClass {
  private static instance: LeverageStateProviderClass | null = null;

  /** Pre-allocated slice — mutated in-place */
  public readonly slice: LeverageInputSlice =
    LeverageStateProviderClass.getDefaultSlice();

  private constructor() {}

  static getInstance(): LeverageStateProviderClass {
    return (LeverageStateProviderClass.instance ??= new LeverageStateProviderClass());
  }

  /** Set leverage for this game session */
  setLeverage(leverage: number): void {
    this.slice.leverage = leverage;
  }

  /** Set position for this game session */
  setPosition(position: MarketPosition): void {
    this.slice.position = position;
  }

  /** Set entry price for this game session */
  setEntryPrice(entryPrice: number): void {
    this.slice.entryPrice = entryPrice;
  }

  /** Update cycle factor (compounding difficulty on continue) */
  setCycleFactor(factor: number): void {
    this.slice.cycleFactor = factor;
  }

  /** Update liquidation price */
  setLiquidationPrice(price: number): void {
    this.slice.liquidationPrice = price;
  }

  reset(): void {
    const defaults = LeverageStateProviderClass.getDefaultSlice();
    Object.assign(this.slice, defaults);
  }

  /** Reset only per-cycle state; preserve session-level leverage/position/entryPrice */
  resetCycleState(): void {
    this.slice.cycleFactor = 1.0;
  }

  private static getDefaultSlice(): LeverageInputSlice {
    return {
      leverage: 5,
      position: MarketPosition.LONG,
      entryPrice: 0,
      liquidationPrice: 0,
      cycleFactor: 1.0,
    };
  }

  static resetForTesting(): void {
    if (this.instance) {
      this.instance.reset();
      this.instance = null;
    }
  }
}

export const LeverageStateProvider = LeverageStateProviderClass.getInstance();
