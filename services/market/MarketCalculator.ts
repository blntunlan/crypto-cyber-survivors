/**
 * MarketCalculator - Pure calculation logic for market data processing.
 *
 * This service extracts calculation logic from useMarketData hook,
 * making it testable and reusable without React dependencies.
 *
 * Responsibilities:
 * - PnL calculation (raw and effective)
 * - Liquidation price calculation
 * - ATR (Average True Range) calculation
 *
 * Design: All methods are pure functions with no side effects.
 */

import { MarketPosition, type LeverageOption } from '../../types';

export interface ATRContext {
  trHistory: number[];
  prevClose: number | null;
}

export interface ATRInput {
  high?: number;
  low?: number;
  close: number;
}

export interface ATRResult {
  atr: number;
  atrPercent: number;
  newTrHistory: number[];
  newPrevClose: number;
}

export interface PnLInput {
  currentPrice: number;
  entryPrice: number;
  position: MarketPosition;
  leverage: LeverageOption;
}

export interface PnLResult {
  rawPnl: number;
  effectivePnl: number;
  difficultyPnl: number; // Capped leverage for difficulty calculation
}

export interface LiquidationInput {
  entryPrice: number;
  leverage: LeverageOption;
  position: MarketPosition;
}

export class MarketCalculator {
  private static readonly ATR_PERIOD = 14;
  private static readonly DIFFICULTY_LEVERAGE_CAP = 2.0;

  /**
   * Calculate PnL (Profit and Loss) for a position.
   *
   * @param input - Price and position information
   * @returns Raw PnL, effective PnL (with leverage), and difficulty-adjusted PnL
   */
  public static calculatePnL(input: PnLInput): PnLResult {
    const { currentPrice, entryPrice, position, leverage } = input;

    // Guard against invalid entry price
    if (entryPrice <= 0 || currentPrice <= 0) {
      return { rawPnl: 0, effectivePnl: 0, difficultyPnl: 0 };
    }

    // Calculate raw PnL percentage
    let rawPnl = (currentPrice - entryPrice) / entryPrice;

    // Invert for SHORT positions
    if (position === MarketPosition.SHORT) {
      rawPnl = -rawPnl;
    }

    // Calculate effective PnL with full leverage
    // Floor at -1 (liquidation threshold) but no upper cap — profits are uncapped
    const effectivePnl = Math.max(-1, rawPnl * leverage);

    // Calculate difficulty PnL with capped leverage (prevents extreme difficulty spikes)
    const difficultyLeverage = Math.min(leverage, this.DIFFICULTY_LEVERAGE_CAP);
    const difficultyPnl = rawPnl * difficultyLeverage;

    return { rawPnl, effectivePnl, difficultyPnl };
  }

  /**
   * Calculate liquidation price for a leveraged position.
   *
   * @param input - Entry price, leverage, and position direction
   * @returns The price at which the position would be liquidated
   */
  public static calculateLiquidationPrice(input: LiquidationInput): number {
    const { entryPrice, leverage, position } = input;

    // Guard against invalid inputs
    if (entryPrice <= 0 || leverage <= 0) {
      return 0;
    }

    if (position === MarketPosition.LONG) {
      // LONG liquidation: price drops by (1 / leverage)
      return entryPrice * (1 - 1 / leverage);
    } else {
      // SHORT liquidation: price rises by (1 / leverage)
      return entryPrice * (1 + 1 / leverage);
    }
  }

  /**
   * Calculate ATR (Average True Range) from OHLC data.
   * ATR is a measure of market volatility.
   *
   * @param input - High, low, close prices
   * @param context - Previous TR history and close price
   * @returns Updated ATR value and context for next calculation
   */
  public static calculateATR(input: ATRInput, context: ATRContext): ATRResult {
    const { high, low, close } = input;
    const { trHistory, prevClose } = context;

    // Skip unchanged prices to prevent TR=0 from diluting moving averages excessively
    // during high-frequency identical price updates
    if (
      prevClose !== null &&
      close === prevClose &&
      high === undefined &&
      low === undefined
    ) {
      const atr =
        trHistory.length > 0
          ? trHistory.reduce((a, b) => a + b, 0) / trHistory.length
          : 0;
      const atrPercent = close > 0 ? atr / close : 0;

      return {
        atr,
        atrPercent,
        newTrHistory: trHistory,
        newPrevClose: close,
      };
    }

    // Calculate True Range if we have OHLC data
    let currentTR: number | null = null;
    if (high !== undefined && low !== undefined) {
      const h_l = high - low;
      const h_pc = prevClose !== null ? Math.abs(high - prevClose) : 0;
      const l_pc = prevClose !== null ? Math.abs(low - prevClose) : 0;
      currentTR = Math.max(h_l, h_pc, l_pc);
    }

    // Update TR history (immutable) - only if we have a new valid TR
    let newTrHistory = [...trHistory];
    if (currentTR !== null) {
      newTrHistory.push(currentTR);
      if (newTrHistory.length > this.ATR_PERIOD) {
        newTrHistory = newTrHistory.slice(-this.ATR_PERIOD);
      }
    }

    // Calculate ATR as simple moving average of TR
    const atr =
      newTrHistory.length > 0
        ? newTrHistory.reduce((a, b) => a + b, 0) / newTrHistory.length
        : 0;

    // Calculate ATR as percentage of price
    const atrPercent = close > 0 ? atr / close : 0;

    return {
      atr,
      atrPercent,
      newTrHistory,
      newPrevClose: close,
    };
  }

  /**
   * Check if player should be liquidated based on current price.
   *
   * @param currentPrice - Current market price
   * @param liquidationPrice - Pre-calculated liquidation price
   * @param position - LONG or SHORT
   * @returns True if position is liquidated
   */
  public static isLiquidated(
    currentPrice: number,
    liquidationPrice: number,
    position: MarketPosition
  ): boolean {
    if (liquidationPrice <= 0 || currentPrice <= 0) {
      return false;
    }

    if (position === MarketPosition.LONG) {
      return currentPrice <= liquidationPrice;
    } else {
      return currentPrice >= liquidationPrice;
    }
  }
}
