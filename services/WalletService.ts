import { supabase, isSupabaseConfigured } from './Supabase';
import { Logger } from './Logger';
import { UserSessionService } from './auth/UserSessionService';

/**
 * DB types matching coin_transactions table schema
 */
interface DBTransaction {
  id: string;
  amount: number;
  balance_after: number;
  type: string; // Column is 'type' in coin_transactions, not 'transaction_type'
  reference_id: string | null;
  reference_type: string | null;
  description: string | null;
  created_at: string;
}

export interface WalletTransaction {
  id: string;
  amount: number;
  balanceAfter: number;
  type: string;
  referenceId?: string;
  referenceType?: string;
  description?: string;
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
   * Uses players.gold_balance as the source of truth (set by migration 013).
   */
  async getBalance(): Promise<number> {
    const playerId = UserSessionService.getPlayerId();
    if (playerId.startsWith('anon-')) return 0;

    if (!isSupabaseConfigured() || supabase === null) return 0;

    const { data, error } = await supabase
      .from('players')
      .select('gold_balance')
      .eq('id', playerId)
      .single();

    if (error) {
      Logger.warn('[WalletService] Failed to fetch balance', error);
      return 0;
    }

    return data.gold_balance ?? 0;
  }

  /**
   * Fetch transaction history for audit/UI.
   * Queries coin_transactions table (audit trail).
   */
  async getHistory(limit = 20): Promise<WalletTransaction[]> {
    const playerId = UserSessionService.getPlayerId();
    if (playerId.startsWith('anon-')) return [];

    if (!isSupabaseConfigured() || supabase === null) return [];

    // Query coin_transactions table for transaction history
    const { data, error } = await supabase
      .from('coin_transactions')
      .select(
        'id, amount, balance_after, type, reference_id, reference_type, description, created_at'
      )
      .eq('player_id', playerId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      Logger.error('[WalletService] Failed to fetch history', error);
      return [];
    }

    return (data as DBTransaction[]).map(tx => ({
      id: tx.id,
      amount: tx.amount,
      balanceAfter: tx.balance_after,
      type: tx.type,
      referenceId: tx.reference_id ?? undefined,
      referenceType: tx.reference_type ?? undefined,
      description: tx.description ?? undefined,
      createdAt: tx.created_at,
    }));
  }
}
