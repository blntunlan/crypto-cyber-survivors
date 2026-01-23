/**
 * CloudflareService - Client-side integration with Cloudflare Workers
 *
 * This service provides methods to interact with the Cloudflare Workers
 * deployed for the anti-cheat system:
 * - Price Oracle: Fetches and verifies cryptocurrency prices
 * - Session Validator: Validates game sessions server-side
 *
 * @module services/CloudflareService
 */

import { Logger } from './Logger';

/** Price data from the oracle */
export interface PriceData {
  pair: string;
  price: number;
  timestamp: number;
}

/** Price verification result */
export interface PriceVerificationResult {
  valid: boolean;
  actualPrices?: number[];
  reason?: string;
}

/** Session start response */
export interface SessionStartResponse {
  sessionId: string;
  startTime: number;
}

/** Session data for validation */
export interface SessionData {
  sessionId: string;
  playerId: string;
  cryptoPair: string;
  position: 'LONG' | 'SHORT';
  leverage: number;
  entryPrice: number;
  exitPrice: number;
  startTime: number;
  endTime: number;
  pnlPercent: number;
  level: number;
  kills: number;
  survivalTime: number;
  replayHash?: string;
}

/** Session validation result */
export interface SessionValidationResult {
  valid: boolean;
  sessionId?: string;
  reason?: string;
  details?: Record<string, unknown>;
}

/**
 * CloudflareService - Singleton service for Cloudflare Worker integration
 */
class CloudflareServiceClass {
  private enabled: boolean = false;
  private currentSessionId: string | null = null;
  private sessionStartTime: number = 0;

  private workerUrls = {
    PRICE_ORACLE:
      (import.meta.env.VITE_CF_PRICE_ORACLE_URL as string | undefined) ?? '',
    SESSION_VALIDATOR:
      (import.meta.env.VITE_CF_SESSION_VALIDATOR_URL as string | undefined) ?? '',
  };

  constructor() {
    this.enabled = !!(
      this.workerUrls.PRICE_ORACLE && this.workerUrls.SESSION_VALIDATOR
    );
    if (!this.enabled) {
      Logger.warn(
        '[CloudflareService] Workers not configured. Set VITE_CF_PRICE_ORACLE_URL and VITE_CF_SESSION_VALIDATOR_URL'
      );
    }
  }

  /**
   * Check if Cloudflare integration is enabled
   */
  isEnabled(): boolean {
    return this.enabled;
  }

  // ============================================================
  // PRICE ORACLE
  // ============================================================

  /**
   * Fetch the latest prices from the price oracle
   */
  async getLatestPrices(): Promise<PriceData[]> {
    if (!this.enabled) return [];

    try {
      const response = await fetch(`${this.workerUrls.PRICE_ORACLE}/prices`);
      if (!response.ok) {
        throw new Error(`Price oracle error: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      Logger.error('[CloudflareService] Failed to fetch prices:', error);
      return [];
    }
  }

  /**
   * Verify a price against the oracle's historical data
   *
   * @param pair - Trading pair (e.g., 'BTCUSDT')
   * @param price - The price to verify
   * @param timestamp - The timestamp when the price was recorded
   * @param tolerance - Price tolerance (default 0.5%)
   */
  async verifyPrice(
    pair: string,
    price: number,
    timestamp: number,
    tolerance: number = 0.005
  ): Promise<PriceVerificationResult> {
    if (!this.enabled) {
      return { valid: true, reason: 'DISABLED' };
    }

    try {
      const url = new URL(`${this.workerUrls.PRICE_ORACLE}/verify`);
      url.searchParams.set('pair', pair);
      url.searchParams.set('price', String(price));
      url.searchParams.set('timestamp', String(timestamp));
      url.searchParams.set('tolerance', String(tolerance));

      const response = await fetch(url.toString());
      return await response.json();
    } catch (error) {
      Logger.error('[CloudflareService] Price verification failed:', error);
      return { valid: true, reason: 'ERROR' }; // Fail open to not block gameplay
    }
  }

  /**
   * Trigger a manual price fetch (useful for testing)
   */
  async triggerPriceFetch(): Promise<boolean> {
    if (!this.enabled) return false;

    try {
      const response = await fetch(`${this.workerUrls.PRICE_ORACLE}/fetch`);
      const result = await response.json();
      return result.success === true;
    } catch (error) {
      Logger.error('[CloudflareService] Manual price fetch failed:', error);
      return false;
    }
  }

  // ============================================================
  // SESSION VALIDATION
  // ============================================================

  /**
   * Start a new game session on the server
   *
   * @param playerId - The player's ID
   * @param cryptoPair - The trading pair being played
   */
  async startSession(
    playerId: string,
    cryptoPair: string
  ): Promise<SessionStartResponse | null> {
    if (!this.enabled) {
      // Generate local session ID if Cloudflare is disabled
      this.currentSessionId = `local_${Date.now()}_${Math.random().toString(36).slice(2)}`;
      this.sessionStartTime = Date.now();
      return { sessionId: this.currentSessionId, startTime: this.sessionStartTime };
    }

    try {
      const response = await fetch(`${this.workerUrls.SESSION_VALIDATOR}/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ playerId, cryptoPair }),
      });

