/**
 * CoinService - Coin Reward System
 *
 * Calculates coin rewards based on game performance.
 * Designed for easy future integration with blockchain/crypto rewards.
 *
 * Architecture:
 * - ICoinProvider: Interface for different coin backends (mock, blockchain, etc.)
 * - CoinCalculator: Pure calculation logic
 * - CoinService: Main service orchestrating calculations and providers
 */

import { EventBus } from '../core/EventBus';
import { Logger } from '../system/Logger';

// =============================================================================
// INTERFACES - For Future Crypto Integration
// =============================================================================

/**
 * Coin earning event data
 */
export interface CoinEarnedEvent {
  amount: number;
  source: CoinSource;
  timestamp: number;
}

/**
 * Sources of coin earnings
 */
export type CoinSource =
  | 'cycle_complete'
  | 'kill_bonus'
  | 'level_bonus'
  | 'market_bonus'
  | 'streak_bonus'
  | 'achievement';

/**
 * Interface for coin providers (mock, blockchain, etc.)
 * Future crypto integration will implement this interface
 */
export interface ICoinProvider {
  /** Provider identifier */
  readonly id: string;

  /** Whether this provider connects to real blockchain */
  readonly isRealCurrency: boolean;

  /** Get current balance */
  getBalance(): Promise<number>;

  /** Credit coins to user */
  credit(
    amount: number,
    source: CoinSource,
    metadata?: Record<string, unknown>
  ): Promise<boolean>;

  /** Verify transaction (for blockchain providers) */
  verifyTransaction?(txId: string): Promise<boolean>;
}

/**
 * Coin calculation result
 */
export interface CoinCalculation {
  base: number;
  killBonus: number;
  levelBonus: number;
  marketBonus: number;
  streakBonus: number;
  total: number;
  breakdown: Record<string, number>;
}

// =============================================================================
// COIN CALCULATOR - Pure Calculation Logic
// =============================================================================

/**
 * Rate configuration for coin calculations
 * Can be adjusted for balancing or modified by promotions
 */
export interface CoinRates {
  /** Coins per second survived */
  perSecond: number;
  /** Coins per kill */
  perKill: number;
  /** Coins per level */
  perLevel: number;
  /** Bonus multiplier for positive PnL (0-1 = pnl%) */
  pnlMultiplier: number;
  /** Bonus per streak milestone (per 10 kills) */
  streakMilestoneBonus: number;
  /** Maximum streak bonus */
  maxStreakBonus: number;
}

const DEFAULT_RATES: CoinRates = {
  perSecond: 2,
  perKill: 5,
  perLevel: 50,
  pnlMultiplier: 100, // 1% pnl = 1 coin
  streakMilestoneBonus: 25,
  maxStreakBonus: 250,
};

/**
 * Pure coin calculation logic
 */
export class CoinCalculator {
  constructor(private rates: CoinRates = DEFAULT_RATES) {}

  /**
   * Calculate coins earned for a cycle
   */
  calculate(params: {
    survivalTimeSeconds: number;
    kills: number;
    level: number;
    pnl: number; // Decimal, e.g., 0.05 = 5%
    maxStreak: number;
  }): CoinCalculation {
    const { survivalTimeSeconds, kills, level, pnl, maxStreak } = params;

    // Base: survival time
    const base = Math.floor(survivalTimeSeconds * this.rates.perSecond);

    // Kill bonus
    const killBonus = kills * this.rates.perKill;

    // Level bonus
    const levelBonus = level * this.rates.perLevel;

    // Market bonus (only for positive PnL)
    const marketBonus = pnl > 0 ? Math.floor(pnl * 100 * this.rates.pnlMultiplier) : 0;

    // Streak bonus (per 10-kill milestone)
    const streakMilestones = Math.floor(maxStreak / 10);
    const streakBonus = Math.min(
      streakMilestones * this.rates.streakMilestoneBonus,
      this.rates.maxStreakBonus
    );

    const total = base + killBonus + levelBonus + marketBonus + streakBonus;

    return {
      base,
      killBonus,
      levelBonus,
      marketBonus,
      streakBonus,
      total,
      breakdown: {
        'Survival Time': base,
        Kills: killBonus,
        'Level Bonus': levelBonus,
        'Market Profit': marketBonus,
        'Kill Streak': streakBonus,
      },
    };
  }

