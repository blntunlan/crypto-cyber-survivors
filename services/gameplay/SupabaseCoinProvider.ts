/**
 * SupabaseCoinProvider - Persistent reward backend
 *
 * Implements ICoinProvider to bridge CoinService with Railway API.
 * Now acts primarily as an optimistic UI updater for gameplay events.
 * Actual secure crediting happens via Railway verify endpoint.
 */

import { type ICoinProvider, type CoinSource } from './CoinService';
import { Logger } from '../system/Logger';
import { UserSessionService } from '../auth/UserSessionService';
import { railwayClient } from '../api/RailwayClient';

export class SupabaseCoinProvider implements ICoinProvider {
  readonly id = 'supabase';
  readonly isRealCurrency = false; // "Gold" is in-game virtual currency

  /**
   * Get current confirmed gold balance from Railway API
   */
  async getBalance(): Promise<number> {
    const profileId = UserSessionService.getProfileId();
    if (!profileId || profileId.startsWith('anon_')) return 0;

    try {
      const data = await railwayClient.get<{ balance: number }>(
        '/api/v1/wallet/balance'
      );
      return data.balance;
    } catch (error) {
      Logger.warn('[SupabaseCoinProvider] Failed to fetch balance', error);
      return 0;
    }
  }

  /**
   * Optimistically credit coins locally.
   * Actual DB updates are handled by Railway verify endpoint to prevent cheating.
   */
  async credit(
    amount: number,
    source: CoinSource,
    _metadata?: Record<string, unknown>
  ): Promise<boolean> {
    const profileId = UserSessionService.getProfileId();
    if (!profileId || profileId.startsWith('anon_')) {
      return false;
    }

    Logger.info(
      `[SupabaseCoinProvider] Optimistically allowing ${amount} coins from ${source}. CoinService will track session state.`
    );

    return true;
  }
}
