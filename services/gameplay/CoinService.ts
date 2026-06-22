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
  private pendingVerifications: Map<string, number> = new Map();

  constructor() {
    EventBus.on('gameReset', () => {
      this.resetSession();
    });
  }

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
   * Credit coins to user.
   *
   * When `VITE_VERIFY_COINS_ONLY=true`, rewards are queued for
   * server-side verification instead of being credited immediately.
   * Call {@link processVerificationResponse} once the server responds.
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

    const verifyOnly = import.meta.env.VITE_VERIFY_COINS_ONLY === 'true';

    if (verifyOnly) {
      const sessionId =
        (metadata?.['sessionId'] as string | undefined) ?? crypto.randomUUID();
      this.pendingVerifications.set(sessionId, amount);

      EventBus.emit('verification:queued', { sessionId, amount, source });

      Logger.debug(
        `[CoinService] Queued ${amount} coins (session ${sessionId}) for verification. Pending: ${this.pendingVerifications.size}`
      );

      // Return true so callers treat the queued reward as accepted
      return true;
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
   * Credit a reward that has already been approved by the authoritative server.
   * This bypasses the client verification queue to avoid re-queuing verified payouts.
   */
  async creditVerifiedCoins(
    amount: number,
    source: CoinSource,
    metadata?: Record<string, unknown>
  ): Promise<boolean> {
    if (!Number.isFinite(amount) || amount <= 0) {
      Logger.warn(`[CoinService] Invalid verified coin amount: ${amount}`);
      return false;
    }

    const success = await this.provider.credit(amount, source, {
      ...metadata,
      serverVerified: true,
    });

    if (success) {
      this.sessionCoins += amount;
      EventBus.emit('xpGained', { amount });
      EventBus.emit('verification:success', {
        sessionId: metadata?.['sessionId'],
        verifiedAmount: amount,
        source,
        metaShare: metadata?.['metaShare'],
        serverVerified: true,
      });

      Logger.debug(
        `[CoinService] Credited ${amount} verified coins. Session total: ${this.sessionCoins}`
      );
    }

    return success;
  }

  /**
   * Process a verification response from the server.
   * Credits the server-approved amount when verified, or discards the pending reward.
   */
  async processVerificationResponse(
    sessionId: string,
    response: { verified: boolean; reward: number; metaShare: number }
  ): Promise<void> {
    const pending = this.pendingVerifications.get(sessionId);
    this.pendingVerifications.delete(sessionId);

    if (response.verified) {
      const success = await this.provider.credit(response.reward, 'cycle_complete', {
        sessionId,
        metaShare: response.metaShare,
        serverVerified: true,
      });

      if (success) {
        this.sessionCoins += response.reward;
        EventBus.emit('xpGained', { amount: response.reward });
      }

      EventBus.emit('verification:success', {
        sessionId,
        requestedAmount: pending ?? 0,
        verifiedAmount: response.reward,
        metaShare: response.metaShare,
      });

      Logger.info(
        `[CoinService] Verification succeeded for session ${sessionId}: credited ${response.reward} (requested ${pending ?? 0})`
      );
    } else {
      EventBus.emit('verification:failed', {
        sessionId,
        requestedAmount: pending ?? 0,
      });

      Logger.warn(
        `[CoinService] Verification failed for session ${sessionId}. Discarded ${pending ?? 0} pending coins.`
      );
    }
  }

  /**
   * Number of rewards awaiting server verification.
   */
  getPendingVerifications(): number {
    return this.pendingVerifications.size;
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
    this.pendingVerifications.clear();
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
