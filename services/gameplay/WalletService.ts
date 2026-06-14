import { Logger } from '../system/Logger';
import { UserSessionService } from '../auth/UserSessionService';
import { railwayClient } from '../api/RailwayClient';

export interface WalletTransaction {
  id: string;
  amount: number;
  balanceAfter: number;
  type: string;
  referenceId?: string;
  currency: string;
  createdAt: string;
}

type EconomyWalletResponse = {
  wallet: {
    balance: number;
  };
};

export class WalletService {
  private static instance: WalletService | null = null;

  private constructor() {}

  static getInstance(): WalletService {
    WalletService.instance ??= new WalletService();
    return WalletService.instance;
  }

  /**
   * Get current confirmed gold balance via Railway API.
   */
  async getBalance(): Promise<number> {
    const profileId = UserSessionService.getProfileId();
    if (profileId.startsWith('anon_')) return 0;

    try {
      const data = await railwayClient.get<EconomyWalletResponse>(
        '/api/v1/economy/wallet'
      );
      return data.wallet.balance;
    } catch (err) {
      Logger.warn('[WalletService] Failed to fetch balance', err);
      return 0;
    }
  }

  /**
   * Fetch transaction history from Railway API.
   * Note: Ledger history endpoint not yet implemented on server.
   * Returns empty array until server endpoint is available.
   */
  async getHistory(_limit = 20): Promise<WalletTransaction[]> {
    const profileId = UserSessionService.getProfileId();
    if (profileId.startsWith('anon_')) return [];

    // TODO: Add GET /api/v1/wallet/history endpoint to Railway server
    return [];
  }
}
