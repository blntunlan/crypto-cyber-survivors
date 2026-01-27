/**
 * SupabaseCoinProvider - Persistent reward backend
 *
 * Implements ICoinProvider to bridge CoinService with Supabase database.
 * Uses direct balance fetching and RPC calls for atomic updates.
 */

import { type ICoinProvider, type CoinSource } from './CoinService';
import { supabase, isSupabaseConfigured } from '../core/Supabase';
import { Logger } from '../system/Logger';
import { UserSessionService } from '../auth/UserSessionService';

export class SupabaseCoinProvider implements ICoinProvider {
  readonly id = 'supabase';
  readonly isRealCurrency = false; // "Gold" is in-game virtual currency

  /**
   * Get current confirmed gold balance from virtual_accounts table
   */
  async getBalance(): Promise<number> {
    const profileId = UserSessionService.getProfileId();
    if (!profileId || profileId.startsWith('anon_')) return 0;

    if (!isSupabaseConfigured() || supabase === null) return 0;

    const { data, error } = await supabase
      .from('virtual_accounts')
      .select('gold_balance')
      .eq('profile_id', profileId)
      .single();

    if (error) {
      Logger.warn('[SupabaseCoinProvider] Failed to fetch balance', error);
      return 0;
    }

    return data.gold_balance ?? 0;
  }

  /**
   * Credit coins and log to ledger using atomic RPC
   */
  async credit(
    amount: number,
    source: CoinSource,
    metadata?: Record<string, unknown>
  ): Promise<boolean> {
    const profileId = UserSessionService.getProfileId();
    if (!profileId || profileId.startsWith('anon_')) {
      Logger.warn('[SupabaseCoinProvider] Cannot credit: anonymous user');
      return false;
    }

    if (!isSupabaseConfigured() || supabase === null) return false;

    try {
      const { data, error } = await supabase.rpc('credit_coins', {
        p_profile_id: profileId,
        p_amount: Math.floor(amount),
        p_transaction_type: source,
        p_reference_id: (metadata?.referenceId as string | undefined) ?? undefined,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        p_metadata: (metadata ?? {}) as any,
      });

      if (error) throw error;

      const result = data as { success: boolean; new_balance?: number; error?: string };

      if (result.success) {
        Logger.info(
          `[SupabaseCoinProvider] Credited ${amount} coins. New balance: ${result.new_balance}`
        );
        return true;
      } else {
        Logger.error('[SupabaseCoinProvider] RPC failed:', result.error);
        return false;
      }
    } catch (err) {
      Logger.error('[SupabaseCoinProvider] Failed to credit coins:', err);
      return false;
    }
  }
}