  /**
   * Update rates (for promotions, events, etc.)
   */
  setRates(rates: Partial<CoinRates>): void {
    this.rates = { ...this.rates, ...rates };
  }
}

// =============================================================================
// MOCK COIN PROVIDER - Development/Testing
// =============================================================================

/**
 * Mock coin provider for development and testing
 * Stores balance in memory (resets on refresh)
 */
export class MockCoinProvider implements ICoinProvider {
  readonly id = 'mock';
  readonly isRealCurrency = false;

  private balance: number = 0;
  private transactions: Array<{
    amount: number;
    source: CoinSource;
    timestamp: number;
    metadata?: Record<string, unknown>;
  }> = [];

  async getBalance(): Promise<number> {
    return this.balance;
  }

  async credit(
    amount: number,
    source: CoinSource,
    metadata?: Record<string, unknown>
  ): Promise<boolean> {
    this.balance += amount;
    this.transactions.push({
      amount,
      source,
      timestamp: Date.now(),
      metadata,
    });

    Logger.info(
      `[MockCoinProvider] Credited ${amount} coins from ${source}. Balance: ${this.balance}`
    );
    return true;
  }

  getTransactions() {
    return [...this.transactions];
  }

  reset(): void {
    this.balance = 0;
    this.transactions = [];
  }
}

// =============================================================================
// COIN SERVICE - Main Orchestrator
// =============================================================================

/**
 * CoinService - Main service for coin operations
 *
 * Usage:
 *   CoinService.setProvider(new SolanaCoinProvider(wallet));
 *   const coins = CoinService.calculateCycleReward(gameData);
 *   await CoinService.creditCoins(coins, 'cycle_complete');
 */
class CoinServiceClass {
  private provider: ICoinProvider = new MockCoinProvider();
  private calculator = new CoinCalculator();
  private sessionCoins: number = 0;

  /**
   * Set the coin provider (mock, blockchain, etc.)
   * Call this early with the appropriate provider for your environment
   */
  setProvider(provider: ICoinProvider): void {
    Logger.info(
      `[CoinService] Provider set: ${provider.id} (real: ${provider.isRealCurrency})`
    );
    this.provider = provider;
  }

  /**
   * Get current provider info
   */
  getProviderInfo(): { id: string; isRealCurrency: boolean } {
    return {
      id: this.provider.id,
      isRealCurrency: this.provider.isRealCurrency,
    };
  }

  /**
   * Calculate cycle completion reward
   */
  calculateCycleReward(params: {
    survivalTimeSeconds: number;
    kills: number;
    level: number;
    pnl: number;
    maxStreak: number;
  }): CoinCalculation {
    return this.calculator.calculate(params);
  }

  /**
   * Credit coins to user
   */
  async creditCoins(
    amount: number,
    source: CoinSource,
    metadata?: Record<string, unknown>
  ): Promise<boolean> {
    const success = await this.provider.credit(amount, source, metadata);

    if (success) {
      this.sessionCoins += amount;

      // Emit event for UI updates
      EventBus.emit('xpGained', { amount }); // Reusing xpGained for coin animation

      Logger.debug(
        `[CoinService] Credited ${amount} coins. Session total: ${this.sessionCoins}`
      );
    }

    return success;
  }

  /**
   * Get user balance
   */
  async getBalance(): Promise<number> {
    return this.provider.getBalance();
  }

  /**
   * Get coins earned this session
   */
  getSessionCoins(): number {
    return this.sessionCoins;
  }

  /**
   * Reset session tracking (called on game start)
   */
  resetSession(): void {
    this.sessionCoins = 0;
  }

  /**
   * Update coin rates (for promotions)
   */
  setRates(rates: Partial<CoinRates>): void {
    this.calculator.setRates(rates);
  }
}

// Singleton export
export const CoinService = new CoinServiceClass();
