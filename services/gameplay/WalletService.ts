import { supabase, isSupabaseConfigured } from '../core/Supabase';
import { Logger } from '../system/Logger';
import { UserSessionService } from '../auth/UserSessionService';

/**
 * DB types matching ledger table schema
 */
interface DBLedgerRow {
  id: string;
  amount: number;
  balance_after: number;
  transaction_type: string;
  reference_id: string | null;
  currency: string;
  created_at: string;
}

export interface WalletTransaction {
  id: string;
  amount: number;
  balanceAfter: number;
  type: string;
  referenceId?: string;
  currency: string;
  createdAt: string;
}

export class WalletService {
  private static instance: WalletService | null = null;

  private constructor() {}

  static getInstance(): WalletService {
    WalletService.instance ??= new WalletService();
    return WalletService.instance;
  }

  /**
   * Get current confirmed gold balance.
   * Uses virtual_accounts.gold_balance as the source of truth.
   */
  async getBalance(): Promise<number> {
    const profileId = UserSessionService.getProfileId();
    if (profileId.startsWith('anon-')) return 0;

    if (!isSupabaseConfigured() || supabase === null) return 0;

    const { data, error } = await supabase
      .from('virtual_accounts')
      .select('gold_balance')
      .eq('profile_id', profileId)
      .single();

    if (error) {
      Logger.warn('[WalletService] Failed to fetch balance', error);
      return 0;
    }

    return data.gold_balance ?? 0;
  }

  /**
   * Fetch transaction history from ledger.
   */
  async getHistory(limit = 20): Promise<WalletTransaction[]> {
    const profileId = UserSessionService.getProfileId();
    if (profileId.startsWith('anon-')) return [];

    if (!isSupabaseConfigured() || supabase === null) return [];

    // Query ledger table for transaction history
    const { data, error } = await supabase
      .from('ledger')
      .select(
        'id, amount, balance_after, transaction_type, reference_id, currency, created_at'
      )
      .eq('profile_id', profileId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      Logger.error('[WalletService] Failed to fetch history', error);
      return [];
    }

    return (data as DBLedgerRow[]).map(entry => ({
      id: entry.id,
      amount: entry.amount,
      balanceAfter: entry.balance_after,
      type: entry.transaction_type,
      referenceId: entry.reference_id ?? undefined,
      currency: entry.currency,
      createdAt: entry.created_at,
    }));
  }
}
