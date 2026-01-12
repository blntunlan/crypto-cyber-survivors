import { supabase, isSupabaseConfigured } from './Supabase';
import { Logger } from './Logger';
import { UserSessionService } from './auth/UserSessionService';

interface DBTransaction {
  id: string;
  amount: number;
  balance_after: number;
  transaction_type: string;
  reference_id: string;
  created_at: string;
}

export interface WalletTransaction {
  id: string;
  amount: number;
  balanceAfter: number;
  type: string;
  referenceId?: string;
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
   * Get current confirmed gold balance
   */
  async getBalance(): Promise<number> {
    const playerId = UserSessionService.getPlayerId();
    if (playerId.startsWith('anon-')) return 0;

    if (!isSupabaseConfigured() || supabase === null) return 0;

    // Check local balance first if user is anon (though logic says anon = 0)
    // Actually anon- users don't have DB wallets usually.

    const { data, error } = await supabase
      .from('players')
      .select('gold_balance')
      .eq('id', playerId)
      .single();

    if (error) {
      // Could be network error or player not found
      Logger.warn('[WalletService] Failed to fetch balance', error);
      return 0;
    }

    return data.gold_balance;
  }

  /**
   * Fetch transaction history for audit/UI
   */
  async getHistory(limit = 20): Promise<WalletTransaction[]> {
    const playerId = UserSessionService.getPlayerId();
    if (playerId.startsWith('anon-')) return [];

    if (!isSupabaseConfigured() || supabase === null) return [];

    const { data, error } = await supabase
      .from('player_wallets')
      .select('*')
      .eq('player_id', playerId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      Logger.error('[WalletService] Failed to fetch history', error);
      return [];
    }

    return (data as unknown as DBTransaction[]).map(tx => ({
      id: tx.id,
      amount: tx.amount,
      balanceAfter: tx.balance_after,
      type: tx.transaction_type,
      referenceId: tx.reference_id,
      createdAt: tx.created_at,
    }));
  }
}
