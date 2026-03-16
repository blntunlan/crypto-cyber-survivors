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
import {
  RewardCalculator,
  type CoinRates,
  type RewardCalculationResult as CoinCalculation,
} from './RewardCalculator';

// =============================================================================
// INTERFACES - For Future Crypto Integration
// =============================================================================

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

export type { CoinCalculation, CoinRates };

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
  private calculator = new RewardCalculator();
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
    if (!Number.isFinite(amount) || amount <= 0) {
      Logger.warn(`[CoinService] Invalid coin amount: ${amount}`);
      return false;
    }

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