      if (!response.ok) {
        throw new Error(`Session start failed: ${response.status}`);
      }

      const result: SessionStartResponse = await response.json();
      this.currentSessionId = result.sessionId;
      this.sessionStartTime = result.startTime;

      Logger.info('[CloudflareService] Session started:', result.sessionId);
      return result;
    } catch (error) {
      Logger.error('[CloudflareService] Failed to start session:', error);
      // Fallback to local session
      this.currentSessionId = `fallback_${Date.now()}`;
      this.sessionStartTime = Date.now();
      return { sessionId: this.currentSessionId, startTime: this.sessionStartTime };
    }
  }

  /**
   * End and validate a game session
   *
   * @param sessionData - The complete session data to validate
   */
  async endSession(
    sessionData: Omit<SessionData, 'sessionId' | 'startTime'>
  ): Promise<SessionValidationResult> {
    if (!this.currentSessionId) {
      return { valid: false, reason: 'NO_ACTIVE_SESSION' };
    }

    const fullSessionData: SessionData = {
      ...sessionData,
      sessionId: this.currentSessionId,
      startTime: this.sessionStartTime,
    };

    if (!this.enabled) {
      // Local validation only
      Logger.info('[CloudflareService] Local session ended (Cloudflare disabled)');
      this.currentSessionId = null;
      return { valid: true, sessionId: fullSessionData.sessionId, reason: 'LOCAL' };
    }

    try {
      const response = await fetch(`${this.workerUrls.SESSION_VALIDATOR}/end`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(fullSessionData),
      });

      const result: SessionValidationResult = await response.json();

      if (result.valid) {
        Logger.info('[CloudflareService] Session validated:', result.sessionId);
      } else {
        Logger.warn('[CloudflareService] Session validation failed:', result.reason);
      }

      this.currentSessionId = null;
      return result;
    } catch (error) {
      Logger.error('[CloudflareService] Session end failed:', error);
      this.currentSessionId = null;
      return {
        valid: true,
        sessionId: fullSessionData.sessionId,
        reason: 'ERROR_FALLBACK',
      };
    }
  }

  /**
   * Get the current session ID
   */
  getCurrentSessionId(): string | null {
    return this.currentSessionId;
  }

  /**
   * Get session status from the server
   */
  async getSessionStatus(sessionId: string): Promise<Record<string, unknown> | null> {
    if (!this.enabled) return null;

    try {
      const response = await fetch(
        `${this.workerUrls.SESSION_VALIDATOR}/status?sessionId=${sessionId}`
      );
      return await response.json();
    } catch (error) {
      Logger.error('[CloudflareService] Failed to get session status:', error);
      return null;
    }
  }

  /**
   * Reset the service (for new game)
   */
  reset(): void {
    this.currentSessionId = null;
    this.sessionStartTime = 0;
  }
}

/** Singleton instance */
export const CloudflareService = new CloudflareServiceClass();
